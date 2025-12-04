import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useCompanyEvents } from '@/hooks/useCompanyEvents';
import { useCompanyStats } from '@/hooks/useCompanyStats';
import { useToast } from '@/contexts/ToastContext';
import { Briefcase, Calendar, Users, TrendingUp } from 'lucide-react';
import LoadingScreen from '@/components/shared/LoadingScreen';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import CompanyLayout from '@/components/company/CompanyLayout';
import ScheduledStudentsList from '@/components/company/dashboard/ScheduledStudentsList';
import EmptyEventsState from '@/components/company/dashboard/EmptyEventsState';
import LoadingCard from '@/components/shared/LoadingCard';

/**
 * CompanyDashboard - Main dashboard page for companies
 * 
 * Displays company statistics, scheduled interviews, and event information.
 * Allows companies to manage their recruitment activities.
 * 
 * Features:
 * - Event selection and statistics
 * - Offer and slot management
 * - Scheduled students list
 * - Utilization metrics
 * 
 * @component
 * @example
 * <CompanyDashboard />
 */
export default function CompanyDashboard() {
  const { user, loading: authLoading, signOut } = useAuth('company');
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { showError } = useToast();

  const { events, loading: eventsLoading } = useCompanyEvents(companyId);
  const { stats, scheduledStudents, loading: statsLoading } = useCompanyStats(companyId, selectedEventId);

  // Load company ID
  useEffect(() => {
    const loadCompany = async () => {
      if (!user) return;

      try {
        setError(null);
        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select('id, company_name')
          .eq('profile_id', user.id)
          .maybeSingle();

        if (companyError) {
          throw new Error(`Failed to load company: ${companyError.message}`);
        }

        if (company) {
          setCompanyId(company.id);
        } else {
          throw new Error('Company profile not found. Please contact support.');
        }
      } catch (err: any) {
        console.error('Error loading company:', err);
        const errorMessage = err instanceof Error ? err : new Error('Failed to load company information');
        setError(errorMessage);
        showError('Failed to load company information. Please try again.');
      } finally {
        setLoadingCompany(false);
      }
    };

    if (user) {
      loadCompany();
    }
  }, [user, showError]);

  // Set first event as selected when events load
  useEffect(() => {
    if (events.length > 0 && !selectedEventId) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);

  // Show loading screen while checking auth or loading company
  if (authLoading || loadingCompany || eventsLoading) {
    return <LoadingScreen message="Loading dashboard..." />;
  }

  return (
    <CompanyLayout onSignOut={signOut}>
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <section className="bg-[#1a1f3a] border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-12">
            <h1 className="text-3xl font-bold text-white mb-2">
              {stats?.company_name || 'Company Dashboard'}
            </h1>
            <p className="text-white/70">
              Manage your recruitment activities and track your interviews
            </p>

            {/* Stats Grid */}
            {stats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <Briefcase className="w-5 h-5 text-gray-600" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {stats.event_offers}
                  </div>
                  <div className="text-sm text-gray-600">
                    Event Offers
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <Calendar className="w-5 h-5 text-gray-600" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {stats.total_slots}
                  </div>
                  <div className="text-sm text-gray-600">
                    Total Slots
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <Users className="w-5 h-5 text-gray-600" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {stats.students_scheduled}
                  </div>
                  <div className="text-sm text-gray-600">
                    Students Booked
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-gray-600" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {stats.utilization_rate}%
                  </div>
                  <div className="text-sm text-gray-600">
                    Utilization
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Main Content */}
        <section className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8">
          {events.length === 0 ? (
            <EmptyEventsState />
          ) : (
            <>
              {/* Event Selector */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
                <label className="block text-sm font-medium text-gray-900 mb-3">
                  Select Event
                </label>
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#007e40] focus:border-[#007e40]"
                >
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name} - {new Date(event.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </option>
                  ))}
                </select>
              </div>

              {error ? (
                <ErrorDisplay error={error} onRetry={() => {
                  const loadCompany = async () => {
                    if (!user) return;
                    setError(null);
                    setLoadingCompany(true);
                    try {
                      const { data: company, error: companyError } = await supabase
                        .from('companies')
                        .select('id, company_name')
                        .eq('profile_id', user.id)
                        .maybeSingle();
                      if (companyError) throw companyError;
                      if (company) setCompanyId(company.id);
                    } catch (err: any) {
                      setError(err instanceof Error ? err : new Error('Failed to load company'));
                    } finally {
                      setLoadingCompany(false);
                    }
                  };
                  loadCompany();
                }} />
              ) : statsLoading ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map((i) => (
                      <LoadingCard key={i} />
                    ))}
                  </div>
                  <SkeletonLoader type="list" count={3} />
                </div>
              ) : (
                <ScheduledStudentsList students={scheduledStudents} />
              )}
            </>
          )}
        </section>
      </div>
    </CompanyLayout>
  );
}
