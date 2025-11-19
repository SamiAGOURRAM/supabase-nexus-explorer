import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Clock, Trash2, Edit } from 'lucide-react';

type Session = {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  interview_duration_minutes: number;
  buffer_minutes: number;
  slots_per_time: number;
  is_active: boolean;
};

export default function SessionManagement() {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatingINF, setGeneratingINF] = useState(false);
  const [event, setEvent] = useState<any>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showINFGenerator, setShowINFGenerator] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    start_time: '',
    end_time: '',
    interview_duration_minutes: 15,
    buffer_minutes: 5,
    slots_per_time: 2
  });

  const [infFormData, setInfFormData] = useState({
    session1_start: '',
    session1_end: '',
    session2_start: '',
    session2_end: ''
  });

  useEffect(() => {
    checkAdminAndLoad();
  }, [eventId]);

  const checkAdminAndLoad = async () => {
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

      await loadData();
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError) {
      console.error('Error loading event:', eventError);
      alert('Event not found');
      navigate('/admin/events');
      return;
    }

    setEvent(eventData);

    const { data: sessionsData, error: sessionsError } = await supabase
      .from('speed_recruiting_sessions')
      .select('*')
      .eq('event_id', eventId)
      .order('start_time', { ascending: true });

    if (sessionsError) {
      console.error('Error loading sessions:', sessionsError);
    } else {
      setSessions(sessionsData || []);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      start_time: '',
      end_time: '',
      interview_duration_minutes: 15,
      buffer_minutes: 5,
      slots_per_time: 2
    });
    setEditingSession(null);
    setShowAddForm(false);
  };

  const handleEdit = (session: Session) => {
    setFormData({
      name: session.name,
      start_time: session.start_time.substring(0, 16),
      end_time: session.end_time.substring(0, 16),
      interview_duration_minutes: session.interview_duration_minutes,
      buffer_minutes: session.buffer_minutes,
      slots_per_time: session.slots_per_time
    });
    setEditingSession(session);
    setShowAddForm(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      if (!formData.name.trim()) {
        alert('Session name is required');
        return;
      }

      if (new Date(formData.start_time) >= new Date(formData.end_time)) {
        alert('Start time must be before end time');
        return;
      }

      if (editingSession) {
        const { error } = await supabase
          .from('speed_recruiting_sessions')
          .update({
            name: formData.name,
            start_time: formData.start_time,
            end_time: formData.end_time,
            interview_duration_minutes: formData.interview_duration_minutes,
            buffer_minutes: formData.buffer_minutes,
            slots_per_time: formData.slots_per_time
          })
          .eq('id', editingSession.id);

        if (error) throw error;
        alert('Session updated successfully!');
      } else {
        const { error } = await supabase
          .from('speed_recruiting_sessions')
          .insert({
            event_id: eventId,
            name: formData.name,
            start_time: formData.start_time,
            end_time: formData.end_time,
            interview_duration_minutes: formData.interview_duration_minutes,
            buffer_minutes: formData.buffer_minutes,
            slots_per_time: formData.slots_per_time,
            is_active: true
          });

        if (error) throw error;
        alert('✅ Session created successfully!\n\n📊 Slots are being auto-generated for all participating companies.\n💡 You can use "Regenerate Slots" if needed.');
      }

      resetForm();
      await loadData();
    } catch (err) {
      console.error('Error saving:', err);
      alert('Error saving session');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (sessionId: string, sessionName: string) => {
    if (!confirm(`Delete session "${sessionName}"? This will also delete all associated interview slots.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('speed_recruiting_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      alert('Session deleted successfully!');
      await loadData();
    } catch (err) {
      console.error('Error deleting:', err);
      alert('Error deleting session');
    }
  };

  const calculateSlotCount = (session: Session) => {
    const start = new Date(session.start_time);
    const end = new Date(session.end_time);
    const durationMs = (session.interview_duration_minutes + session.buffer_minutes) * 60 * 1000;
    const totalMs = end.getTime() - start.getTime();
    return Math.floor(totalMs / durationMs);
  };

  const generateSlotsForSession = async (session: Session) => {
    if (!confirm(`Regenerate interview slots for "${session.name}"?\n\nThis will:\n✓ Delete unbooked slots\n✓ Keep slots with existing bookings\n✓ Generate fresh slots for all ${event?.companies?.length || 0} companies\n\nEstimated: ~${calculateSlotCount(session)} slots per company`)) {
      return;
    }

    try {
      setGenerating(true);

      // Use the new database function for atomic regeneration
      const { data, error } = await supabase
        .rpc('fn_regenerate_event_slots', {
          p_session_id: session.id
        });

      if (error) throw error;

      const result = data?.[0];
      if (result) {
        alert(`✅ Slot regeneration complete!\n\n📊 ${result.slots_created} total slots created\n🏢 ${result.companies_affected} companies updated\n📈 ~${Math.floor(result.slots_created / result.companies_affected)} slots per company`);
      }
    } catch (err) {
      console.error('Error regenerating slots:', err);
      alert('❌ Error regenerating slots: ' + (err as any).message);
    } finally {
      setGenerating(false);
    }
  };

  const generateINFSlots = async () => {
    if (!infFormData.session1_start || !infFormData.session1_end || 
        !infFormData.session2_start || !infFormData.session2_end) {
      alert('Please fill in all session times');
      return;
    }

    if (!confirm(`Generate INF-compliant slots for this event?\n\nThis will:\n✓ Create 2 interview sessions\n✓ Generate exactly 15 slots per company (8 in first session, 7 in second)\n✓ 10 minutes per slot, 5 minutes buffer\n✓ Capacity: 2 students per slot\n✓ Delete existing sessions and slots\n\n⚠️ This action cannot be undone!`)) {
      return;
    }

    try {
      setGeneratingINF(true);

      const { data, error } = await supabase
        .rpc('fn_generate_inf_slots', {
          p_event_id: eventId,
          p_session1_start: infFormData.session1_start,
          p_session1_end: infFormData.session1_end,
          p_session2_start: infFormData.session2_start,
          p_session2_end: infFormData.session2_end
        });

      if (error) throw error;

      const result = data?.[0];
      if (result) {
        alert(`✅ INF Slot Generation Complete!\n\n📊 ${result.total_slots_created} total slots created\n🏢 ${result.companies_processed} companies processed\n📅 Session 1: ${result.session1_slots} slots\n📅 Session 2: ${result.session2_slots} slots\n\n${result.message}`);
        setShowINFGenerator(false);
        await loadData();
      }
    } catch (err) {
      console.error('Error generating INF slots:', err);
      alert('❌ Error generating INF slots: ' + (err as any).message);
    } finally {
      setGeneratingINF(false);
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
              <p className="text-sm text-muted-foreground mt-1">Speed Recruiting Sessions</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* INF Slot Generator */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border-2 border-primary/20 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">INF Event Slot Generator</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Generate INF-compliant slots: 15 slots per company (8+7), 10min slots, 5min buffer, capacity 2
              </p>
            </div>
            <button
              onClick={() => setShowINFGenerator(!showINFGenerator)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
            >
              {showINFGenerator ? 'Hide Generator' : 'Generate INF Slots'}
            </button>
          </div>

          {showINFGenerator && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-card rounded-lg border border-border p-4">
                  <h3 className="font-semibold text-foreground mb-3">First Interview Session</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Start Time *
                      </label>
                      <input
                        type="datetime-local"
                        value={infFormData.session1_start}
                        onChange={(e) => setInfFormData({ ...infFormData, session1_start: e.target.value })}
                        className="w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        End Time *
                      </label>
                      <input
                        type="datetime-local"
                        value={infFormData.session1_end}
                        onChange={(e) => setInfFormData({ ...infFormData, session1_end: e.target.value })}
                        className="w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Will generate 8 slots per company
                    </p>
                  </div>
                </div>

                <div className="bg-card rounded-lg border border-border p-4">
                  <h3 className="font-semibold text-foreground mb-3">Second Interview Session</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Start Time *
                      </label>
                      <input
                        type="datetime-local"
                        value={infFormData.session2_start}
                        onChange={(e) => setInfFormData({ ...infFormData, session2_start: e.target.value })}
                        className="w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        End Time *
                      </label>
                      <input
                        type="datetime-local"
                        value={infFormData.session2_end}
                        onChange={(e) => setInfFormData({ ...infFormData, session2_end: e.target.value })}
                        className="w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Will generate 7 slots per company (15 total)
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">INF Requirements:</h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                  <li>15 slots per company (8 in first session, 7 in second)</li>
                  <li>10 minutes per interview slot</li>
                  <li>5 minutes buffer between slots</li>
                  <li>Capacity: 2 students per slot</li>
                  <li>Total time per session: ~110 minutes (8 slots) and ~100 minutes (7 slots)</li>
                </ul>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowINFGenerator(false)}
                  className="px-6 py-2 border border-border rounded-lg hover:bg-muted transition"
                >
                  Cancel
                </button>
                <button
                  onClick={generateINFSlots}
                  disabled={generatingINF}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
                >
                  {generatingINF ? 'Generating...' : 'Generate INF Slots'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-card rounded-xl border border-border p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Sessions ({sessions.length})</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Define time blocks for speed recruiting interviews
              </p>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
            >
              + Add Session
            </button>
          </div>

          {sessions.length === 0 ? (
            <div className="text-center py-12 bg-muted rounded-lg">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-sm font-medium text-foreground">No sessions yet</h3>
              <p className="text-sm text-muted-foreground mt-1">Create your first speed recruiting session.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div key={session.id} className="border border-border rounded-lg p-4 hover:border-primary transition">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-foreground">{session.name}</h3>
                        {!session.is_active && (
                          <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full">Inactive</span>
                        )}
                      </div>
                      <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Time Range</p>
                          <p className="font-medium text-foreground">
                            {new Date(session.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            {' - '}
                            {new Date(session.end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Interview Duration</p>
                          <p className="font-medium text-foreground">{session.interview_duration_minutes} min</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Buffer Time</p>
                          <p className="font-medium text-foreground">{session.buffer_minutes} min</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Capacity</p>
                          <p className="font-medium text-foreground">{session.slots_per_time} students/slot</p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <div className="text-sm text-muted-foreground">
                          📊 ~{calculateSlotCount(session)} slots per company
                        </div>
                        <button
                          onClick={() => generateSlotsForSession(session)}
                          disabled={generating}
                          className="px-3 py-1.5 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
                        >
                          {generating ? '⏳ Regenerating...' : '🔄 Regenerate Slots'}
                        </button>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEdit(session)}
                        className="p-2 text-primary hover:bg-primary/10 rounded-lg transition"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(session.id, session.name)}
                        className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {showAddForm && (
          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              {editingSession ? 'Edit Session' : 'Add New Session'}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Session Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Morning Session"
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Start Time *
                </label>
                <input
                  type="datetime-local"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  End Time *
                </label>
                <input
                  type="datetime-local"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Interview Duration (minutes) *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.interview_duration_minutes}
                  onChange={(e) => setFormData({ ...formData, interview_duration_minutes: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Buffer Time (minutes)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.buffer_minutes}
                  onChange={(e) => setFormData({ ...formData, buffer_minutes: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">Break between interviews</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Capacity (students per slot) *
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.slots_per_time}
                  onChange={(e) => setFormData({ ...formData, slots_per_time: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-muted-foreground mt-1">Simultaneous students</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={resetForm}
                className="px-6 py-2 border border-border rounded-lg hover:bg-muted transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Session'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
