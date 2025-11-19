import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Target, Calendar, Settings, Zap, AlertCircle } from 'lucide-react';

type EventPhaseConfig = {
  id: string;
  name: string;
  date: string;
  phase1_start_date: string;
  phase1_end_date: string;
  phase2_start_date: string;
  phase2_end_date: string;
  current_phase: number;
  phase1_max_bookings: number;
  phase2_max_bookings: number;
  phase_mode: string;
};

export default function EventPhaseManagement() {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [event, setEvent] = useState<EventPhaseConfig | null>(null);
  
  const [formData, setFormData] = useState({
    phase1_start: '',
    phase1_end: '',
    phase2_start: '',
    phase2_end: '',
    current_phase: 0,
    phase1_max_bookings: 3,
    phase2_max_bookings: 6,
    phase_mode: 'manual'
  });

  useEffect(() => {
    checkAdminAndLoadEvent();
  }, [eventId]);

  const checkAdminAndLoadEvent = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle(); // Use maybeSingle() to avoid 406 errors

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        navigate('/login');
        return;
      }

      if (!profile || profile.role !== 'admin') {
        navigate('/offers');
        return;
      }

      await loadEvent();
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadEvent = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (error) {
      console.error('Error loading event:', error);
      alert('Event not found');
      navigate('/admin/events');
      return;
    }

    setEvent(data);
    
    // Helper function to convert ISO timestamp to datetime-local format
    const toDateTimeLocal = (timestamp: string | null | undefined): string => {
      if (!timestamp) return '';
      try {
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return '';
        // Format as YYYY-MM-DDTHH:mm for datetime-local input
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      } catch {
        return '';
      }
    };
    
    setFormData({
      phase1_start: toDateTimeLocal(data.phase1_start_date),
      phase1_end: toDateTimeLocal(data.phase1_end_date),
      phase2_start: toDateTimeLocal(data.phase2_start_date),
      phase2_end: toDateTimeLocal(data.phase2_end_date),
      current_phase: data.current_phase || 0,
      phase1_max_bookings: data.phase1_max_bookings || 3,
      phase2_max_bookings: data.phase2_max_bookings || 6,
      phase_mode: data.phase_mode || 'manual'
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Validate dates if they are provided
      if (formData.phase1_start && formData.phase1_end) {
        if (new Date(formData.phase1_start) >= new Date(formData.phase1_end)) {
          alert('Phase 1 start must be before Phase 1 end');
          setSaving(false);
          return;
        }
      }

      if (formData.phase2_start && formData.phase2_end) {
        if (new Date(formData.phase2_start) >= new Date(formData.phase2_end)) {
          alert('Phase 2 start must be before Phase 2 end');
          setSaving(false);
          return;
        }
      }

      if (formData.phase2_max_bookings < formData.phase1_max_bookings) {
        alert('Phase 2 limit must be ≥ Phase 1 limit');
        setSaving(false);
        return;
      }

      // Helper function to convert datetime-local to ISO string or null
      const toTimestampOrNull = (value: string): string | null => {
        if (!value || value.trim() === '') return null;
        // Convert datetime-local format (YYYY-MM-DDTHH:mm) to ISO string
        const date = new Date(value);
        return isNaN(date.getTime()) ? null : date.toISOString();
      };

      const updateData: any = {
        current_phase: formData.current_phase,
        phase1_max_bookings: formData.phase1_max_bookings,
        phase2_max_bookings: formData.phase2_max_bookings,
        phase_mode: formData.phase_mode
      };

      // Only include date fields if they have values, otherwise set to null
      updateData.phase1_start_date = toTimestampOrNull(formData.phase1_start);
      updateData.phase1_end_date = toTimestampOrNull(formData.phase1_end);
      updateData.phase2_start_date = toTimestampOrNull(formData.phase2_start);
      updateData.phase2_end_date = toTimestampOrNull(formData.phase2_end);

      const { error } = await supabase
        .from('events')
        .update(updateData)
        .eq('id', eventId);

      if (error) throw error;

      alert('Phase configuration updated successfully!');
      await loadEvent();
    } catch (err: any) {
      console.error('Error saving:', err);
      alert('Error saving phase configuration: ' + (err.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const getPhaseStatus = () => {
    const now = new Date();
    
    // Only parse dates if they exist and are valid
    const phase1Start = formData.phase1_start ? new Date(formData.phase1_start) : null;
    const phase1End = formData.phase1_end ? new Date(formData.phase1_end) : null;
    const phase2Start = formData.phase2_start ? new Date(formData.phase2_start) : null;
    const phase2End = formData.phase2_end ? new Date(formData.phase2_end) : null;

    // Check if dates are valid
    const hasValidPhase1 = phase1Start && phase1End && !isNaN(phase1Start.getTime()) && !isNaN(phase1End.getTime());
    const hasValidPhase2 = phase2Start && phase2End && !isNaN(phase2Start.getTime()) && !isNaN(phase2End.getTime());

    if (!hasValidPhase1 && !hasValidPhase2) {
      return { status: 'not_configured', message: 'Phase dates not configured yet' };
    }

    if (hasValidPhase1 && now < phase1Start!) {
      return { status: 'upcoming', message: 'Booking has not started yet' };
    } else if (hasValidPhase1 && now >= phase1Start! && now < phase1End!) {
      return { status: 'phase1', message: 'Currently in Phase 1 (Priority Booking)' };
    } else if (hasValidPhase2 && now >= phase2Start! && now < phase2End!) {
      return { status: 'phase2', message: 'Currently in Phase 2 (Open Booking)' };
    } else if (hasValidPhase2 && now >= phase2End!) {
      return { status: 'ended', message: 'Booking period has ended' };
    } else {
      return { status: 'between', message: 'Between phases' };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive">Event not found</p>
          <Link to="/admin/events" className="mt-4 text-primary hover:text-primary/80">
            Back to Events
          </Link>
        </div>
      </div>
    );
  }

  const phaseStatus = getPhaseStatus();

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link to="/admin/events" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{event.name}</h1>
              <p className="text-sm text-muted-foreground mt-1">Phase Management</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Phase Mode Toggle */}
        <div className="bg-card rounded-xl border border-border p-6 mb-8 animate-fade-in">
          <div className="flex items-center gap-3 mb-4">
            <Settings className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Phase Management Mode</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setFormData({ ...formData, phase_mode: 'manual' })}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                formData.phase_mode === 'manual'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <Settings className={`w-5 h-5 ${formData.phase_mode === 'manual' ? 'text-primary' : 'text-muted-foreground'}`} />
                <h3 className="font-semibold text-foreground">Manual Control</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Manually control which phase is active using the phase selector below
              </p>
            </button>
            
            <button
              onClick={() => setFormData({ ...formData, phase_mode: 'date-based' })}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                formData.phase_mode === 'date-based'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <div className="flex items-center gap-3 mb-2">
                <Zap className={`w-5 h-5 ${formData.phase_mode === 'date-based' ? 'text-primary' : 'text-muted-foreground'}`} />
                <h3 className="font-semibold text-foreground">Automatic (Date-Based)</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Automatically transition phases based on configured dates
              </p>
            </button>
          </div>
          
          {formData.phase_mode === 'date-based' && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900 dark:text-blue-100">
                  <p className="font-medium mb-1">Automatic Phase Transition Active</p>
                  <p className="text-blue-700 dark:text-blue-300">
                    The system will automatically determine the current phase based on the date ranges configured below. The manual phase selector will be ignored.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Current Status */}
        <div className={`mb-8 p-6 rounded-lg border-2 animate-fade-in ${
          phaseStatus.status === 'phase1' ? 'bg-primary/5 border-primary/30' :
          phaseStatus.status === 'phase2' ? 'bg-success/5 border-success/30' :
          phaseStatus.status === 'upcoming' ? 'bg-warning/5 border-warning/30' :
          'bg-muted border-border'
        }`}>
          <div className="flex items-center gap-3 mb-2">
            <Target className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">
              {formData.phase_mode === 'date-based' ? 'Auto-Detected Phase Status' : 'Current Phase Status'}
            </h2>
          </div>
          {formData.phase_mode === 'manual' ? (
            <div>
              <p className="text-foreground font-semibold text-lg">
                {formData.current_phase === 0 && '🔒 Phase 0 - Booking Closed'}
                {formData.current_phase === 1 && '⭐ Phase 1 - Priority Booking Active'}
                {formData.current_phase === 2 && '🌐 Phase 2 - Open Booking Active'}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Controlled manually via Start/Stop buttons below
              </p>
            </div>
          ) : (
            <div>
              <p className="text-foreground">{phaseStatus.message}</p>
              <p className="text-sm text-muted-foreground mt-2">
                Based on current date and configured phase date ranges
              </p>
            </div>
          )}
        </div>

        {/* Manual Phase Control */}
        {formData.phase_mode === 'manual' && (
          <div className="bg-card rounded-xl border border-border p-6 mb-8 animate-fade-in">
          <h2 className="text-lg font-semibold text-foreground mb-4">Manual Phase Control</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Use the Start/Stop buttons below to manually control which booking phase is active. Changes take effect immediately.
          </p>
          
          {/* Current Active Phase Display */}
          <div className="mb-6 p-4 rounded-lg bg-muted/50 border-2 border-primary/50">
            <p className="text-sm font-medium text-muted-foreground mb-1">Currently Active:</p>
            <p className="text-2xl font-bold text-foreground">
              {formData.current_phase === 0 && '🔒 Phase 0 - Closed'}
              {formData.current_phase === 1 && '⭐ Phase 1 - Priority Booking'}
              {formData.current_phase === 2 && '🌐 Phase 2 - Open to All'}
            </p>
          </div>

          {/* Phase Control Buttons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Phase 0 - Closed */}
            <div className={`p-5 rounded-lg border-2 transition-all ${
              formData.current_phase === 0 
                ? 'border-destructive bg-destructive/10' 
                : 'border-border bg-card'
            }`}>
              <div className="mb-3">
                <h3 className="font-semibold text-foreground mb-1">Phase 0</h3>
                <p className="text-sm text-muted-foreground">Booking Closed</p>
              </div>
              {formData.current_phase === 0 ? (
                <div className="px-4 py-2 bg-destructive/20 text-destructive rounded-lg text-center font-medium text-sm">
                  ● Active
                </div>
              ) : (
                <button
                  onClick={() => setFormData({ ...formData, current_phase: 0 })}
                  className="w-full px-4 py-2 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-lg font-medium text-sm transition-colors"
                >
                  Close Booking
                </button>
              )}
            </div>

            {/* Phase 1 - Priority */}
            <div className={`p-5 rounded-lg border-2 transition-all ${
              formData.current_phase === 1 
                ? 'border-primary bg-primary/10' 
                : 'border-border bg-card'
            }`}>
              <div className="mb-3">
                <h3 className="font-semibold text-foreground mb-1">Phase 1</h3>
                <p className="text-sm text-muted-foreground">Priority Booking</p>
                <p className="text-xs text-muted-foreground mt-1">Max {formData.phase1_max_bookings} interviews</p>
              </div>
              {formData.current_phase === 1 ? (
                <button
                  onClick={() => setFormData({ ...formData, current_phase: 0 })}
                  className="w-full px-4 py-2 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-lg font-medium text-sm transition-colors"
                >
                  Stop Phase 1
                </button>
              ) : (
                <button
                  onClick={() => setFormData({ ...formData, current_phase: 1 })}
                  className="w-full px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium text-sm transition-colors"
                >
                  Start Phase 1
                </button>
              )}
            </div>

            {/* Phase 2 - Open */}
            <div className={`p-5 rounded-lg border-2 transition-all ${
              formData.current_phase === 2 
                ? 'border-green-500 bg-green-500/10' 
                : 'border-border bg-card'
            }`}>
              <div className="mb-3">
                <h3 className="font-semibold text-foreground mb-1">Phase 2</h3>
                <p className="text-sm text-muted-foreground">Open to All</p>
                <p className="text-xs text-muted-foreground mt-1">Max {formData.phase2_max_bookings} interviews</p>
              </div>
              {formData.current_phase === 2 ? (
                <button
                  onClick={() => setFormData({ ...formData, current_phase: 0 })}
                  className="w-full px-4 py-2 bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-lg font-medium text-sm transition-colors"
                >
                  Stop Phase 2
                </button>
              ) : (
                <button
                  onClick={() => setFormData({ ...formData, current_phase: 2 })}
                  className="w-full px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg font-medium text-sm transition-colors"
                >
                  Start Phase 2
                </button>
              )}
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900 dark:text-blue-100">
                <p className="font-medium mb-1">Manual Control Active</p>
                <p className="text-blue-700 dark:text-blue-300">
                  Phase changes happen immediately when you click Start/Stop. Don't forget to click "Save Configuration" at the bottom to persist changes.
                </p>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Booking Limits Configuration (Always Visible) */}
        <div className="bg-card rounded-xl border border-border p-6 mb-8 animate-fade-in">
          <div className="flex items-center gap-3 mb-4">
            <Target className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Booking Limits</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            Set the maximum number of interviews a student can book during each phase.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Phase 1 - Booking Limit
              </label>
              <input
                type="number"
                min="1"
                value={formData.phase1_max_bookings}
                onChange={(e) => setFormData({ ...formData, phase1_max_bookings: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">interviews per student</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Phase 2 - Booking Limit
              </label>
              <input
                type="number"
                min={formData.phase1_max_bookings}
                value={formData.phase2_max_bookings}
                onChange={(e) => setFormData({ ...formData, phase2_max_bookings: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Must be ≥ Phase 1 limit ({formData.phase1_max_bookings})
              </p>
            </div>
          </div>
        </div>

        {/* Date/Time Configuration (Only for Automatic Mode) */}
        {formData.phase_mode === 'date-based' && (
          <>
            {/* Phase 1 Date Configuration */}
            <div className="bg-card rounded-xl border border-border p-6 mb-8 animate-fade-in">
              <div className="flex items-center gap-3 mb-4">
                <Calendar className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">Phase 1 - Schedule</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Set when Phase 1 (Priority Booking) should automatically start and end.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.phase1_start?.substring(0, 16) || ''}
                    onChange={(e) => setFormData({ ...formData, phase1_start: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    End Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.phase1_end?.substring(0, 16) || ''}
                    onChange={(e) => setFormData({ ...formData, phase1_end: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>

            {/* Phase 2 Date Configuration */}
            <div className="bg-card rounded-xl border border-border p-6 mb-8 animate-fade-in">
              <div className="flex items-center gap-3 mb-4">
                <Calendar className="w-5 h-5 text-success" />
                <h2 className="text-lg font-semibold text-foreground">Phase 2 - Schedule</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Set when Phase 2 (Open Booking) should automatically start and end.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Start Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.phase2_start?.substring(0, 16) || ''}
                    onChange={(e) => setFormData({ ...formData, phase2_start: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    End Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.phase2_end?.substring(0, 16) || ''}
                    onChange={(e) => setFormData({ ...formData, phase2_end: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* Save Button */}
        <div className="flex justify-end gap-4">
          <Link
            to="/admin/events"
            className="px-6 py-2 border border-border rounded-lg hover:bg-muted transition"
          >
            Cancel
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </main>
    </div>
  );
}
