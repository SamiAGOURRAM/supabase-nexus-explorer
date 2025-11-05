import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Calendar, Clock, MapPin, Building2, Briefcase, XCircle } from 'lucide-react';

type Booking = {
  id: string;
  student_id: string;
  status: string;
  slot_start_time: string;
  slot_end_time: string;
  slot_location: string | null;
  company_name: string;
  offer_title: string;
};

export default function StudentBookings() {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [events, setEvents] = useState<Array<{ id: string; name: string; date: string }>>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('all');
  const navigate = useNavigate();

  useEffect(() => {
    checkStudentAndLoadBookings();
  }, []);

  useEffect(() => {
    const reloadBookings = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && selectedEventId) {
        loadBookings(user.id);
      }
    };
    
    if (selectedEventId) {
      reloadBookings();
    }
  }, [selectedEventId]);

  const checkStudentAndLoadBookings = async () => {
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

    if (!profile || profile.role !== 'student') {
      navigate('/offers');
      return;
    }

    // Load events
    const { data: eventsData } = await supabase
      .from('events')
      .select('id, name, date')
      .order('date', { ascending: false });

    if (eventsData) {
      setEvents(eventsData);
    }

    loadBookings(user.id);
  };

  const loadBookings = async (studentId: string) => {
    let query = supabase
      .from('interview_bookings')
      .select(`
        id,
        student_id,
        status,
        event_slots!inner(
          start_time,
          end_time,
          location,
          event_id,
          companies!inner(company_name)
        ),
        offers!inner(title)
      `)
      .eq('student_id', studentId);

    // Filter by event if not 'all'
    if (selectedEventId !== 'all') {
      query = query.eq('event_slots.event_id', selectedEventId);
    }

    const { data } = await query.order('event_slots(start_time)', { ascending: false });

    if (data) {
      const formattedBookings: Booking[] = data.map((booking: any) => ({
        id: booking.id,
        student_id: booking.student_id,
        status: booking.status,
        slot_start_time: booking.event_slots.start_time,
        slot_end_time: booking.event_slots.end_time,
        slot_location: booking.event_slots.location,
        company_name: booking.event_slots.companies.company_name,
        offer_title: booking.offers.title,
      }));

      setBookings(formattedBookings);
    }

    setLoading(false);
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this interview?')) return;

    const { error } = await supabase
      .from('interview_bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId);

    if (error) {
      alert('Failed to cancel booking: ' + error.message);
    } else {
      alert('Booking cancelled successfully');
      const { data: { user } } = await supabase.auth.getUser();
      if (user) loadBookings(user.id);
    }
  };

  const upcomingBookings = bookings.filter(
    (b) => b.status === 'confirmed' && new Date(b.slot_start_time) >= new Date()
  );
  
  const pastBookings = bookings.filter(
    (b) => new Date(b.slot_start_time) < new Date() || b.status === 'cancelled'
  );

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
          <div className="flex items-center gap-4">
            <Link to="/student" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">My Bookings</h1>
              <p className="text-sm text-muted-foreground mt-1">Manage your interview appointments</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Event Selector */}
        {events.length > 0 && (
          <div className="bg-card rounded-xl border border-border p-4 mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              Filter by Event
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full md:w-auto px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Events</option>
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
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-card rounded-xl border border-border p-6">
            <Calendar className="w-8 h-8 text-blue-500 mb-4" />
            <p className="text-3xl font-bold text-foreground mb-1">{bookings.length}</p>
            <p className="text-sm text-muted-foreground">Total Bookings</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-6">
            <Clock className="w-8 h-8 text-green-500 mb-4" />
            <p className="text-3xl font-bold text-foreground mb-1">{upcomingBookings.length}</p>
            <p className="text-sm text-muted-foreground">Upcoming</p>
          </div>
          <div className="bg-card rounded-xl border border-border p-6">
            <Briefcase className="w-8 h-8 text-purple-500 mb-4" />
            <p className="text-3xl font-bold text-foreground mb-1">{pastBookings.length}</p>
            <p className="text-sm text-muted-foreground">Past</p>
          </div>
        </div>

        {upcomingBookings.length > 0 && (
          <div className="bg-card rounded-xl border border-border p-6 mb-8">
            <h2 className="text-xl font-bold text-foreground mb-6">Upcoming Interviews</h2>
            <div className="space-y-4">
              {upcomingBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="p-4 bg-background rounded-lg border border-border hover:border-primary transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Building2 className="w-5 h-5 text-primary" />
                        <h3 className="font-bold text-foreground">{booking.company_name}</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">{booking.offer_title}</p>
                      
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {new Date(booking.slot_start_time).toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          {new Date(booking.slot_start_time).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        {booking.slot_location && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            {booking.slot_location}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleCancelBooking(booking.id)}
                      className="px-4 py-2 text-sm text-red-600 hover:text-red-700 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {pastBookings.length > 0 && (
          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="text-xl font-bold text-foreground mb-6">Past Bookings</h2>
            <div className="space-y-4">
              {pastBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="p-4 bg-muted/30 rounded-lg border border-border opacity-60"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Building2 className="w-5 h-5 text-muted-foreground" />
                    <h3 className="font-bold text-foreground">{booking.company_name}</h3>
                    {booking.status === 'cancelled' && (
                      <span className="px-2 py-1 bg-red-500/10 text-red-600 text-xs font-medium rounded">
                        Cancelled
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{booking.offer_title}</p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    {new Date(booking.slot_start_time).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {bookings.length === 0 && (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No bookings yet</h3>
            <p className="text-muted-foreground mb-6">Start browsing offers to book your first interview</p>
            <Link
              to="/student/offers"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
            >
              <Briefcase className="w-4 h-4" />
              Browse Offers
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}