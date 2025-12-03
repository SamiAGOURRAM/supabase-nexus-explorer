import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useEmailVerification } from '@/hooks/useEmailVerification';
import { useToast } from '@/contexts/ToastContext';
import { Calendar, Briefcase, User, AlertCircle, CheckCircle2, Building2, ArrowRight, TrendingUp } from 'lucide-react';
import { warn, error as logError } from '@/utils/logger';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import LoadingScreen from '@/components/shared/LoadingScreen';
import StudentLayout from '@/components/student/StudentLayout';

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
  const [studentName, setStudentName] = useState('');
  const navigate = useNavigate();
  const { showError: showToastError } = useToast();
  
  // Check email verification status
  const { isLoading: verificationLoading } = useEmailVerification();

  useEffect(() => {
    // Reset loading and load data when component mounts or verification completes
    if (!verificationLoading) {
      setLoading(true);
      setError(null);
      checkStudentAndLoadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verificationLoading]);

  const checkStudentAndLoadData = async () => {
    try {
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
        .select('role, full_name')
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

      // Set student name
      setStudentName(profile.full_name || 'Student');

      // Fetch stats in parallelstill
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
      <StudentLayout onSignOut={handleSignOut}>
        <div className="p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <ErrorDisplay error={error} onRetry={checkStudentAndLoadData} />
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout onSignOut={handleSignOut}>
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#1a1f3a] via-[#2a3f5f] to-[#1a1f3a]">
          {/* Subtle Background Pattern */}
          <div className="absolute inset-0 opacity-[0.03]">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
                backgroundSize: "32px 32px",
              }}
            />
          </div>

          {/* Ambient Glow Effects */}
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#ffb300] rounded-full mix-blend-screen filter blur-3xl opacity-5" />
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[#007e40] rounded-full mix-blend-screen filter blur-3xl opacity-5" />

          <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-16 md:py-24">
            <div className="mb-12">
              <div className="inline-block mb-4">
                <div className="flex items-center gap-2 px-4 py-1.5 bg-white/5 backdrop-blur-sm rounded-full border border-white/10">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-sm text-white/80 font-medium">Active Session</span>
                </div>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-3 leading-tight">
                Welcome back, {studentName}
              </h1>
              <p className="text-lg text-white/70 max-w-2xl">
                Track your progress and discover new opportunities
              </p>
            </div>

            {/* Stats Grid - Cleaner Design */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { value: stats.bookings, label: "Interviews", icon: Calendar, color: "#ffb300" },
                { value: stats.offers, label: "Open Positions", icon: Briefcase, color: "#007e40" },
                { value: phaseInfo ? phaseInfo.currentPhase : 0, label: "Current Phase", icon: TrendingUp, color: "#60a5fa" },
                { value: phaseInfo ? phaseInfo.currentBookings : 0, label: "Applications", icon: CheckCircle2, color: "#10b981" },
              ].map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div key={index} className="group bg-white/[0.07] backdrop-blur-md rounded-2xl p-5 border border-white/10 hover:bg-white/[0.12] hover:border-white/20 transition-all duration-300">
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-2.5 rounded-xl bg-white/10 group-hover:bg-white/15 transition-colors">
                        <Icon className="w-5 h-5 text-white" strokeWidth={2.5} />
                      </div>
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: stat.color }} />
                    </div>
                    <div className="text-2xl font-bold text-white mb-1">
                      {stat.value}
                    </div>
                    <div className="text-xs text-white/60 font-medium uppercase tracking-wide">
                      {stat.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Smooth Bottom Edge */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </section>

        {/* Phase Status - Modern Card */}
        {phaseInfo && (
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 -mt-6 mb-12 relative z-20">
            <div className={`rounded-2xl p-6 shadow-lg border ${
              phaseInfo.currentPhase === 0 
                ? 'bg-white border-red-200' 
                : phaseInfo.canBook 
                  ? 'bg-white border-green-200' 
                  : 'bg-white border-amber-200'
            }`}>
              <div className="flex items-start gap-5">
                {phaseInfo.currentPhase === 0 ? (
                  <div className="flex-shrink-0 p-3 bg-red-50 rounded-xl">
                    <AlertCircle className="w-6 h-6 text-red-600" strokeWidth={2} />
                  </div>
                ) : phaseInfo.canBook ? (
                  <div className="flex-shrink-0 p-3 bg-green-50 rounded-xl">
                    <CheckCircle2 className="w-6 h-6 text-green-600" strokeWidth={2} />
                  </div>
                ) : (
                  <div className="flex-shrink-0 p-3 bg-amber-50 rounded-xl">
                    <AlertCircle className="w-6 h-6 text-amber-600" strokeWidth={2} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-2">
                    <h3 className="font-bold text-gray-900 text-lg">
                      {phaseInfo.eventName}
                    </h3>
                    <span className="text-sm font-semibold text-gray-500">
                      Phase {phaseInfo.currentPhase}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    {new Date(phaseInfo.eventDate).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-gray-600 font-medium">Booking Progress</span>
                      <span className="font-bold text-gray-900">
                        {phaseInfo.currentBookings} / {phaseInfo.maxBookings}
                      </span>
                    </div>
                    <div className="relative w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${
                          phaseInfo.currentBookings >= phaseInfo.maxBookings 
                            ? 'bg-red-500' 
                            : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min((phaseInfo.currentBookings / phaseInfo.maxBookings) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{phaseInfo.message}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content - Enhanced Cards */}
        <section className="py-12 bg-gray-50">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
            {/* Section Header */}
            <div className="mb-10">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Quick Actions</h2>
              <p className="text-gray-600">Everything you need to manage your internship search</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Browse Offers Card */}
              <Link 
                to="/student/offers"
                className="group relative bg-white rounded-2xl p-8 shadow-sm hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-[#ffb300]/30 overflow-hidden"
              >
                {/* Subtle Gradient Overlay on Hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-[#ffb300]/0 to-[#ffb300]/0 group-hover:from-[#ffb300]/5 group-hover:to-transparent transition-all duration-300" />
                
                <div className="relative">
                  <div className="flex items-start justify-between mb-6">
                    <div className="p-3.5 bg-gradient-to-br from-[#ffb300] to-[#e6a200] rounded-xl shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all duration-300">
                      <Briefcase className="w-7 h-7 text-white" strokeWidth={2} />
                    </div>
                    <div className="p-2 rounded-full bg-gray-50 group-hover:bg-[#ffb300]/10 transition-colors">
                      <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#ffb300] group-hover:translate-x-1 transition-all duration-300" strokeWidth={2.5} />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-[#ffb300] transition-colors">
                    Browse Offers
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">
                    Explore {stats.offers} internship opportunities from leading hospitality companies
                  </p>
                  <div className="flex items-center text-sm font-semibold text-[#ffb300]">
                    <span>View opportunities</span>
                  </div>
                </div>
              </Link>

              {/* Companies Card */}
              <Link 
                to="/student/companies"
                className="group relative bg-white rounded-2xl p-8 shadow-sm hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-[#007e40]/30 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#007e40]/0 to-[#007e40]/0 group-hover:from-[#007e40]/5 group-hover:to-transparent transition-all duration-300" />
                
                <div className="relative">
                  <div className="flex items-start justify-between mb-6">
                    <div className="p-3.5 bg-gradient-to-br from-[#007e40] to-[#006633] rounded-xl shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all duration-300">
                      <Building2 className="w-7 h-7 text-white" strokeWidth={2} />
                    </div>
                    <div className="p-2 rounded-full bg-gray-50 group-hover:bg-[#007e40]/10 transition-colors">
                      <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#007e40] group-hover:translate-x-1 transition-all duration-300" strokeWidth={2.5} />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-[#007e40] transition-colors">
                    Explore Companies
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">
                    Discover profiles and open positions from top hospitality brands
                  </p>
                  <div className="flex items-center text-sm font-semibold text-[#007e40]">
                    <span>Browse companies</span>
                  </div>
                </div>
              </Link>

              {/* Bookings Card */}
              <Link 
                to="/student/bookings"
                className="group relative bg-white rounded-2xl p-8 shadow-sm hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-blue-300 overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-blue-500/0 group-hover:from-blue-500/5 group-hover:to-transparent transition-all duration-300" />
                
                <div className="relative">
                  <div className="flex items-start justify-between mb-6">
                    <div className="p-3.5 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all duration-300">
                      <Calendar className="w-7 h-7 text-white" strokeWidth={2} />
                    </div>
                    <div className="p-2 rounded-full bg-gray-50 group-hover:bg-blue-50 transition-colors">
                      <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all duration-300" strokeWidth={2.5} />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                    My Bookings
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">
                    Manage your {stats.bookings} scheduled {stats.bookings === 1 ? 'interview' : 'interviews'} and upcoming meetings
                  </p>
                  <div className="flex items-center text-sm font-semibold text-blue-600">
                    <span>View schedule</span>
                  </div>
                </div>
              </Link>
            </div>

            {/* Profile CTA - Refined */}
            <div className="mt-12 relative bg-gradient-to-br from-[#1a1f3a] via-[#2a3f5f] to-[#1a1f3a] rounded-2xl p-10 overflow-hidden shadow-xl">
              {/* Subtle Ambient Light */}
              <div className="absolute top-0 right-0 w-72 h-72 bg-[#ffb300] rounded-full mix-blend-screen filter blur-3xl opacity-5" />
              <div className="absolute bottom-0 left-0 w-72 h-72 bg-[#007e40] rounded-full mix-blend-screen filter blur-3xl opacity-5" />
              
              <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="flex items-start gap-5">
                  <div className="p-4 bg-white/10 rounded-xl backdrop-blur-sm">
                    <User className="w-8 h-8 text-white" strokeWidth={2} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">
                      Complete Your Profile
                    </h3>
                    <p className="text-white/70 text-sm max-w-xl">
                      Stand out to recruiters with a complete profile showcasing your skills and experience
                    </p>
                  </div>
                </div>
                <Link 
                  to="/student/profile"
                  className="inline-flex items-center gap-2.5 px-7 py-3.5 bg-white text-gray-900 rounded-xl hover:bg-gray-50 transition-all font-semibold whitespace-nowrap shadow-lg hover:shadow-xl hover:scale-105 duration-300"
                >
                  <span>Update Profile</span>
                  <ArrowRight size={18} strokeWidth={2.5} />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </StudentLayout>
  );
}

