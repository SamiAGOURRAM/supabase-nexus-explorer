import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Calendar, Building2, Users, Briefcase, LogOut, Clock, MapPin, UserPlus, Upload, ChevronRight, Target, TrendingUp } from 'lucide-react';
import BulkImportModal from '@/components/admin/BulkImportModal';

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
  total_slots: number;
  available_slots: number;
  booking_rate: number;
  top_company_name: string;
  top_company_bookings: number;
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [nextEvent, setNextEvent] = useState<Event | null>(null);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [showBulkImport, setShowBulkImport] = useState(false);

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
        { count: totalSlots }
      ] = await Promise.all([
        supabase.from('event_participants').select('*', { count: 'exact', head: true }).eq('event_id', upcomingEvent.id),
        supabase.from('event_slots').select('*', { count: 'exact', head: true }).eq('event_id', upcomingEvent.id).eq('is_active', true)
      ]);

      // Get bookings count
      const { count: eventBookings } = await supabase
        .from('interview_bookings')
        .select('*, event_slots!inner(event_id)', { count: 'exact', head: true })
        .eq('event_slots.event_id', upcomingEvent.id)
        .eq('status', 'confirmed');

      // Get unique students who have bookings for this event
      const { data: studentBookings } = await supabase
        .from('interview_bookings')
        .select('student_id, event_slots!inner(event_id)')
        .eq('event_slots.event_id', upcomingEvent.id)
        .eq('status', 'confirmed');

      const uniqueStudents = new Set(studentBookings?.map(b => b.student_id) || []).size;

      // Get top company - simplified approach
      const { data: companySlots } = await supabase
        .from('event_slots')
        .select('company_id, companies!inner(company_name), interview_bookings!inner(status)')
        .eq('event_id', upcomingEvent.id)
        .eq('interview_bookings.status', 'confirmed');

      const companyCounts: Record<string, { name: string; count: number }> = {};
      companySlots?.forEach((slot: any) => {
        const companyId = slot.company_id;
        const companyName = slot.companies?.company_name || 'Unknown';
        if (!companyCounts[companyId]) {
          companyCounts[companyId] = { name: companyName, count: 0 };
        }
        companyCounts[companyId].count++;
      });

      const topCompanyEntry = Object.values(companyCounts).sort((a, b) => b.count - a.count)[0];
      const availableSlots = (totalSlots || 0) - (eventBookings || 0);
      const bookingRate = totalSlots && totalSlots > 0 ? Math.round((eventBookings || 0) / totalSlots * 100) : 0;

      setStats({
        event_companies: eventCompanies || 0,
        event_students: uniqueStudents,
        event_bookings: eventBookings || 0,
        total_students: uniqueStudents,
        total_slots: totalSlots || 0,
        available_slots: availableSlots,
        booking_rate: bookingRate,
        top_company_name: topCompanyEntry?.name || 'N/A',
        top_company_bookings: topCompanyEntry?.count || 0
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
          <div className="flex items-start justify-between flex-wrap gap-4">
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
            <div className="flex gap-3">
              <Link
                to={`/admin/events/${nextEvent.id}/quick-invite`}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span>Quick Invite</span>
              </Link>
              <button
                onClick={() => setShowBulkImport(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span>Bulk Import CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid - Row 1: Core Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Link
            to={`/admin/events/${nextEvent.id}/companies`}
            className="bg-card rounded-xl border border-border p-6 hover:border-primary hover:shadow-lg transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-success" />
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">{stats?.event_companies || 0}</p>
            <p className="text-sm font-medium text-foreground mb-1">Companies</p>
            <p className="text-xs text-muted-foreground">participating</p>
          </Link>

          <Link
            to={`/admin/events/${nextEvent.id}/students`}
            className="bg-card rounded-xl border border-border p-6 hover:border-primary hover:shadow-lg transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">{stats?.total_students || 0}</p>
            <p className="text-sm font-medium text-foreground mb-1">Students</p>
            <p className="text-xs text-muted-foreground">registered</p>
          </Link>

          <Link
            to={`/admin/events/${nextEvent.id}/participants`}
            className="bg-card rounded-xl border border-border p-6 hover:border-primary hover:shadow-lg transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-orange-500" />
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">{stats?.event_bookings || 0}</p>
            <p className="text-sm font-medium text-foreground mb-1">Bookings</p>
            <p className="text-xs text-muted-foreground">interviews scheduled</p>
          </Link>
        </div>

        {/* Stats Grid - Row 2: Insights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link
            to={`/admin/events/${nextEvent.id}/slots`}
            className="bg-card rounded-xl border border-border p-6 hover:border-primary hover:shadow-lg transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-500" />
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">{stats?.available_slots || 0}</p>
            <p className="text-sm font-medium text-foreground mb-1">Available Slots</p>
            <p className="text-xs text-muted-foreground">remaining capacity</p>
          </Link>

          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-500" />
              </div>
            </div>
            <p className="text-xl font-bold text-foreground mb-1 truncate">{stats?.top_company_name || 'N/A'}</p>
            <p className="text-sm font-medium text-foreground mb-1">Top Company</p>
            <p className="text-xs text-muted-foreground">{stats?.top_company_bookings || 0} bookings</p>
          </div>

          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-blue-500" />
              </div>
            </div>
            <div className="mb-3">
              <p className="text-3xl font-bold text-foreground mb-1">{stats?.booking_rate || 0}%</p>
              <p className="text-sm font-medium text-foreground mb-1">Booking Rate</p>
              <p className="text-xs text-muted-foreground">{stats?.event_bookings || 0} of {stats?.total_slots || 0} slots</p>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${stats?.booking_rate || 0}%` }}
              />
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="pt-6 border-t border-border">
          <div className="flex flex-wrap gap-4 justify-center text-sm">
            <Link to={`/admin/events/${nextEvent.id}/sessions`} className="text-muted-foreground hover:text-foreground transition-colors">
              Sessions
            </Link>
            <Link to={`/admin/events/${nextEvent.id}/phases`} className="text-muted-foreground hover:text-foreground transition-colors">
              Phases
            </Link>
            <Link to={`/admin/events/${nextEvent.id}/schedule`} className="text-muted-foreground hover:text-foreground transition-colors">
              Schedule
            </Link>
            <Link to="/admin/events" className="text-muted-foreground hover:text-foreground transition-colors">
              All Events
            </Link>
            <Link to="/admin/companies" className="text-muted-foreground hover:text-foreground transition-colors">
              All Companies
            </Link>
          </div>
        </div>

        {/* Bulk Import Modal */}
        {showBulkImport && (
          <BulkImportModal
            eventId={nextEvent.id}
            onClose={() => setShowBulkImport(false)}
            onSuccess={() => {
              loadDashboardData();
            }}
          />
        )}
      </main>
    </div>
  );
}