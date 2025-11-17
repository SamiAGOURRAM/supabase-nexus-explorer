import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Company statistics data structure
 */
export type CompanyStats = {
  company_id: string;
  company_name: string;
  total_active_offers: number;
  event_offers: number;
  total_slots: number;
  students_scheduled: number;
  utilization_rate: number;
  top_offer_title: string;
  top_offer_bookings: number;
};

/**
 * Scheduled student information
 */
export type ScheduledStudent = {
  booking_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  student_phone: string | null;
  cv_url: string | null;
  offer_title: string;
  slot_start_time: string;
  slot_end_time: string;
  slot_location: string | null;
};

/**
 * Custom hook for fetching company statistics
 * 
 * Loads comprehensive statistics for a company's participation in an event including:
 * - Offer counts (total and event-specific)
 * - Slot utilization
 * - Scheduled students
 * - Top performing offer
 * 
 * @param companyId - The company ID
 * @param eventId - The event ID to fetch stats for
 * @returns Object with stats data, scheduled students, loading state, and refetch function
 * 
 * @example
 * const { stats, scheduledStudents, loading, refetch } = useCompanyStats(companyId, eventId);
 */
export function useCompanyStats(companyId: string | null, eventId: string | null) {
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [scheduledStudents, setScheduledStudents] = useState<ScheduledStudent[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStats = async () => {
    if (!companyId || !eventId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data: company } = await supabase
        .from('companies')
        .select('company_name')
        .eq('id', companyId)
        .single();

      // Get total active offers (all events)
      const { count: totalActiveOffers } = await supabase
        .from('offers')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('is_active', true);

      // Get offers for this event
      const { count: eventOffers } = await supabase
        .from('offers')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('event_id', eventId)
        .eq('is_active', true);

      // Get total slots for this event
      const { count: totalSlots } = await supabase
        .from('event_slots')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('event_id', eventId)
        .eq('is_active', true);

      // First get slot IDs for this event and company
      const { data: companyEventSlots } = await supabase
        .from('event_slots')
        .select('id')
        .eq('event_id', eventId)
        .eq('company_id', companyId)
        .eq('is_active', true);

      const slotIds = companyEventSlots?.map(s => s.id) || [];

      // Get students scheduled for this event - only if we have slots
      let studentsScheduled = 0;
      let bookings: any[] = [];
      if (slotIds.length > 0) {
        const { count } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .in('slot_id', slotIds)
          .eq('status', 'confirmed');
        studentsScheduled = count || 0;

        // Get scheduled students for this event
        const { data } = await supabase
          .from('bookings')
          .select(`
            id,
            student_id,
            slot_id,
            event_slots!inner(start_time, end_time, location, company_id, event_id, offer_id),
            profiles!inner(full_name, email, phone, cv_url)
          `)
          .in('slot_id', slotIds)
          .eq('status', 'confirmed');
        bookings = data || [];
      }

      // Calculate utilization rate
      const utilizationRate = totalSlots && totalSlots > 0 
        ? Math.round(studentsScheduled / totalSlots * 100) 
        : 0;

      const offerIds = [...new Set(bookings?.map((b: any) => b.event_slots?.offer_id).filter(Boolean))];
      const { data: offers } = await supabase
        .from('offers')
        .select('id, title')
        .in('id', offerIds);

      const offerMap = new Map(offers?.map(o => [o.id, o.title]) || []);

      // Calculate top offer from actual bookings
      const offerCounts: Record<string, { title: string; count: number }> = {};
      bookings?.forEach((booking: any) => {
        const offerId = booking.event_slots?.offer_id;
        if (offerId) {
          const offerTitle = offerMap.get(offerId) || 'Unknown';
          if (!offerCounts[offerId]) {
            offerCounts[offerId] = { title: offerTitle, count: 0 };
          }
          offerCounts[offerId].count++;
        }
      });

      const topOffer = Object.values(offerCounts).sort((a, b) => b.count - a.count)[0];

      const sortedBookings = bookings?.sort((a: any, b: any) => 
        new Date(a.event_slots.start_time).getTime() - new Date(b.event_slots.start_time).getTime()
      );

      const formattedStudents: ScheduledStudent[] = sortedBookings?.map((booking: any) => ({
        booking_id: booking.id,
        student_id: booking.student_id,
        student_name: booking.profiles?.full_name || 'Unknown',
        student_email: booking.profiles?.email || '',
        student_phone: booking.profiles?.phone || null,
        cv_url: booking.profiles?.cv_url || null,
        offer_title: offerMap.get(booking.event_slots?.offer_id) || 'Unknown Offer',
        slot_start_time: booking.event_slots?.start_time,
        slot_end_time: booking.event_slots?.end_time,
        slot_location: booking.event_slots?.location || null,
      })) || [];

      setScheduledStudents(formattedStudents);

      setStats({
        company_id: companyId,
        company_name: company?.company_name || '',
        total_active_offers: totalActiveOffers || 0,
        event_offers: eventOffers || 0,
        total_slots: totalSlots || 0,
        students_scheduled: studentsScheduled || 0,
        utilization_rate: utilizationRate,
        top_offer_title: topOffer?.title || 'N/A',
        top_offer_bookings: topOffer?.count || 0,
      });
    } catch (error) {
      console.error('Error loading company stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [companyId, eventId]);

  return { stats, scheduledStudents, loading, refetch: loadStats };
}


