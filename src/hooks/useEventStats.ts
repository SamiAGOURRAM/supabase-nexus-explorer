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

      // Get bookings count
      const { count: eventBookings } = await supabase
        .from('bookings')
        .select('*, event_slots!inner(event_id)', { count: 'exact', head: true })
        .eq('event_slots.event_id', eventId)
        .eq('status', 'confirmed');

      // Get unique students who have bookings for this event
      const { data: studentBookings } = await supabase
        .from('bookings')
        .select('student_id, event_slots!inner(event_id)')
        .eq('event_slots.event_id', eventId)
        .eq('status', 'confirmed');

      const uniqueStudents = new Set(studentBookings?.map(b => b.student_id) || []).size;

      // Get top company by bookings - reversed query to avoid 400 error
      const { data: confirmedBookings } = await supabase
        .from('bookings')
        .select('event_slots!inner(company_id, event_id, companies!inner(company_name))')
        .eq('event_slots.event_id', eventId)
        .eq('status', 'confirmed');

      const companyCounts: Record<string, { name: string; count: number }> = {};
      confirmedBookings?.forEach((booking: any) => {
        const companyId = booking.event_slots?.company_id;
        const companyName = booking.event_slots?.companies?.company_name || 'Unknown';
        if (!companyCounts[companyId]) {
          companyCounts[companyId] = { name: companyName, count: 0 };
        }
        companyCounts[companyId].count++;
      });

      const topCompanyEntry = Object.values(companyCounts).sort((a, b) => b.count - a.count)[0];
      const availableSlots = (totalSlots || 0) - (eventBookings || 0);

      setStats({
        event_companies: eventCompanies || 0,
        event_students: uniqueStudents,
        event_bookings: eventBookings || 0,
        total_students: uniqueStudents,
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


