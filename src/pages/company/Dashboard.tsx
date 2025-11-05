import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Briefcase, Calendar, Users, LogOut, Clock, MapPin, Plus, Building2, ExternalLink, FileText } from 'lucide-react';

type Event = {
  id: string;
  name: string;
  date: string;
  location: string | null;
};

type CompanyStats = {
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

type ScheduledStudent = {
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

export default function CompanyDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [scheduledStudents, setScheduledStudents] = useState<ScheduledStudent[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [companyId, setCompanyId] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    checkCompanyAndLoadData();
  }, []);

  useEffect(() => {
    if (selectedEventId && companyId) {
      loadEventStats(companyId, selectedEventId);
    }
  }, [selectedEventId]);

  const checkCompanyAndLoadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/login');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'company') {
      navigate('/offers');
      return;
    }

    const { data: company } = await supabase
      .from('companies')
      .select('id, company_name')
      .eq('profile_id', user.id)
      .single();

    if (!company) {
      setLoading(false);
      return;
    }

    setCompanyId(company.id);

    // Get events they're participating in
    const { data: participations } = await supabase
      .from('event_participants')
      .select('events(id, name, date, location)')
      .eq('company_id', company.id)
      .gte('events.date', new Date().toISOString());

    const participatingEvents = participations
      ?.filter(p => p.events)
      .map(p => p.events as Event)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) || [];

    if (participatingEvents.length > 0) {
      setEvents(participatingEvents);
      setSelectedEventId(participatingEvents[0].id);
    } else {
      setLoading(false);
    }
  };

  const loadEventStats = async (companyId: string, eventId: string) => {
    setLoading(true);

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

    // Get students scheduled for this event
    const { count: studentsScheduled } = await supabase
      .from('bookings')
      .select('*, event_slots!inner(company_id, event_id)', { count: 'exact', head: true })
      .eq('event_slots.company_id', companyId)
      .eq('event_slots.event_id', eventId)
      .eq('status', 'confirmed');

    // Calculate utilization rate
    const utilizationRate = totalSlots && totalSlots > 0 
      ? Math.round((studentsScheduled || 0) / totalSlots * 100) 
      : 0;

    // Get scheduled students for this event
    const { data: bookings } = await supabase
      .from('bookings')
      .select(`
        id,
        student_id,
        event_slots!inner(start_time, end_time, location, company_id, event_id, offer_id),
        profiles!inner(full_name, email, phone, cv_url)
      `)
      .eq('event_slots.company_id', companyId)
      .eq('event_slots.event_id', eventId)
      .eq('status', 'confirmed');

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

    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground animate-pulse">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-2xl font-bold text-foreground">{stats?.company_name || 'Company Dashboard'}</h1>
                <p className="text-sm text-muted-foreground mt-1">Manage your recruitment</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to="/company/profile"
                className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg hover:border-primary transition-colors"
              >
                <Building2 className="w-4 h-4" />
                Profile
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Event Selector */}
        {events.length > 0 && (
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20 p-6 mb-8">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-foreground mb-3">
                  Select Event
                </label>
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name} - {new Date(event.date).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* No Events Message */}
        {events.length === 0 && (
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
        )}

        {/* Stats Cards */}
        {stats && (
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
        )}

        {/* Scheduled Students */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground">Scheduled Interviews</h2>
            <Link to="/company/students" className="text-sm text-primary hover:text-primary/80 transition-colors">
              View All Students
            </Link>
          </div>

          {scheduledStudents.length > 0 ? (
            <div className="space-y-3">
              {scheduledStudents.map((student) => (
                <Link 
                  key={student.booking_id} 
                  to={`/company/students/${student.student_id}`}
                  className="flex items-center gap-4 p-4 bg-background rounded-lg border border-border hover:border-primary/50 transition-colors"
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-foreground">{student.student_name}</p>
                      {student.cv_url && (
                        <a
                          href={student.cv_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-primary/80 transition-colors"
                          title="View CV"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <FileText className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{student.offer_title}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-xs text-muted-foreground">{student.student_email}</p>
                      {student.student_phone && (
                        <p className="text-xs text-muted-foreground">• {student.student_phone}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 text-sm text-foreground font-medium mb-1">
                      <Clock className="w-4 h-4" />
                      {new Date(student.slot_start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(student.slot_start_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                    {student.slot_location && (
                      <p className="text-xs text-muted-foreground mt-1">{student.slot_location}</p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 animate-fade-in">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-muted-foreground opacity-50" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">No Students Scheduled</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Students will appear here once they book interview slots
              </p>
              <Link
                to="/company/slots"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all text-sm font-medium hover:scale-105 active:scale-95"
              >
                View Slots
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}