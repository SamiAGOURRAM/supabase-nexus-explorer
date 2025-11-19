import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useCompanyEvents } from '@/hooks/useCompanyEvents';
import { useCompanyStats } from '@/hooks/useCompanyStats';
import { useToast } from '@/contexts/ToastContext';
import LoadingScreen from '@/components/shared/LoadingScreen';
import SkeletonLoader from '@/components/shared/SkeletonLoader';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import CompanyLayout from '@/components/company/CompanyLayout';
import CompanyEventSelector from '@/components/company/dashboard/CompanyEventSelector';
import CompanyStatsGrid from '@/components/company/dashboard/CompanyStatsGrid';
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
      <div className="p-4 sm:p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">{stats?.company_name || 'Company Dashboard'}</h1>
            <p className="text-muted-foreground">Manage your recruitment activities</p>
          </div>


        {events.length === 0 ? (
          <EmptyEventsState />
        ) : (
          <>
            <CompanyEventSelector
              events={events}
              selectedEventId={selectedEventId}
              onEventChange={setSelectedEventId}
            />

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
              <>
                <CompanyStatsGrid stats={stats} />
                <ScheduledStudentsList students={scheduledStudents} />
              </>
            )}
          </>
        )}

        </div>
      </div>
    </CompanyLayout>
  );
}
