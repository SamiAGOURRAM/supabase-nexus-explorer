import { Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';

/**
 * EmptyState - Empty state component when no events exist
 * 
 * Displays a message and call-to-action when there are no events
 * available for the admin dashboard.
 * 
 * @component
 * @example
 * <EmptyState />
 */
export default function EmptyState() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
      <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
      <h2 className="text-xl font-semibold mb-2">No Upcoming Events</h2>
      <p className="text-muted-foreground mb-6">Create your first event to get started</p>
      <Link
        to="/admin/events"
        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
      >
        <Calendar className="w-5 h-5" />
        Manage Events
      </Link>
    </main>
  );
}



