import { formatDate } from '@/utils/dateUtils';

/**
 * CompanyEventSelector - Event selector for company dashboard
 * 
 * Allows companies to switch between different events they're participating in.
 * 
 * @component
 * @param events - Array of events the company is participating in
 * @param selectedEventId - Currently selected event ID
 * @param onEventChange - Callback when event selection changes
 * 
 * @example
 * <CompanyEventSelector 
 *   events={events} 
 *   selectedEventId={selectedId} 
 *   onEventChange={setSelectedId} 
 * />
 */
export default function CompanyEventSelector({
  events,
  selectedEventId,
  onEventChange,
}: {
  events: Array<{ id: string; name: string; date: string }>;
  selectedEventId: string;
  onEventChange: (eventId: string) => void;
}) {
  if (events.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20 p-6 mb-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-foreground mb-3">
            Select Event
          </label>
          <select
            value={selectedEventId}
            onChange={(e) => onEventChange(e.target.value)}
            className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name} - {formatDate(event.date, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}


