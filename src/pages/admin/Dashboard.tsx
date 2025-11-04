import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Calendar, Building2, Users, Briefcase, LogOut, BarChart3 } from 'lucide-react';

type DashboardStats = {
  total_events: number;
  upcoming_events: number;
  total_companies: number;
  total_participants: number;
  total_bookings: number;
  total_students: number;
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);

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

    const [
      { count: totalEvents },
      { count: upcomingEventsCount },
      { count: totalCompanies },
      { count: totalParticipants },
      { count: totalBookings },
      { count: totalStudents }
    ] = await Promise.all([
      supabase.from('events').select('*', { count: 'exact', head: true }),
      supabase.from('events').select('*', { count: 'exact', head: true }).gte('date', today),
      supabase.from('companies').select('*', { count: 'exact', head: true }),
      supabase.from('event_participants').select('*', { count: 'exact', head: true }),
      supabase.from('interview_bookings').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student')
    ]);

    setStats({
      total_events: totalEvents || 0,
      upcoming_events: upcomingEventsCount || 0,
      total_companies: totalCompanies || 0,
      total_participants: totalParticipants || 0,
      total_bookings: totalBookings || 0,
      total_students: totalStudents || 0
    });
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

  const statCards = [
    {
      title: 'Upcoming Events',
      value: stats?.upcoming_events || 0,
      subtitle: `${stats?.total_events || 0} total`,
      icon: Calendar,
      color: 'blue',
      link: '/admin/events'
    },
    {
      title: 'Companies',
      value: stats?.total_companies || 0,
      subtitle: `${stats?.total_participants || 0} participants`,
      icon: Building2,
      color: 'green',
      link: '/admin/companies'
    },
    {
      title: 'Students',
      value: stats?.total_students || 0,
      subtitle: 'registered',
      icon: Users,
      color: 'purple',
      link: '#'
    },
    {
      title: 'Bookings',
      value: stats?.total_bookings || 0,
      subtitle: 'total interviews',
      icon: Briefcase,
      color: 'orange',
      link: '#'
    }
  ];

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
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-in">
          {statCards.map((stat, index) => (
            <Link
              key={index}
              to={stat.link}
              className="bg-card rounded-xl border border-border p-6 hover:border-primary hover:shadow-elegant transition-all duration-200 group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors`}>
                  <stat.icon className="w-6 h-6 text-primary" />
                </div>
                <BarChart3 className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground mb-1">{stat.value}</p>
                <p className="text-sm font-medium text-foreground mb-1">{stat.title}</p>
                <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              to="/admin/events"
              className="p-4 bg-primary/5 border border-primary/20 rounded-lg hover:bg-primary/10 transition-colors group"
            >
              <Calendar className="w-8 h-8 text-primary mb-2" />
              <h3 className="font-semibold text-foreground mb-1">Manage Events</h3>
              <p className="text-sm text-muted-foreground">Create and manage speed recruiting events</p>
            </Link>
            <Link
              to="/admin/companies"
              className="p-4 bg-success/5 border border-success/20 rounded-lg hover:bg-success/10 transition-colors group"
            >
              <Building2 className="w-8 h-8 text-success mb-2" />
              <h3 className="font-semibold text-foreground mb-1">View Companies</h3>
              <p className="text-sm text-muted-foreground">Browse all invited companies</p>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}