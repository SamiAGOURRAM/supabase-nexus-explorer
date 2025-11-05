import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Briefcase, Calendar, Users, LogOut, Clock, MapPin, Plus, Building2, ExternalLink, FileText } from 'lucide-react';

type CompanyStats = {
  company_id: string;
  company_name: string;
  next_event_id: string | null;
  next_event_name: string | null;
  next_event_date: string | null;
  next_event_location: string | null;
  total_active_offers: number;
  total_slots: number;
  students_scheduled: number;
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
  const navigate = useNavigate();

  useEffect(() => {
    checkCompanyAndLoadData();
  }, []);

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

    // Get next event they're participating in
    const { data: participations } = await supabase
      .from('event_participants')
      .select('events(id, name, date, location)')
      .eq('company_id', company.id)
      .gte('events.date', new Date().toISOString());

    // Sort in JavaScript and get first one
    const sortedParticipations = participations
      ?.filter(p => p.events)
      .sort((a: any, b: any) => new Date(a.events.date).getTime() - new Date(b.events.date).getTime());
    
    const nextEvent = sortedParticipations?.[0]?.events || null;

    // Get active offers count
    const { count: activeOffers } = await supabase
      .from('offers')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', company.id)
      .eq('is_active', true);

    let totalSlots = 0;
    let studentsScheduled = 0;

    // Get total slots and students scheduled (if next event exists)
    if (nextEvent) {
      const { count: slotsCount } = await supabase
        .from('event_slots')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company.id)
        .eq('event_id', nextEvent.id)
        .eq('is_active', true);

      totalSlots = slotsCount || 0;

      const { count: bookedCount } = await supabase
        .from('interview_bookings')
        .select('*, event_slots!inner(company_id, event_id)', { count: 'exact', head: true })
        .eq('event_slots.company_id', company.id)
        .eq('event_slots.event_id', nextEvent.id)
        .eq('status', 'confirmed');

      studentsScheduled = bookedCount || 0;

      // Get all scheduled students for this event
      const { data: bookings } = await supabase
        .from('interview_bookings')
        .select(`
          id,
          student_id,
          event_slots!inner(start_time, end_time, location, company_id, event_id, offers(title)),
          profiles!inner(full_name, email, phone, cv_url)
        `)
        .eq('event_slots.company_id', company.id)
        .eq('event_slots.event_id', nextEvent.id)
        .eq('status', 'confirmed');

      // Sort by start_time in JavaScript
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
        offer_title: booking.event_slots?.offers?.title || 'Unknown Offer',
        slot_start_time: booking.event_slots?.start_time,
        slot_end_time: booking.event_slots?.end_time,
        slot_location: booking.event_slots?.location || null,
      })) || [];

      setScheduledStudents(formattedStudents);
    }

    setStats({
      company_id: company.id,
      company_name: company.company_name,
      next_event_id: nextEvent?.id || null,
      next_event_name: nextEvent?.name || null,
      next_event_date: nextEvent?.date || null,
      next_event_location: nextEvent?.location || null,
      total_active_offers: activeOffers || 0,
      total_slots: totalSlots,
      students_scheduled: studentsScheduled,
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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
        {/* Next Event Banner */}
        {stats?.next_event_id && (
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/20 p-6 mb-8">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-3 py-1 bg-primary/20 text-primary text-xs font-medium rounded-full">
                    Participating
                  </span>
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">{stats.next_event_name}</h2>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-3">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(stats.next_event_date!).toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      year: 'numeric', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </div>
                  {stats.next_event_location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {stats.next_event_location}
                    </div>
                  )}
                </div>
                <p className="text-sm text-foreground font-medium">
                  {stats.students_scheduled} student{stats.students_scheduled !== 1 ? 's' : ''} scheduled • {stats.total_slots} slot{stats.total_slots !== 1 ? 's' : ''} created
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions if no event */}
        {!stats?.next_event_id && (
          <div className="bg-card rounded-xl border border-border p-6 mb-8 text-center">
            <p className="text-muted-foreground">You're not participating in any upcoming events yet</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link to="/company/offers" className="bg-card rounded-xl border border-border p-6 hover:border-primary hover:shadow-elegant transition-all group">
            <Briefcase className="w-8 h-8 text-blue-500 mb-4 group-hover:scale-110 transition-transform" />
            <p className="text-3xl font-bold text-foreground mb-1">{stats?.total_active_offers || 0}</p>
            <p className="text-sm text-muted-foreground">Active Offers</p>
          </Link>
          
          <Link to="/company/slots" className="bg-card rounded-xl border border-border p-6 hover:border-primary hover:shadow-elegant transition-all group">
            <Calendar className="w-8 h-8 text-purple-500 mb-4 group-hover:scale-110 transition-transform" />
            <p className="text-3xl font-bold text-foreground mb-1">{stats?.total_slots || 0}</p>
            <p className="text-sm text-muted-foreground">Interview Slots</p>
          </Link>

          <div className="bg-card rounded-xl border border-border p-6">
            <Users className="w-8 h-8 text-green-500 mb-4" />
            <p className="text-3xl font-bold text-foreground mb-1">{stats?.students_scheduled || 0}</p>
            <p className="text-sm text-muted-foreground">Students Scheduled</p>
          </div>
        </div>

        {/* Scheduled Students */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-foreground">Scheduled Interviews</h2>
            <Link to="/company/slots" className="text-sm text-primary hover:text-primary/80 transition-colors">
              View Slots
            </Link>
          </div>

          {scheduledStudents.length > 0 ? (
            <div className="space-y-3">
              {scheduledStudents.map((student) => (
                <div key={student.booking_id} className="flex items-center gap-4 p-4 bg-background rounded-lg border border-border hover:border-primary/50 transition-colors">
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
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground mb-4">No students scheduled yet</p>
              <Link
                to="/company/slots"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
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