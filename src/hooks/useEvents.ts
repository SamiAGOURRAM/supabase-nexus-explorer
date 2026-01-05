import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  current_phase: number | null;
  phase1_max_bookings: number | null;
  phase2_max_bookings: number | null;
};

/**
 * Custom hook for loading and managing events
 * 
 * Fetches all events and automatically selects the closest upcoming event.
 * Uses React Query for caching and state management.
 * 
 * @returns Object with events array, selected event, loading state, and selection handler
 * 
 * @example
 * const { events, selectedEvent, selectedEventId, loading, setSelectedEventId } = useEvents();
 */
export function useEvents() {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const { data: events = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('id, name, date, location, current_phase, phase1_max_bookings, phase2_max_bookings')
        .order('date', { ascending: true });
      
      if (error) throw error;
      return data as Event[];
    },
    staleTime: 0, // Always consider data stale
    gcTime: 0, // Don't cache
    refetchOnMount: true, // Refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });

  // Automatically select the closest upcoming event when events are loaded
  useEffect(() => {
    if (events.length > 0 && !selectedEventId) {
      const upcomingEvent = getClosestUpcomingEvent(events);
      if (upcomingEvent) {
        setSelectedEventId(upcomingEvent.id);
      } else {
        // Fallback to first event if no upcoming event
        setSelectedEventId(events[0].id);
      }
    }
  }, [events, selectedEventId]);

  const selectedEvent = events.find(e => e.id === selectedEventId) || null;

  return {
    events,
    selectedEvent,
    selectedEventId,
    loading,
    setSelectedEventId,
    refetch,
  };
}



