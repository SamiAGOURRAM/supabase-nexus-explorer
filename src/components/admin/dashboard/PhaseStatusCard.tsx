import { Link } from 'react-router-dom';
import { AlertCircle, Settings } from 'lucide-react';
import { BOOKING_PHASES } from '@/utils/constants';

/**
 * PhaseStatusCard - Displays current booking phase status
 * 
 * Shows the current phase (Closed, Phase 1, or Phase 2) with appropriate
 * styling and booking limits. Includes link to manage phases.
 * 
 * @component
 * @param event - Event object with phase information
 * 
 * @example
 * <PhaseStatusCard event={selectedEvent} />
 */
export default function PhaseStatusCard({
  event,
}: {
  event: {
    id: string;
    current_phase: number;
    phase1_max_bookings: number;
    phase2_max_bookings: number;
  };
}) {
  const isClosed = event.current_phase === BOOKING_PHASES.CLOSED;

  return (
    <div className={`rounded-xl border p-6 mb-6 ${
      isClosed
        ? 'bg-destructive/10 border-destructive/30' 
        : 'bg-primary/10 border-primary/30'
    }`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {isClosed ? (
            <AlertCircle className="w-6 h-6 text-destructive flex-shrink-0 mt-1" />
          ) : (
            <Settings className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
          )}
          <div>
            <h3 className="font-semibold text-foreground mb-1">
              Booking Phase {event.current_phase}
              {event.current_phase === BOOKING_PHASES.CLOSED && ' - Bookings Closed'}
              {event.current_phase === BOOKING_PHASES.PHASE_1 && ' - Priority Phase'}
              {event.current_phase === BOOKING_PHASES.PHASE_2 && ' - Open Phase'}
            </h3>
            <p className="text-sm text-muted-foreground mb-2">
              {event.current_phase === BOOKING_PHASES.CLOSED && 'Students cannot book interviews yet'}
              {event.current_phase === BOOKING_PHASES.PHASE_1 && `Students can book up to ${event.phase1_max_bookings} interviews`}
              {event.current_phase === BOOKING_PHASES.PHASE_2 && `Students can book up to ${event.phase2_max_bookings} interviews`}
            </p>
          </div>
        </div>
        <Link
          to={`/admin/events/${event.id}/phases`}
          className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg hover:bg-accent transition-colors text-sm font-medium"
        >
          <Settings className="w-4 h-4" />
          Manage Phases
        </Link>
      </div>
    </div>
  );
}


