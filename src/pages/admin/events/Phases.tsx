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

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

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
    setFormData({
      phase1_start: data.phase1_start_date || '',
      phase1_end: data.phase1_end_date || '',
      phase2_start: data.phase2_start_date || '',
      phase2_end: data.phase2_end_date || '',
      current_phase: data.current_phase || 0,
      phase1_max_bookings: data.phase1_max_bookings || 3,
      phase2_max_bookings: data.phase2_max_bookings || 6,
      phase_mode: data.phase_mode || 'manual'
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      if (new Date(formData.phase1_start) >= new Date(formData.phase1_end)) {
        alert('Phase 1 start must be before Phase 1 end');
        return;
      }

      if (new Date(formData.phase2_start) >= new Date(formData.phase2_end)) {
        alert('Phase 2 start must be before Phase 2 end');
        return;
      }

      if (formData.phase2_max_bookings < formData.phase1_max_bookings) {
        alert('Phase 2 limit must be ≥ Phase 1 limit');
        return;
      }

      const { error } = await supabase
        .from('events')
        .update({
          phase1_start_date: formData.phase1_start,
          phase1_end_date: formData.phase1_end,
          phase2_start_date: formData.phase2_start,
          phase2_end_date: formData.phase2_end,
          current_phase: formData.current_phase,
          phase1_max_bookings: formData.phase1_max_bookings,
          phase2_max_bookings: formData.phase2_max_bookings,
          phase_mode: formData.phase_mode
        })
        .eq('id', eventId);

      if (error) throw error;

      alert('Phase configuration updated successfully!');
      await loadEvent();
    } catch (err) {
      console.error('Error saving:', err);
      alert('Error saving phase configuration');
    } finally {
      setSaving(false);
    }
  };

  const getPhaseStatus = () => {
    const now = new Date();
    const phase1Start = new Date(formData.phase1_start);
    const phase1End = new Date(formData.phase1_end);
    const phase2Start = new Date(formData.phase2_start);
    const phase2End = new Date(formData.phase2_end);

    if (now < phase1Start) {
      return { status: 'upcoming', message: 'Booking has not started yet' };
    } else if (now >= phase1Start && now < phase1End) {
      return { status: 'phase1', message: 'Currently in Phase 1 (Priority Booking)' };
    } else if (now >= phase2Start && now < phase2End) {
      return { status: 'phase2', message: 'Currently in Phase 2 (Open Booking)' };
    } else if (now >= phase2End) {
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
              {formData.phase_mode === 'date-based' ? 'Detected Phase Status' : 'Current Manual Phase'}
            </h2>
          </div>
          <p className="text-foreground">{phaseStatus.message}</p>
          {formData.phase_mode === 'date-based' && (
            <p className="text-sm text-muted-foreground mt-2">
              Based on current date and configured phase date ranges
            </p>
          )}
        </div>

        {/* Manual Phase Control */}
        {formData.phase_mode === 'manual' && (
          <div className="bg-card rounded-xl border border-border p-6 mb-8 animate-fade-in">
          <h2 className="text-lg font-semibold text-foreground mb-4">Manual Phase Control</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Manually set the active booking phase. This setting is only used when Manual Control mode is selected above.
          </p>
          <div className="space-y-3">
            <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-muted/50 transition"
                   style={{ borderColor: formData.current_phase === 0 ? 'hsl(var(--primary))' : 'hsl(var(--border))' }}>
              <input
                type="radio"
                name="current_phase"
                value={0}
                checked={formData.current_phase === 0}
                onChange={() => setFormData({ ...formData, current_phase: 0 })}
                className="mr-3"
              />
              <div>
                <p className="font-semibold text-foreground">Phase 0 - Closed</p>
                <p className="text-sm text-muted-foreground">Booking is closed.</p>
              </div>
            </label>

            <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-muted/50 transition"
                   style={{ borderColor: formData.current_phase === 1 ? 'hsl(var(--primary))' : 'hsl(var(--border))' }}>
              <input
                type="radio"
                name="current_phase"
                value={1}
                checked={formData.current_phase === 1}
                onChange={() => setFormData({ ...formData, current_phase: 1 })}
                className="mr-3"
              />
              <div>
                <p className="font-semibold text-foreground">Phase 1 - Priority Booking</p>
                <p className="text-sm text-muted-foreground">
                  Max {formData.phase1_max_bookings} interviews
                </p>
              </div>
            </label>

            <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-muted/50 transition"
                   style={{ borderColor: formData.current_phase === 2 ? 'hsl(var(--primary))' : 'hsl(var(--border))' }}>
              <input
                type="radio"
                name="current_phase"
                value={2}
                checked={formData.current_phase === 2}
                onChange={() => setFormData({ ...formData, current_phase: 2 })}
                className="mr-3"
              />
              <div>
                <p className="font-semibold text-foreground">Phase 2 - Open to All</p>
                <p className="text-sm text-muted-foreground">
                  Max {formData.phase2_max_bookings} interviews
                </p>
              </div>
            </label>
          </div>
        </div>
        )}

        {/* Phase 1 Configuration */}
        <div className="bg-card rounded-xl border border-border p-6 mb-8 animate-fade-in">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Phase 1 - Priority Booking</h2>
          </div>
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
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-2">
                Booking Limit (interviews per student)
              </label>
              <input
                type="number"
                min="1"
                value={formData.phase1_max_bookings}
                onChange={(e) => setFormData({ ...formData, phase1_max_bookings: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Phase 2 Configuration */}
        <div className="bg-card rounded-xl border border-border p-6 mb-8 animate-fade-in">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-5 h-5 text-success" />
            <h2 className="text-lg font-semibold text-foreground">Phase 2 - Open Booking</h2>
          </div>
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
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-2">
                Booking Limit (interviews per student)
              </label>
              <input
                type="number"
                min={formData.phase1_max_bookings}
                value={formData.phase2_max_bookings}
                onChange={(e) => setFormData({ ...formData, phase2_max_bookings: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-primary"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Must be ≥ Phase 1 limit ({formData.phase1_max_bookings})
              </p>
            </div>
          </div>
        </div>

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
