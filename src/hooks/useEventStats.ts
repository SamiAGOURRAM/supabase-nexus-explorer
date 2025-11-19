import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Event statistics data structure
 */
export type EventStats = {
  event_companies: number;
  event_students: number;
  event_bookings: number;
  total_students: number;
  total_slots: number;
  available_slots: number;
  top_company_name: string;
  top_company_bookings: number;
};

/**
 * Custom hook for fetching event statistics
 * 
 * Loads comprehensive statistics for a specific event including:
 * - Company and student counts
 * - Booking statistics
 * - Slot availability
 * - Top performing company
 * 
 * @param eventId - The event ID to fetch stats for
 * @returns Object with stats data and loading state
 * 
 * @example
 * const { stats, loading, refetch } = useEventStats(eventId);
 */
export function useEventStats(eventId: string | null) {
  const [stats, setStats] = useState<EventStats | null>(null);
  const [loading, setLoading] = useState(true);

  const loadEventStats = async () => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Get stats specific to this event
      const [
        { count: eventCompanies },
        { count: totalSlots }
      ] = await Promise.all([
        supabase.from('event_participants').select('*', { count: 'exact', head: true }).eq('event_id', eventId),
        supabase.from('event_slots').select('*', { count: 'exact', head: true }).eq('event_id', eventId).eq('is_active', true)
      ]);

      // First, get all slot IDs and capacities for this event
      const { data: eventSlots } = await supabase
        .from('event_slots')
        .select('id, capacity')
        .eq('event_id', eventId)
        .eq('is_active', true);

      const slotIds = eventSlots?.map(s => s.id) || [];
      const totalCapacity = eventSlots?.reduce((sum, slot) => sum + (slot.capacity || 1), 0) || 0;

      // Get bookings count - query by slot IDs instead of nested relation
      // Skip if no slots exist
      let eventBookings = 0;
      let studentBookings: any[] = [];
      if (slotIds.length > 0) {
        const { count } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .in('slot_id', slotIds)
          .eq('status', 'confirmed');
        eventBookings = count || 0;

        // Get unique students who have bookings for this event
        const { data } = await supabase
          .from('bookings')
          .select('student_id')
          .in('slot_id', slotIds)
          .eq('status', 'confirmed');
        studentBookings = data || [];
      }

      const uniqueStudentsWithBookings = new Set(studentBookings.map(b => b.student_id)).size;

      // Get ALL registered students (not just those with bookings)
      const { count: totalRegisteredStudents } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'student');

      // Get top company by bookings - query slots first, then bookings
      // Skip if no slots exist
      let confirmedBookings: any[] = [];
      if (slotIds.length > 0) {
        const { data } = await supabase
          .from('bookings')
          .select('slot_id')
          .in('slot_id', slotIds)
          .eq('status', 'confirmed');
        confirmedBookings = data || [];
      }

      // Get slot details with company info - only if we have bookings
      const bookingSlotIds = confirmedBookings.map(b => b.slot_id);
      let slotsWithCompanies: any[] = [];
      if (bookingSlotIds.length > 0) {
        const { data } = await supabase
          .from('event_slots')
          .select(`
            id,
            company_id,
            companies!inner (
              company_name
            )
          `)
          .in('id', bookingSlotIds);
        slotsWithCompanies = data || [];
      }

      // Count bookings per company
      const companyCounts: Record<string, { name: string; count: number }> = {};
      const slotCompanyMap = new Map(slotsWithCompanies.map(s => [s.id, s]));
      
      confirmedBookings.forEach((booking: any) => {
        const slot = slotCompanyMap.get(booking.slot_id);
        if (!slot) return;
        
        const companyId = slot.company_id;
        const companyName = (slot.companies as any)?.company_name || 'Unknown';
        if (!companyCounts[companyId]) {
          companyCounts[companyId] = { name: companyName, count: 0 };
        }
        companyCounts[companyId].count++;
      });

      const topCompanyEntry = Object.values(companyCounts).sort((a, b) => b.count - a.count)[0];
      
      // Calculate available slots based on capacity (not just slot count)
      // Available = Total capacity - Bookings
      const availableSlots = Math.max(0, totalCapacity - eventBookings);

      setStats({
        event_companies: eventCompanies || 0,
        event_students: uniqueStudentsWithBookings, // Students with bookings for this event
        event_bookings: eventBookings || 0,
        total_students: totalRegisteredStudents || 0, // ALL registered students in the system
        total_slots: totalSlots || 0,
        available_slots: availableSlots,
        top_company_name: topCompanyEntry?.name || 'N/A',
        top_company_bookings: topCompanyEntry?.count || 0
      });
    } catch (error) {
      console.error('Error loading event stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEventStats();
  }, [eventId]);

  return { stats, loading, refetch: loadEventStats };
}


