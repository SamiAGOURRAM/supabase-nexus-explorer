import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useEmailVerification } from '@/hooks/useEmailVerification';
import { useToast } from '@/contexts/ToastContext';
import { Calendar, Briefcase, User, LogOut, Book, AlertCircle, CheckCircle2, Building2 } from 'lucide-react';
import { warn, error as logError } from '@/utils/logger';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import LoadingScreen from '@/components/shared/LoadingScreen';

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
  const [error, setError] = useState<Error | null>(null);
  const [stats, setStats] = useState({ bookings: 0, offers: 0 });
  const [phaseInfo, setPhaseInfo] = useState<EventPhaseInfo | null>(null);
  const navigate = useNavigate();
  const { showError: showToastError } = useToast();
  
  // Check email verification status
  const { isLoading: verificationLoading } = useEmailVerification();

  useEffect(() => {
    // Don't load data until verification check is complete
    if (!verificationLoading) {
      checkStudentAndLoadData();
    }
  }, [verificationLoading]);

  const checkStudentAndLoadData = async () => {
    try {
      setError(null);
      setLoading(true);

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        navigate('/login');
        return;
      }
      
      // Double-check email verification
      if (!user.email_confirmed_at) {
        warn('Unverified user detected, signing out...');
        await supabase.auth.signOut();
        navigate('/verify-email', {
          state: { email: user.email },
        });
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        logError('Profile fetch error:', profileError);
        throw new Error('Failed to load profile. Please try again.');
      }

      if (!profile || profile.role !== 'student') {
        navigate('/offers');
        return;
      }

      // Fetch stats in parallel
      const [bookingsResult, offersResult, eventsResult] = await Promise.all([
        supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', user.id)
          .eq('status', 'confirmed'),
        supabase
          .from('offers')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true),
        supabase
          .from('events')
          .select('id, name, date, current_phase, phase1_max_bookings, phase2_max_bookings')
          .gte('date', new Date().toISOString())
          .order('date', { ascending: true })
          .limit(1)
          .maybeSingle()
      ]);

      if (bookingsResult.error) {
        logError('Bookings fetch error:', bookingsResult.error);
      }

      if (offersResult.error) {
        logError('Offers fetch error:', offersResult.error);
      }

      setStats({
        bookings: bookingsResult.count || 0,
        offers: offersResult.count || 0
      });

      // Get phase info if event exists
      if (eventsResult.data && !eventsResult.error) {
        const activeEvent = eventsResult.data;
        const { data: limitCheck, error: limitError } = await supabase.rpc('fn_check_student_booking_limit', {
          p_student_id: user.id,
          p_event_id: activeEvent.id
        });

        if (!limitError && limitCheck && limitCheck.length > 0) {
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
    } catch (err: any) {
      logError('Error loading dashboard:', err);
      const errorMessage = err instanceof Error ? err : new Error('Failed to load dashboard data');
      setError(errorMessage);
      showToastError('Failed to load dashboard. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (verificationLoading || loading) {
    return <LoadingScreen message="Loading dashboard..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <h1 className="text-2xl font-bold text-foreground">Student Dashboard</h1>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ErrorDisplay error={error} onRetry={checkStudentAndLoadData} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Student Dashboard</h1>
              <p className="text-sm text-muted-foreground mt-1">Welcome back!</p>
            </div>
            <div className="flex items-center gap-3 self-end md:self-auto">
              <Link
                to="/student/profile"
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground hover:bg-primary/10 rounded-lg transition-colors border border-border hover:border-primary"
              >
                <User className="w-4 h-4" />
                Profile
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link 
            to="/student/bookings" 
            className="bg-card rounded-xl border border-border p-6 hover:border-primary hover:shadow-elegant transition-all group"
          >
            <Calendar className="w-8 h-8 text-primary mb-4 group-hover:scale-110 transition-transform" />
            <p className="text-3xl font-bold text-foreground mb-1">{stats.bookings}</p>
            <p className="text-sm text-muted-foreground">My Bookings</p>
          </Link>
          
          <Link 
            to="/student/offers" 
            className="bg-card rounded-xl border border-border p-6 hover:border-primary hover:shadow-elegant transition-all group"
          >
            <Briefcase className="w-8 h-8 text-success mb-4 group-hover:scale-110 transition-transform" />
            <p className="text-3xl font-bold text-foreground mb-1">{stats.offers}</p>
            <p className="text-sm text-muted-foreground">Available Offers</p>
          </Link>

          <Link 
            to="/student/profile" 
            className="bg-card rounded-xl border border-border p-6 hover:border-primary hover:shadow-elegant transition-all group"
          >
            <User className="w-8 h-8 text-warning mb-4 group-hover:scale-110 transition-transform" />
            <p className="text-sm font-medium text-foreground mb-1">My Profile</p>
            <p className="text-sm text-muted-foreground">View & edit</p>
          </Link>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link to="/student/offers" className="p-4 bg-primary/5 border border-primary/20 rounded-lg hover:bg-primary/10 transition-colors">
              <Book className="w-8 h-8 text-primary mb-2" />
              <h3 className="font-semibold text-foreground mb-1">Browse Offers</h3>
              <p className="text-sm text-muted-foreground">Explore available internship opportunities</p>
            </Link>
            <Link to="/student/companies" className="p-4 bg-info/5 border border-info/20 rounded-lg hover:bg-info/10 transition-colors">
              <Building2 className="w-8 h-8 text-info mb-2" />
              <h3 className="font-semibold text-foreground mb-1">Browse Companies</h3>
              <p className="text-sm text-muted-foreground">View all verified companies</p>
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

