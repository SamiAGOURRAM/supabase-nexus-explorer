import { Link } from 'react-router-dom';
import { Calendar, Plus } from 'lucide-react';

/**
 * EmptyEventsState - Empty state when company has no events
 * 
 * Displays a message and call-to-action when the company is not
 * participating in any upcoming events.
 * 
 * @component
 * @example
 * <EmptyEventsState />
 */
export default function EmptyEventsState() {
  return (
    <div className="bg-card rounded-xl border border-border p-12 text-center animate-fade-in">
      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
        <Calendar className="w-10 h-10 text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">No Upcoming Events</h3>
      <p className="text-muted-foreground mb-6">
        You're not participating in any upcoming events yet. Create your first offer to get started!
      </p>
      <Link
        to="/company/offers"
        className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all font-medium hover:scale-105 active:scale-95"
      >
        <Plus className="w-4 h-4" />
        Create Your First Offer
      </Link>
    </div>
  );
}


