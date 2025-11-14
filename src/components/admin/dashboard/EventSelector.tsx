
/**
 * Event type for selector
 */
export type EventOption = {
  id: string;
  name: string;
  date: string;
};

/**
 * EventSelector - Dropdown component for selecting events
 * 
 * Allows admins to switch between different events to view their statistics.
 * 
 * @component
 * @param events - Array of available events
 * @param selectedEventId - Currently selected event ID
 * @param onEventChange - Callback when event selection changes
 * 
 * @example
 * <EventSelector 
 *   events={events} 
 *   selectedEventId={selectedId} 
 *   onEventChange={setSelectedId} 
 * />
 */
export default function EventSelector({
  events,
  selectedEventId,
  onEventChange,
}: {
  events: EventOption[];
  selectedEventId: string | null;
  onEventChange: (eventId: string) => void;
}) {
  return (
    <div className="mb-6">
      <label htmlFor="event-select" className="block text-sm font-medium text-muted-foreground mb-2">
        Select Event
      </label>
      <select
        id="event-select"
        value={selectedEventId || ''}
        onChange={(e) => onEventChange(e.target.value)}
        className="w-full md:w-96 px-4 py-2 bg-card border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {events.map((event) => {
          const date = new Date(event.date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
          });
          return (
            <option key={event.id} value={event.id}>
              {event.name} - {date}
            </option>
          );
        })}
      </select>
    </div>
  );
}


