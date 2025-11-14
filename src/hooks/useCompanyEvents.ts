import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { extractNestedObject } from '@/utils/supabaseTypes';

/**
 * Event type for company events
 */
export type CompanyEvent = {
  id: string;
  name: string;
  date: string;
  location: string | null;
};

/**
 * Custom hook for loading company's participating events
 * 
 * Fetches all events that a company is participating in.
 * 
 * @param companyId - The company ID
 * @returns Object with events array, loading state, and refetch function
 * 
 * @example
 * const { events, loading, refetch } = useCompanyEvents(companyId);
 */
export function useCompanyEvents(companyId: string | null) {
  const [events, setEvents] = useState<CompanyEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEvents = async () => {
    if (!companyId) {
      setLoading(false);
      return;
    }

    try {
      // Fetch event participations with nested event data
      // Supabase returns nested objects that need type extraction
      const { data: participations } = await supabase
        .from('event_participants')
        .select('events(id, name, date, location)')
        .eq('company_id', companyId)
        .gte('events.date', new Date().toISOString());

      // Extract and validate nested event objects from Supabase query
      // Filter out null values and sort by date
      const participatingEvents: CompanyEvent[] = (participations || [])
        .map(p => extractNestedObject<CompanyEvent>(p.events))
        .filter((event): event is CompanyEvent => event !== null)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      setEvents(participatingEvents);
    } catch (error) {
      console.error('Error loading company events:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [companyId]);

  return { events, loading, refetch: loadEvents };
}


