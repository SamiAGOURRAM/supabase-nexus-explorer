import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useEmailVerification } from '@/hooks/useEmailVerification';
import { Calendar, Briefcase, User, LogOut, Book, AlertCircle, CheckCircle2 } from 'lucide-react';

type EventPhaseInfo = {
  eventId: string;
  eventName: string;
  eventDate: string;
  currentPhase: number;
  canBook: boolean;
  currentBookings: number;
  maxBookings: number;
  message: string;
};

export default function StudentDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ bookings: 0, offers: 0 });
  const [phaseInfo, setPhaseInfo] = useState<EventPhaseInfo | null>(null);
  const navigate = useNavigate();
  
  // Check email verification status
  const { isVerified, isLoading: verificationLoading } = useEmailVerification();

  useEffect(() => {
    // Don't load data until verification check is complete
    if (!verificationLoading) {
      checkStudentAndLoadData();
    }
  }, [verificationLoading]);

  const checkStudentAndLoadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/login');
      return;
    }
    
    // Double-check email verification
    if (!user.email_confirmed_at) {
      console.warn('⚠️ Unverified user detected, signing out...');
      await supabase.auth.signOut();
      navigate('/verify-email', {
        state: { email: user.email },
      });
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'student') {
      navigate('/offers');
      return;
    }

    const { count: bookingsCount } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', user.id)
      .eq('status', 'confirmed');

    const { count: offersCount } = await supabase
      .from('offers')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Get active event and phase info
    const { data: activeEvent } = await supabase
      .from('events')
      .select('id, name, date, current_phase, phase1_max_bookings, phase2_max_bookings')
      .gte('date', new Date().toISOString())
      .order('date', { ascending: true })
      .limit(1)
      .single();

    if (activeEvent) {
      const { data: limitCheck } = await supabase.rpc('fn_check_student_booking_limit', {
        p_student_id: user.id,
        p_event_id: activeEvent.id
      });

      if (limitCheck && limitCheck.length > 0) {
        const check = limitCheck[0];
        setPhaseInfo({
          eventId: activeEvent.id,
          eventName: activeEvent.name,
          eventDate: activeEvent.date,
          currentPhase: check.current_phase,
          canBook: check.can_book,
          currentBookings: check.current_count,
          maxBookings: check.max_allowed,
          message: check.message
        });
      }
    }

    setStats({ bookings: bookingsCount || 0, offers: offersCount || 0 });
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Student Dashboard</h1>
              <p className="text-sm text-muted-foreground mt-1">Welcome back!</p>
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
        {/* Phase Status Card */}
        {phaseInfo && (
          <div className={`rounded-xl border p-6 mb-6 ${
            phaseInfo.currentPhase === 0 
              ? 'bg-destructive/10 border-destructive/30' 
              : phaseInfo.canBook 
                ? 'bg-success/10 border-success/30' 
                : 'bg-warning/10 border-warning/30'
          }`}>
            <div className="flex items-start gap-4">
              {phaseInfo.currentPhase === 0 ? (
                <AlertCircle className="w-6 h-6 text-destructive flex-shrink-0 mt-1" />
              ) : phaseInfo.canBook ? (
                <CheckCircle2 className="w-6 h-6 text-success flex-shrink-0 mt-1" />
              ) : (
                <AlertCircle className="w-6 h-6 text-warning flex-shrink-0 mt-1" />
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">
                  {phaseInfo.eventName} - Phase {phaseInfo.currentPhase}
                </h3>
                <p className="text-sm text-muted-foreground mb-2">
                  {new Date(phaseInfo.eventDate).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </p>
                <div className="flex items-center gap-4 mb-2">
                  <span className="text-sm font-medium text-foreground">
                    Bookings: {phaseInfo.currentBookings}/{phaseInfo.maxBookings}
                  </span>
                  <div className="flex-1 max-w-xs bg-muted rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${
                        phaseInfo.currentBookings >= phaseInfo.maxBookings 
                          ? 'bg-destructive' 
                          : 'bg-success'
                      }`}
                      style={{ width: `${Math.min((phaseInfo.currentBookings / phaseInfo.maxBookings) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <p className="text-sm text-foreground">{phaseInfo.message}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-in">
          <Link to="/student/bookings" className="bg-card rounded-xl border border-border p-6 hover:border-primary hover:shadow-elegant transition-all">
            <Calendar className="w-8 h-8 text-primary mb-4" />
            <p className="text-3xl font-bold text-foreground mb-1">{stats.bookings}</p>
            <p className="text-sm text-muted-foreground">My Bookings</p>
          </Link>
          
          <Link to="/student/offers" className="bg-card rounded-xl border border-border p-6 hover:border-primary hover:shadow-elegant transition-all">
            <Briefcase className="w-8 h-8 text-success mb-4" />
            <p className="text-3xl font-bold text-foreground mb-1">{stats.offers}</p>
            <p className="text-sm text-muted-foreground">Available Offers</p>
          </Link>

          <Link to="/student/profile" className="bg-card rounded-xl border border-border p-6 hover:border-primary hover:shadow-elegant transition-all">
            <User className="w-8 h-8 text-warning mb-4" />
            <p className="text-sm font-medium text-foreground mb-1">My Profile</p>
            <p className="text-sm text-muted-foreground">View & edit</p>
          </Link>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link to="/student/offers" className="p-4 bg-primary/5 border border-primary/20 rounded-lg hover:bg-primary/10 transition-colors">
              <Book className="w-8 h-8 text-primary mb-2" />
              <h3 className="font-semibold text-foreground mb-1">Browse Offers</h3>
              <p className="text-sm text-muted-foreground">Explore available internship opportunities</p>
            </Link>
            <Link to="/student/bookings" className="p-4 bg-success/5 border border-success/20 rounded-lg hover:bg-success/10 transition-colors">
              <Calendar className="w-8 h-8 text-success mb-2" />
              <h3 className="font-semibold text-foreground mb-1">Manage Bookings</h3>
              <p className="text-sm text-muted-foreground">View and manage your interview slots</p>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}