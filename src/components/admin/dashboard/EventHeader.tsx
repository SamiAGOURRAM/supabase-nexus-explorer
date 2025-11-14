import { Link } from 'react-router-dom';
import { Clock, Calendar, MapPin, UserPlus, Upload } from 'lucide-react';
import { formatDate } from '@/utils/dateUtils';

/**
 * EventHeader - Displays event information and quick actions
 * 
 * Shows event name, date, location, and provides quick action buttons
 * for inviting companies and bulk importing.
 * 
 * @component
 * @param event - Event object with name, date, and location
 * @param onBulkImportClick - Callback when bulk import button is clicked
 * 
 * @example
 * <EventHeader 
 *   event={selectedEvent} 
 *   onBulkImportClick={() => setShowBulkImport(true)} 
 * />
 */
export default function EventHeader({
  event,
  onBulkImportClick,
}: {
  event: {
    id: string;
    name: string;
    date: string;
    location: string | null;
  };
  onBulkImportClick: () => void;
}) {
  const formattedDate = formatDate(event.date);

  return (
    <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20 p-6 mb-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-primary mb-2">
            <Clock className="w-4 h-4" />
            <span className="font-medium">Selected Event</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">{event.name}</h2>
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{formattedDate}</span>
            </div>
            {event.location && (
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>{event.location}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          <Link
            to={`/admin/events/${event.id}/quick-invite`}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            <span>Quick Invite</span>
          </Link>
          <button
            onClick={onBulkImportClick}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>Bulk Import CSV</span>
          </button>
        </div>
      </div>
    </div>
  );
}


