import { Link } from 'react-router-dom';
import { Briefcase, Calendar, Users, Plus } from 'lucide-react';
import type { CompanyStats } from '@/hooks/useCompanyStats';

/**
 * CompanyStatsGrid - Grid of statistics cards for company dashboard
 * 
 * Displays key company metrics including offers, slots, utilization, and top offer.
 * 
 * @component
 * @param stats - Company statistics data
 * 
 * @example
 * <CompanyStatsGrid stats={companyStats} />
 */
export default function CompanyStatsGrid({ stats }: { stats: CompanyStats | null }) {
  if (!stats) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Link to="/company/offers" className="bg-card rounded-xl border border-border p-6 hover:border-primary hover:shadow-elegant transition-all group">
        <div className="flex items-center justify-between mb-4">
          <Briefcase className="w-8 h-8 text-blue-500 group-hover:scale-110 transition-transform" />
          <Plus className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <p className="text-3xl font-bold text-foreground mb-1">{stats.event_offers}</p>
        <p className="text-sm text-muted-foreground">Event Offers</p>
        <p className="text-xs text-blue-600 mt-2">{stats.total_active_offers} total active</p>
      </Link>
      
      <Link to="/company/slots" className="bg-card rounded-xl border border-border p-6 hover:border-primary hover:shadow-elegant transition-all group">
        <Calendar className="w-8 h-8 text-purple-500 mb-4 group-hover:scale-110 transition-transform" />
        <p className="text-3xl font-bold text-foreground mb-1">{stats.total_slots}</p>
        <p className="text-sm text-muted-foreground">Total Slots</p>
        <p className="text-xs text-purple-600 mt-2">{stats.students_scheduled} booked</p>
      </Link>

      <div className="bg-card rounded-xl border border-border p-6">
        <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mb-4">
          <Users className="w-6 h-6 text-green-500" />
        </div>
        <p className="text-3xl font-bold text-foreground mb-1">{stats.utilization_rate}%</p>
        <p className="text-sm text-muted-foreground mb-2">Slot Utilization</p>
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className="bg-green-500 h-2 rounded-full transition-all"
            style={{ width: `${stats.utilization_rate}%` }}
          />
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-6">
        <div className="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center mb-4">
          <Briefcase className="w-6 h-6 text-orange-500" />
        </div>
        <p className="text-xl font-bold text-foreground mb-1 truncate">{stats.top_offer_title}</p>
        <p className="text-sm text-muted-foreground">Top Offer</p>
        <p className="text-xs text-orange-600 mt-2">{stats.top_offer_bookings} booking{stats.top_offer_bookings !== 1 ? 's' : ''}</p>
      </div>
    </div>
  );
}


