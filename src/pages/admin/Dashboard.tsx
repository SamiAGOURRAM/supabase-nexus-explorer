import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEvents } from '@/hooks/useEvents';
import { useEventStats } from '@/hooks/useEventStats';
import LoadingScreen from '@/components/shared/LoadingScreen';
import AdminLayout from '@/components/admin/AdminLayout';
import EmptyState from '@/components/admin/dashboard/EmptyState';
import EventSelector from '@/components/admin/dashboard/EventSelector';
import PhaseStatusCard from '@/components/admin/dashboard/PhaseStatusCard';
import StatsGrid from '@/components/admin/dashboard/StatsGrid';
import BulkImportModal from '@/components/admin/BulkImportModal';

/**
 * AdminDashboard - Main dashboard page for administrators
 * 
 * Displays event statistics, phase status, and quick actions.
 * Allows admins to manage events, companies, and bookings.
 * 
 * Features:
 * - Event selection and statistics
 * - Phase management overview
 * - Quick actions (invite companies, bulk import)
 * - Real-time event metrics
 * 
 * @component
 * @example
 * <AdminDashboard />
 */
export default function AdminDashboard() {
  const { loading: authLoading, signOut } = useAuth('admin');
  const { events, selectedEvent, selectedEventId, loading: eventsLoading, setSelectedEventId } = useEvents();
  const { stats, loading: statsLoading, refetch: refetchStats } = useEventStats(selectedEventId);
  const [showBulkImport, setShowBulkImport] = useState(false);

  // Show loading screen while checking auth or loading events
  if (authLoading || eventsLoading) {
    return <LoadingScreen message="Loading dashboard..." />;
  }

  // Show empty state if no events
  if (!selectedEvent) {
    return (
      <AdminLayout onSignOut={signOut}>
        <div className="p-8">
          <EmptyState />
        </div>
      </AdminLayout>
    );
  }

  const handleBulkImportSuccess = () => {
    setShowBulkImport(false);
    if (selectedEventId) {
      refetchStats();
    }
  };

  return (
    <AdminLayout onSignOut={signOut}>
      <div className="p-6 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <EventSelector
            events={events}
            selectedEventId={selectedEventId}
            onEventChange={setSelectedEventId}
          />

          <PhaseStatusCard event={selectedEvent} />

          {statsLoading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-[3px] border-primary border-t-transparent mx-auto"></div>
              <p className="mt-4 text-muted-foreground font-medium">Loading statistics...</p>
            </div>
          ) : (
            <StatsGrid stats={stats} eventId={selectedEvent.id} />
          )}

          {/* Footer Navigation */}
          <div className="pt-6 border-t border-border">
            <div className="flex flex-wrap gap-4 justify-center text-sm">
              <Link to={`/admin/events/${selectedEvent.id}/sessions`} className="text-muted-foreground hover:text-primary transition-colors duration-200 font-medium">
                Sessions
              </Link>
              <Link to={`/admin/events/${selectedEvent.id}/phases`} className="text-muted-foreground hover:text-primary transition-colors duration-200 font-medium">
                Phases
              </Link>
              <Link to={`/admin/events/${selectedEvent.id}/schedule`} className="text-muted-foreground hover:text-primary transition-colors duration-200 font-medium">
                Schedule
              </Link>
              <Link to="/admin/events" className="text-muted-foreground hover:text-primary transition-colors duration-200 font-medium">
                All Events
              </Link>
              <Link to="/admin/companies" className="text-muted-foreground hover:text-primary transition-colors duration-200 font-medium">
                All Companies
              </Link>
            </div>
          </div>

        {/* Bulk Import Modal */}
        {showBulkImport && selectedEvent && (
          <BulkImportModal
            eventId={selectedEvent.id}
            onClose={() => setShowBulkImport(false)}
            onSuccess={handleBulkImportSuccess}
          />
        )}
        </div>
      </div>
    </AdminLayout>
  );
}
