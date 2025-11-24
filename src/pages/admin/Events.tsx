import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { Calendar, Users, Clock, Target, Trash2, Power, X, AlertTriangle } from 'lucide-react';
import type { Event } from '@/types/database';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAuth } from '@/hooks/useAuth';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import EmptyState from '@/components/shared/EmptyState';
import LoadingTable from '@/components/shared/LoadingTable';
import LoadingScreen from '@/components/shared/LoadingScreen';

export default function AdminEvents() {
  const { user, loading: authLoading, signOut } = useAuth('admin');
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deactivateConfirm, setDeactivateConfirm] = useState<{ eventId: string; eventName: string } | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    description: '',
    location: '',
    current_phase: 0,
    phase1_max_bookings: 3,
    phase2_max_bookings: 6,
    phase_mode: 'manual'
  });
  const { showSuccess, showError } = useToast();

  const loadEvents = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        throw new Error(`Failed to load events: ${error.message}`);
      }

      setEvents(data || []);
    } catch (err: any) {
      console.error('Error loading events:', err);
      const errorMessage = err instanceof Error ? err : new Error('Failed to load events');
      setError(errorMessage);
      showError('Failed to load events. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    if (!authLoading && user) {
      loadEvents();
    }
  }, [authLoading, loadEvents, user]);

  if (authLoading) {
    return <LoadingScreen message="Loading events..." />;
  }

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreating(true);
      const { error } = await supabase
        .from('events')
        .insert([formData])
        .select();

      if (error) throw error;

      setShowCreateForm(false);
      setFormData({ 
        name: '', 
        date: '', 
        description: '', 
        location: '',
        current_phase: 0,
        phase1_max_bookings: 3,
        phase2_max_bookings: 6,
        phase_mode: 'manual'
      });
      showSuccess('Event created successfully!');
      await loadEvents();
    } catch (err: any) {
      console.error('Error creating event:', err);
      showError(err.message || 'Failed to create event. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (eventId: string, currentStatus: boolean) => {
    if (currentStatus) {
      // Show confirmation modal for deactivation
      const event = events.find(e => e.id === eventId);
      if (event) {
        setDeactivateConfirm({ eventId, eventName: event.name });
      }
      return;
    }
    // Activate directly without confirmation
    await performToggleActive(eventId, false);
  };

  const performToggleActive = async (eventId: string, currentStatus: boolean) => {
    try {
      setTogglingId(eventId);
      const { error } = await supabase
        .from('events')
        .update({ is_active: !currentStatus })
        .eq('id', eventId)
        .select();

      if (error) throw error;
      showSuccess(`Event ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      await loadEvents();
      setDeactivateConfirm(null);
    } catch (err: any) {
      console.error('Error toggling event status:', err);
      showError(err.message || 'Failed to update event status. Please try again.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteEvent = async (eventId: string, eventName: string) => {
    if (!confirm(`Are you sure you want to delete "${eventName}"? This will also delete all related sessions, slots, bookings, and registrations. This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingId(eventId);
      const { data, error } = await supabase
        .rpc('fn_delete_event', { p_event_id: eventId });

      if (error) throw error;
      
      await loadEvents();
      
      // Show detailed deletion summary
      if (data && data.length > 0) {
        const result = data[0];
        showSuccess(
          `Event deleted successfully! Deleted: ${result.slots_deleted} slots, ${result.bookings_deleted} bookings, ${result.sessions_deleted} sessions.`
        );
      } else {
        showSuccess('Event deleted successfully!');
      }
    } catch (err: any) {
      console.error('Error deleting event:', err);
      showError(err.message || 'Failed to delete event. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AdminLayout onSignOut={signOut}>
      <div className="p-4 sm:p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Events Management</h1>
              <p className="text-muted-foreground">Create and manage recruitment events</p>
            </div>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition font-medium w-full sm:w-auto"
            >
              {showCreateForm ? '✕ Cancel' : '+ Create New Event'}
            </button>
          </div>

          {/* Create Event Form */}
          {showCreateForm && (
          <div className="bg-card rounded-xl border border-border p-4 sm:p-6 mb-8">
            <h2 className="text-xl font-semibold text-foreground mb-4">Create New Event</h2>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Event Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-primary"
                    placeholder="e.g., Speed Recruiting 2024"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Event Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-primary"
                    placeholder="e.g., University Hall"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-primary"
                  rows={3}
                  placeholder="Event description..."
                />
              </div>

              {/* Phase Configuration */}
              <div className="border-t border-border pt-4 mt-4">
                <h3 className="text-lg font-semibold text-foreground mb-3">Phase Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Initial Phase
                    </label>
                    <select
                      value={formData.current_phase}
                      onChange={(e) => setFormData({ ...formData, current_phase: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-primary"
                    >
                      <option value={0}>Phase 0 - Closed</option>
                      <option value={1}>Phase 1 - Priority</option>
                      <option value={2}>Phase 2 - Open</option>
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">Starting phase for bookings</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Phase 1 Max Bookings
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.phase1_max_bookings}
                      onChange={(e) => setFormData({ ...formData, phase1_max_bookings: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-primary"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Max interviews per student</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Phase 2 Max Bookings
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={formData.phase2_max_bookings}
                      onChange={(e) => setFormData({ ...formData, phase2_max_bookings: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-primary"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Should be ≥ Phase 1 limit</p>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={creating}
                className="bg-success text-white px-6 py-2 rounded-lg hover:bg-success/90 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {creating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Creating...</span>
                  </>
                ) : (
                  'Create Event'
                )}
              </button>
            </form>
          </div>
        )}

        {error ? (
          <ErrorDisplay error={error} onRetry={loadEvents} />
        ) : loading ? (
          <LoadingTable columns={4} rows={8} />
        ) : events.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No events yet"
            message="Create your first event to start managing internship recruitment activities."
            action={
              <button
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                <Calendar className="w-4 h-4" />
                Create Your First Event
              </button>
            }
            className="bg-card rounded-xl border border-border p-12"
          />
        ) : (
          <div className="grid grid-cols-1 gap-6 animate-in">
            {events.map((event) => (
              <div
                key={event.id}
                className="bg-card border border-border rounded-xl p-6 hover:border-primary hover:shadow-elegant transition-all"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Calendar className="w-8 h-8 text-primary flex-shrink-0" />
                    <div className="min-w-0">
                      <h3 className="text-lg sm:text-xl font-semibold text-foreground truncate">{event.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {new Date(event.date).toLocaleDateString()} {event.location && `• ${event.location}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      event.is_active
                        ? 'bg-success/10 text-success'
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {event.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <button
                      onClick={() => handleToggleActive(event.id, event.is_active)}
                      disabled={togglingId === event.id}
                      className="p-2 hover:bg-muted rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title={event.is_active ? 'Deactivate event' : 'Activate event'}
                    >
                      {togglingId === event.id ? (
                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Power className={`w-5 h-5 ${event.is_active ? 'text-success' : 'text-muted-foreground'}`} />
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(event.id, event.name)}
                      disabled={deletingId === event.id}
                      className="p-2 hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete event"
                    >
                      {deletingId === event.id ? (
                        <div className="w-5 h-5 border-2 border-destructive border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Trash2 className="w-5 h-5 text-destructive" />
                      )}
                    </button>
                  </div>
                </div>
                
                {event.description && (
                  <p className="text-muted-foreground mb-4">{event.description}</p>
                )}

                {/* Management Links */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 mt-4">
                  <Link
                    to={`/admin/events/${event.id}/quick-invite`}
                    className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 bg-primary/5 border border-primary/20 rounded-lg hover:bg-primary/10 transition-colors group"
                  >
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary flex-shrink-0" />
                    <span className="text-xs sm:text-sm font-medium text-foreground text-center">Quick Invite</span>
                  </Link>
                  <Link
                    to={`/admin/events/${event.id}/phases`}
                    className="flex items-center gap-2 px-4 py-3 bg-info/5 border border-info/20 rounded-lg hover:bg-info/10 transition-colors"
                  >
                    <Target className="w-5 h-5 text-info" />
                    <span className="text-sm font-medium text-foreground">Phases</span>
                  </Link>
                  <Link
                    to={`/admin/events/${event.id}/sessions`}
                    className="flex items-center gap-2 px-4 py-3 bg-success/5 border border-success/20 rounded-lg hover:bg-success/10 transition-colors"
                  >
                    <Clock className="w-5 h-5 text-success" />
                    <span className="text-sm font-medium text-foreground">Sessions</span>
                  </Link>
                  <Link
                    to={`/admin/events/${event.id}/schedule`}
                    className="flex items-center gap-2 px-4 py-3 bg-warning/5 border border-warning/20 rounded-lg hover:bg-warning/10 transition-colors"
                  >
                    <Calendar className="w-5 h-5 text-warning" />
                    <span className="text-sm font-medium text-foreground">Schedule</span>
                  </Link>
                  <Link
                    to={`/admin/events/${event.id}/slots`}
                    className="flex items-center gap-2 px-4 py-3 bg-accent/5 border border-accent/20 rounded-lg hover:bg-accent/10 transition-colors"
                  >
                    <Clock className="w-5 h-5 text-accent" />
                    <span className="text-sm font-medium text-foreground">Slots</span>
                  </Link>
                  <Link
                    to={`/admin/companies?eventId=${event.id}`}
                    className="flex items-center gap-2 px-4 py-3 bg-success/5 border border-success/20 rounded-lg hover:bg-success/10 transition-colors"
                  >
                    <Users className="w-5 h-5 text-success" />
                    <span className="text-sm font-medium text-foreground">Companies</span>
                  </Link>
                  <Link
                    to={`/admin/students?eventId=${event.id}`}
                    className="flex items-center gap-2 px-4 py-3 bg-primary/5 border border-primary/20 rounded-lg hover:bg-primary/10 transition-colors"
                  >
                    <Users className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium text-foreground">Students</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Deactivate Confirmation Modal */}
        {deactivateConfirm && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-card rounded-xl border border-border max-w-md w-full shadow-elegant">
              <div className="p-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-warning/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-6 h-6 text-warning" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-2">Deactivate Event</h3>
                    <p className="text-sm text-muted-foreground">
                      Are you sure you want to deactivate <strong>"{deactivateConfirm.eventName}"</strong>?
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      Students will no longer be able to view or book slots for this event. You can reactivate it later.
                    </p>
                  </div>
                  <button
                    onClick={() => setDeactivateConfirm(null)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => setDeactivateConfirm(null)}
                    className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const event = events.find(e => e.id === deactivateConfirm.eventId);
                      if (event) {
                        performToggleActive(deactivateConfirm.eventId, event.is_active);
                      }
                    }}
                    disabled={togglingId === deactivateConfirm.eventId}
                    className="px-4 py-2 bg-warning text-warning-foreground rounded-lg hover:bg-warning/90 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {togglingId === deactivateConfirm.eventId ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-warning-foreground border-t-transparent rounded-full animate-spin" />
                        Deactivating...
                      </span>
                    ) : (
                      'Deactivate Event'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </AdminLayout>
  );
}
