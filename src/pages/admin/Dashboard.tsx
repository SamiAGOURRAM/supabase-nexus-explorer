import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Calendar, Building2, Users, Briefcase, LogOut, Clock, MapPin } from 'lucide-react';

type Event = {
  id: string;
  name: string;
  date: string;
  location: string | null;
};

type EventStats = {
  event_companies: number;
  event_students: number;
  event_bookings: number;
  total_students: number;
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [nextEvent, setNextEvent] = useState<Event | null>(null);
  const [stats, setStats] = useState<EventStats | null>(null);

  useEffect(() => {
    checkAdminAndLoadData();
  }, []);

  const checkAdminAndLoadData = async () => {
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

      await loadDashboardData();
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDashboardData = async () => {
    const today = new Date().toISOString();

    // Get next upcoming event
    const { data: upcomingEvent } = await supabase
      .from('events')
      .select('id, name, date, location')
      .gte('date', today)
      .order('date', { ascending: true })
      .limit(1)
      .single();

    if (upcomingEvent) {
      setNextEvent(upcomingEvent);

      // Get stats specific to this event
      const [
        { count: eventCompanies },
        { count: eventBookings },
        { count: totalStudents }
      ] = await Promise.all([
        supabase.from('event_participants').select('*', { count: 'exact', head: true }).eq('event_id', upcomingEvent.id),
        supabase.from('interview_bookings').select('ib.*, event_slots!inner(event_id)', { count: 'exact', head: true }).eq('event_slots.event_id', upcomingEvent.id),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student')
      ]);

      setStats({
        event_companies: eventCompanies || 0,
        event_students: 0, // This would need event-specific registration
        event_bookings: eventBookings || 0,
        total_students: totalStudents || 0
      });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!nextEvent) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
                <p className="text-sm text-muted-foreground mt-1">Welcome back, Admin</p>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Upcoming Events</h2>
          <p className="text-muted-foreground mb-6">Create your first event to get started</p>
          <Link
            to="/admin/events"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Calendar className="w-5 h-5" />
            Manage Events
          </Link>
        </main>
      </div>
    );
  }

  const eventDate = new Date(nextEvent.date);
  const formattedDate = eventDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground mt-1">Welcome back, Admin</p>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Event Header */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20 p-6 mb-8">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm text-primary mb-2">
                <Clock className="w-4 h-4" />
                <span className="font-medium">Next Event</span>
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">{nextEvent.name}</h2>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{formattedDate}</span>
                </div>
                {nextEvent.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{nextEvent.location}</span>
                  </div>
                )}
              </div>
            </div>
            <Link
              to="/admin/events"
              className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
            >
              Manage Events
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-success" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">{stats?.event_companies || 0}</p>
            <p className="text-sm font-medium text-foreground mb-1">Companies</p>
            <p className="text-xs text-muted-foreground">participating</p>
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">{stats?.total_students || 0}</p>
            <p className="text-sm font-medium text-foreground mb-1">Students</p>
            <p className="text-xs text-muted-foreground">registered</p>
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-orange-500" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">{stats?.event_bookings || 0}</p>
            <p className="text-sm font-medium text-foreground mb-1">Bookings</p>
            <p className="text-xs text-muted-foreground">interviews scheduled</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Event Management</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <Link
              to={`/admin/events/${nextEvent.id}/companies`}
              className="p-4 border border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-all text-center"
            >
              <Building2 className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium">Companies</p>
            </Link>
            <Link
              to={`/admin/events/${nextEvent.id}/students`}
              className="p-4 border border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-all text-center"
            >
              <Users className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium">Students</p>
            </Link>
            <Link
              to={`/admin/events/${nextEvent.id}/sessions`}
              className="p-4 border border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-all text-center"
            >
              <Clock className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium">Sessions</p>
            </Link>
            <Link
              to={`/admin/events/${nextEvent.id}/slots`}
              className="p-4 border border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-all text-center"
            >
              <Calendar className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-sm font-medium">Slots</p>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}