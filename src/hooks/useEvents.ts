import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getClosestUpcomingEvent } from '@/utils/dateUtils';

/**
 * Event type for the events list
 */
export type Event = {
  id: string;
  name: string;
  date: string;
  location: string | null;
  current_phase: number;
  phase1_max_bookings: number;
  phase2_max_bookings: number;
};

/**
 * Custom hook for loading and managing events
 * 
 * Fetches all events and automatically selects the closest upcoming event.
 * 
 * @returns Object with events array, selected event, loading state, and selection handler
 * 
 * @example
 * const { events, selectedEvent, selectedEventId, loading, setSelectedEventId } = useEvents();
 */
export function useEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const { data: allEvents } = await supabase
        .from('events')
        .select('id, name, date, location, current_phase, phase1_max_bookings, phase2_max_bookings')
        .order('date', { ascending: true });

      if (allEvents && allEvents.length > 0) {
        setEvents(allEvents);
        
        // Find the closest upcoming event
        const upcomingEvent = getClosestUpcomingEvent(allEvents);
        if (upcomingEvent) {
          setSelectedEventId(upcomingEvent.id);
        }
      }
    } catch (error) {
      console.error('Error loading events:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedEvent = events.find(e => e.id === selectedEventId) || null;

  return {
    events,
    selectedEvent,
    selectedEventId,
    loading,
    setSelectedEventId,
    refetch: loadEvents,
  };
}



