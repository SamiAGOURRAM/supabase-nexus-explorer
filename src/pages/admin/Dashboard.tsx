import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useEvents } from '@/hooks/useEvents';
import { useEventStats } from '@/hooks/useEventStats';
import LoadingScreen from '@/components/shared/LoadingScreen';
import LoadingCard from '@/components/shared/LoadingCard';
import AdminLayout from '@/components/admin/AdminLayout';
import EmptyState from '@/components/admin/dashboard/EmptyState';
import EventSelector from '@/components/admin/dashboard/EventSelector';
import PhaseStatusCard from '@/components/admin/dashboard/PhaseStatusCard';
import StatsGrid from '@/components/admin/dashboard/StatsGrid';
import BulkImportModal from '@/components/admin/BulkImportModal';
import { Users, Target, Clock, Calendar } from 'lucide-react';

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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <LoadingCard key={i} />
              ))}
            </div>
          ) : (
            <StatsGrid stats={stats} eventId={selectedEvent.id} />
          )}

          {/* Event Management Actions */}
          <div className="bg-card rounded-xl border border-border p-4 md:p-6">
            <h2 className="text-lg md:text-xl font-semibold text-foreground mb-4">Event Management</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
              <Link
                to={`/admin/events/${selectedEvent.id}/quick-invite`}
                className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 px-3 md:px-4 py-2.5 md:py-3 bg-primary/5 border border-primary/20 rounded-lg hover:bg-primary/10 transition-colors group"
              >
                <Users className="w-4 h-4 md:w-5 md:h-5 text-primary flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-foreground text-center sm:text-left">Quick Invite</span>
              </Link>
              <Link
                to={`/admin/events/${selectedEvent.id}/phases`}
                className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 px-3 md:px-4 py-2.5 md:py-3 bg-info/5 border border-info/20 rounded-lg hover:bg-info/10 transition-colors"
              >
                <Target className="w-4 h-4 md:w-5 md:h-5 text-info flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-foreground text-center sm:text-left">Phases</span>
              </Link>
              <Link
                to={`/admin/events/${selectedEvent.id}/sessions`}
                className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 px-3 md:px-4 py-2.5 md:py-3 bg-success/5 border border-success/20 rounded-lg hover:bg-success/10 transition-colors"
              >
                <Clock className="w-4 h-4 md:w-5 md:h-5 text-success flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-foreground text-center sm:text-left">Sessions</span>
              </Link>
              <Link
                to={`/admin/events/${selectedEvent.id}/schedule`}
                className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 px-3 md:px-4 py-2.5 md:py-3 bg-warning/5 border border-warning/20 rounded-lg hover:bg-warning/10 transition-colors"
              >
                <Calendar className="w-4 h-4 md:w-5 md:h-5 text-warning flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-foreground text-center sm:text-left">Schedule</span>
              </Link>
              <Link
                to={`/admin/events/${selectedEvent.id}/slots`}
                className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 px-3 md:px-4 py-2.5 md:py-3 bg-accent/5 border border-accent/20 rounded-lg hover:bg-accent/10 transition-colors"
              >
                <Clock className="w-4 h-4 md:w-5 md:h-5 text-accent flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-foreground text-center sm:text-left">Slots</span>
              </Link>
              <Link
                to={`/admin/companies?eventId=${selectedEvent.id}`}
                className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 px-3 md:px-4 py-2.5 md:py-3 bg-success/5 border border-success/20 rounded-lg hover:bg-success/10 transition-colors"
              >
                <Users className="w-4 h-4 md:w-5 md:h-5 text-success flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-foreground text-center sm:text-left">Companies</span>
              </Link>
              <Link
                to={`/admin/students?eventId=${selectedEvent.id}`}
                className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 px-3 md:px-4 py-2.5 md:py-3 bg-primary/5 border border-primary/20 rounded-lg hover:bg-primary/10 transition-colors"
              >
                <Users className="w-4 h-4 md:w-5 md:h-5 text-primary flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-foreground text-center sm:text-left">Students</span>
              </Link>
              <Link
                to={`/admin/events/${selectedEvent.id}/participants`}
                className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 px-3 md:px-4 py-2.5 md:py-3 bg-orange-500/5 border border-orange-500/20 rounded-lg hover:bg-orange-500/10 transition-colors"
              >
                <Users className="w-4 h-4 md:w-5 md:h-5 text-orange-500 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium text-foreground text-center sm:text-left">Participants</span>
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
