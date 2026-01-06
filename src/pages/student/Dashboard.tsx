import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { Calendar, Briefcase, User, AlertCircle, CheckCircle2, Building2, ArrowRight, TrendingUp, AlertTriangle } from 'lucide-react';
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

type ProfileCompleteness = {
  isComplete: boolean;
  missingFields: string[];
};

export default function StudentDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [stats, setStats] = useState({ bookings: 0, offers: 0 });
  const [phaseInfo, setPhaseInfo] = useState<EventPhaseInfo | null>(null);
  const [studentName, setStudentName] = useState('');
  const [profileCompleteness, setProfileCompleteness] = useState<ProfileCompleteness>({ isComplete: true, missingFields: [] });
  const navigate = useNavigate();
  const { showError: showToastError } = useToast();

  useEffect(() => {
    checkStudentAndLoadData();
  }, []);

  const checkStudentAndLoadData = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        setLoading(false);
        navigate('/login');
        return;
      }
      
      // Double-check email verification
      if (!user.email_confirmed_at) {
        warn('Unverified user detected, signing out...');
        await supabase.auth.signOut();
        setLoading(false);
        navigate('/verify-email', {
          state: { email: user.email },
        });
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, full_name, phone, student_number, specialization, graduation_year, program, profile_photo_url, linkedin_url')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        logError('Profile fetch error:', profileError);
        throw new Error('Failed to load profile. Please try again.');
      }

      if (!profile || profile.role !== 'student') {
        setLoading(false);
        navigate('/offers');
        return;
      }

      // Set student name
      setStudentName(profile.full_name || 'Student');

      // Check profile completeness
      const missingFields: string[] = [];
      if (!profile.phone) missingFields.push('Phone Number');
      if (!profile.student_number) missingFields.push('Student Number');
      if (!profile.specialization) missingFields.push('Specialization');
      if (!profile.graduation_year) missingFields.push('Graduation Year');
      if (!profile.program) missingFields.push('Program');
      if (!profile.profile_photo_url) missingFields.push('Profile Photo');
      if (!profile.linkedin_url) missingFields.push('LinkedIn Profile');

      setProfileCompleteness({
        isComplete: missingFields.length === 0,
        missingFields
      });

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

  if (loading) {
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
        <section className="bg-[#1a1f3a] border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-12">
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome back, {studentName}
            </h1>
            <p className="text-white/70">
              Track your progress and discover new opportunities
            </p>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
              {[
                { value: stats.bookings, label: "Interviews", icon: Calendar },
                { value: stats.offers, label: "Open Positions", icon: Briefcase },
                { value: phaseInfo ? phaseInfo.currentPhase : 0, label: "Current Phase", icon: TrendingUp },
              ].map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div key={index} className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-gray-50 rounded-lg">
                        <Icon className="w-5 h-5 text-gray-600" />
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 mb-1">
                      {stat.value}
                    </div>
                    <div className="text-sm text-gray-600">
                      {stat.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Profile Incomplete Alert */}
        {!profileCompleteness.isComplete && (
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 pt-8">
            <div className="bg-amber-50 border-l-4 border-amber-500 rounded-lg p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-amber-900 mb-2">
                    Complete Your Profile
                  </h3>
                  <p className="text-amber-800 text-sm mb-3">
                    Your profile is incomplete. Complete your profile to stand out to recruiters and unlock all features.
                  </p>
                  <div className="mb-4">
                    <p className="text-sm font-semibold text-amber-900 mb-2">Missing information:</p>
                    <ul className="list-disc list-inside text-sm text-amber-800 space-y-1">
                      {profileCompleteness.missingFields.map((field, index) => (
                        <li key={index}>{field}</li>
                      ))}
                    </ul>
                  </div>
                  <Link 
                    to="/student/profile"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors font-medium text-sm"
                  >
                    <User className="w-4 h-4" />
                    <span>Complete Profile Now</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Phase Status */}
        {phaseInfo && (
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8">
            <div className={`rounded-lg p-6 border bg-white ${
              phaseInfo.currentPhase === 0 
                ? 'border-red-200' 
                : phaseInfo.canBook 
                  ? 'border-green-200' 
                  : 'border-amber-200'
            }`}>
              <div className="flex items-start gap-4">
                {phaseInfo.currentPhase === 0 ? (
                  <div className="p-2 bg-red-50 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  </div>
                ) : phaseInfo.canBook ? (
                  <div className="p-2 bg-green-50 rounded-lg">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  </div>
                ) : (
                  <div className="p-2 bg-amber-50 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex items-baseline gap-2 mb-1">
                    <h3 className="font-bold text-gray-900">
                      {phaseInfo.eventName}
                    </h3>
                    <span className="text-sm text-gray-600">
                      Phase {phaseInfo.currentPhase}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    {new Date(phaseInfo.eventDate).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-600">Booking Progress</span>
                      <span className="font-semibold text-gray-900">
                        {phaseInfo.currentBookings} / {phaseInfo.maxBookings}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div 
                        className={`h-full rounded-full ${
                          phaseInfo.currentBookings >= phaseInfo.maxBookings 
                            ? 'bg-red-500' 
                            : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min((phaseInfo.currentBookings / phaseInfo.maxBookings) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-sm text-gray-700">{phaseInfo.message}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <section className="py-8 bg-gray-50">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-1">Quick Actions</h2>
              <p className="text-gray-600">Everything you need to manage your internship search</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Browse Offers Card */}
              <Link 
                to="/student/offers"
                className="bg-white rounded-lg p-6 border border-gray-200 hover:border-[#ffb300] hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 bg-[#ffb300] rounded-lg">
                    <Briefcase className="w-6 h-6 text-white" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Browse Offers
                </h3>
                <p className="text-gray-600 text-sm mb-3">
                  Explore {stats.offers} internship opportunities from leading hospitality companies
                </p>
                <div className="text-sm font-semibold text-[#ffb300]">
                  View opportunities →
                </div>
              </Link>

              {/* Companies Card */}
              <Link 
                to="/student/companies"
                className="bg-white rounded-lg p-6 border border-gray-200 hover:border-[#007e40] hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 bg-[#007e40] rounded-lg">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Explore Companies
                </h3>
                <p className="text-gray-600 text-sm mb-3">
                  Discover profiles and open positions from top hospitality brands
                </p>
                <div className="text-sm font-semibold text-[#007e40]">
                  Browse companies →
                </div>
              </Link>

              {/* Bookings Card */}
              <Link 
                to="/student/bookings"
                className="bg-white rounded-lg p-6 border border-gray-200 hover:border-blue-600 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="p-2 bg-blue-600 rounded-lg">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  My Bookings
                </h3>
                <p className="text-gray-600 text-sm mb-3">
                  Manage your {stats.bookings} scheduled {stats.bookings === 1 ? 'interview' : 'interviews'} and upcoming meetings
                </p>
                <div className="text-sm font-semibold text-blue-600">
                  View schedule →
                </div>
              </Link>
            </div>

            {/* Profile CTA */}
            <div className="mt-8 bg-[#1a1f3a] rounded-lg p-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-white/10 rounded-lg">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white mb-1">
                      Complete Your Profile
                    </h3>
                    <p className="text-white/70 text-sm">
                      Stand out to recruiters with a complete profile showcasing your skills and experience
                    </p>
                  </div>
                </div>
                <Link 
                  to="/student/profile"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-all font-semibold"
                >
                  <span>Update Profile</span>
                  <ArrowRight size={18} />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </StudentLayout>
  );
}

