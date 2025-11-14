import { Building2, Users, Briefcase, Calendar, TrendingUp, Target } from 'lucide-react';
import EventStatsCard from './EventStatsCard';
import type { EventStats } from '@/hooks/useEventStats';

/**
 * StatsGrid - Grid of statistics cards for admin dashboard
 * 
 * Displays key event metrics in a responsive grid layout.
 * Shows companies, students, bookings, slots, and top company information.
 * 
 * @component
 * @param stats - Event statistics data
 * @param eventId - Current event ID for generating links
 * 
 * @example
 * <StatsGrid stats={eventStats} eventId={selectedEventId} />
 */
export default function StatsGrid({
  stats,
  eventId,
}: {
  stats: EventStats | null;
  eventId: string;
}) {
  if (!stats) return null;

  return (
    <>
      {/* Row 1: Core Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <EventStatsCard
          icon={Building2}
          value={stats.event_companies || 0}
          label="Companies"
          sublabel="participating"
          iconColor="bg-success/10 text-success"
          href={`/admin/events/${eventId}/companies`}
        />
        <EventStatsCard
          icon={Users}
          value={stats.total_students || 0}
          label="Students"
          sublabel="registered"
          iconColor="bg-blue-500/10 text-blue-500"
          href={`/admin/events/${eventId}/students`}
        />
        <EventStatsCard
          icon={Briefcase}
          value={stats.event_bookings || 0}
          label="Interviews Scheduled"
          sublabel="confirmed bookings"
          iconColor="bg-orange-500/10 text-orange-500"
          href={`/admin/events/${eventId}/participants`}
        />
      </div>

      {/* Row 2: Insights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <EventStatsCard
          icon={Calendar}
          value={stats.available_slots || 0}
          label="Available Slots"
          sublabel="remaining capacity"
          iconColor="bg-purple-500/10 text-purple-500"
          href={`/admin/events/${eventId}/slots`}
        />
        <EventStatsCard
          icon={TrendingUp}
          value={stats.top_company_name || 'N/A'}
          label="Top Company"
          sublabel={`${stats.top_company_bookings || 0} interviews`}
          iconColor="bg-green-500/10 text-green-500"
        />
        <EventStatsCard
          icon={Target}
          value={stats.event_bookings || 0}
          label="Total Interviews"
          sublabel="scheduled for event"
          iconColor="bg-blue-500/10 text-blue-500"
        />
      </div>
    </>
  );
}


