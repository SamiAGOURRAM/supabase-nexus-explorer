import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Calendar, MapPin, Users, ArrowLeft, Clock, Target } from 'lucide-react';
import type { Event } from '@/types/database';

export default function AdminEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    description: '',
    location: ''
  });
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminAndLoadEvents();
  }, []);

  const checkAdminAndLoadEvents = async () => {
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

    await loadEvents();
  };

  const loadEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error loading events:', error);
    } else {
      setEvents(data || []);
    }
    setLoading(false);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('events')
        .insert([formData]);

      if (error) throw error;

      setShowCreateForm(false);
      setFormData({ name: '', date: '', description: '', location: '' });
      await loadEvents();
      alert('✅ Event created successfully!');
    } catch (err: any) {
      alert('Error creating event: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/admin" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Events Management</h1>
                <p className="text-sm text-muted-foreground mt-1">Manage speed recruiting events</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Create Event Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition font-medium"
          >
            {showCreateForm ? '✕ Cancel' : '+ Create New Event'}
          </button>
        </div>

        {/* Create Event Form */}
        {showCreateForm && (
          <div className="bg-card rounded-xl border border-border p-6 mb-8">
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
              <button
                type="submit"
                className="bg-success text-white px-6 py-2 rounded-lg hover:bg-success/90 transition font-medium"
              >
                Create Event
              </button>
            </form>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border border-border">
            <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Events Yet</h3>
            <p className="text-muted-foreground">Create your first event to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 animate-in">
            {events.map((event) => (
              <div
                key={event.id}
                className="bg-card border border-border rounded-xl p-6 hover:border-primary hover:shadow-elegant transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-8 h-8 text-primary" />
                    <div>
                      <h3 className="text-xl font-semibold text-foreground">{event.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {new Date(event.date).toLocaleDateString()} {event.location && `• ${event.location}`}
                      </p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    event.is_active
                      ? 'bg-success/10 text-success'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {event.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                
                {event.description && (
                  <p className="text-muted-foreground mb-4">{event.description}</p>
                )}

                {/* Management Links */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                  <Link
                    to={`/admin/events/${event.id}/quick-invite`}
                    className="flex items-center gap-2 px-4 py-3 bg-primary/5 border border-primary/20 rounded-lg hover:bg-primary/10 transition-colors group"
                  >
                    <Users className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium text-foreground">Quick Invite</span>
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
                    to={`/admin/events/${event.id}/companies`}
                    className="flex items-center gap-2 px-4 py-3 bg-success/5 border border-success/20 rounded-lg hover:bg-success/10 transition-colors"
                  >
                    <Users className="w-5 h-5 text-success" />
                    <span className="text-sm font-medium text-foreground">Companies</span>
                  </Link>
                  <Link
                    to={`/admin/events/${event.id}/students`}
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
      </main>
    </div>
  );
}