import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useCompanyEvents } from '@/hooks/useCompanyEvents';
import { useCompanyStats } from '@/hooks/useCompanyStats';
import LoadingScreen from '@/components/shared/LoadingScreen';
import CompanyHeader from '@/components/company/dashboard/CompanyHeader';
import CompanyEventSelector from '@/components/company/dashboard/CompanyEventSelector';
import CompanyStatsGrid from '@/components/company/dashboard/CompanyStatsGrid';
import ScheduledStudentsList from '@/components/company/dashboard/ScheduledStudentsList';
import EmptyEventsState from '@/components/company/dashboard/EmptyEventsState';

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

  const { events, loading: eventsLoading } = useCompanyEvents(companyId);
  const { stats, scheduledStudents, loading: statsLoading } = useCompanyStats(companyId, selectedEventId);

  // Load company ID
  useEffect(() => {
    const loadCompany = async () => {
      if (!user) return;

      try {
        const { data: company } = await supabase
          .from('companies')
          .select('id, company_name')
          .eq('profile_id', user.id)
          .single();

        if (company) {
          setCompanyId(company.id);
        }
      } catch (error) {
        console.error('Error loading company:', error);
      } finally {
        setLoadingCompany(false);
      }
    };

    if (user) {
      loadCompany();
    }
  }, [user]);

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
    <div className="min-h-screen bg-background">
      <CompanyHeader 
        companyName={stats?.company_name || null} 
        onSignOut={signOut} 
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {events.length === 0 ? (
          <EmptyEventsState />
        ) : (
          <>
            <CompanyEventSelector
              events={events}
              selectedEventId={selectedEventId}
              onEventChange={setSelectedEventId}
            />

            {statsLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading statistics...</p>
              </div>
            ) : (
              <>
                <CompanyStatsGrid stats={stats} />
                <ScheduledStudentsList students={scheduledStudents} />
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
