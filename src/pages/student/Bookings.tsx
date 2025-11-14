import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Calendar, Clock, MapPin, Building2, Briefcase } from 'lucide-react';

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
    // Use the RPC function which properly handles sorting and joins
    const { data, error } = await supabase.rpc('fn_get_student_bookings', {
      p_student_id: studentId
    });

    if (error) {
      console.error('Error loading bookings:', error);
      setLoading(false);
      return;
    }

    if (data) {
      // Map the RPC response to our Booking type
      const formattedBookings: Booking[] = data.map((booking: any) => ({
        id: booking.booking_id,
        student_id: studentId,
        status: booking.status,
        slot_start_time: booking.slot_time,
        slot_end_time: booking.slot_time, // RPC doesn't return end_time, but we can calculate it
        slot_location: null, // RPC doesn't return location
        company_name: booking.company_name,
        offer_title: booking.offer_title,
      }));

      // Filter by event if needed
      if (selectedEventId !== 'all') {
        // We need to fetch event_id for filtering - let's get slot details
        const slotIds = data.map((b: any) => b.slot_id).filter(Boolean);
        if (slotIds.length > 0) {
          const { data: slots } = await supabase
            .from('event_slots')
            .select('id, event_id')
            .in('id', slotIds);

          const slotEventMap = new Map(slots?.map(s => [s.id, s.event_id]) || []);
          
          // Filter bookings by event
          const filtered = formattedBookings.filter((_booking, index) => {
            const slotId = data[index].slot_id;
            return slotEventMap.get(slotId) === selectedEventId;
          });
          
          setBookings(filtered);
        } else {
          setBookings([]);
        }
      } else {
        setBookings(formattedBookings);
      }
    }

    setLoading(false);
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this interview?')) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.rpc('fn_cancel_booking', {
        p_booking_id: bookingId,
        p_student_id: user.id
      });

      if (error) throw error;

      if (data && data.length > 0 && data[0].success) {
        alert(data[0].message);
        await loadBookings(user.id);
      } else {
        alert(data[0]?.message || 'Failed to cancel booking');
      }
    } catch (error: any) {
      alert('Failed to cancel booking: ' + error.message);
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
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground animate-pulse">Loading your bookings...</p>
        </div>
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
          <div className="bg-card rounded-xl border border-border p-6 mb-8 animate-fade-in">
            <h2 className="text-xl font-bold text-foreground mb-6">Upcoming Interviews</h2>
            <div className="space-y-4">
              {upcomingBookings.map((booking, index) => (
                <div
                  key={booking.id}
                  className="p-4 bg-background rounded-lg border border-border hover:border-primary transition-all hover-scale animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
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
                      className="px-4 py-2 text-sm text-red-600 hover:text-red-700 border border-red-200 rounded-lg hover:bg-red-50 transition-all hover:scale-105 active:scale-95"
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
          <div className="bg-card rounded-xl border border-border p-12 text-center animate-fade-in">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-10 h-10 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No bookings yet</h3>
            <p className="text-muted-foreground mb-6">
              Ready to schedule your first interview? Browse available offers and book a time that works for you.
            </p>
            <Link
              to="/student/offers"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all font-medium hover:scale-105 active:scale-95"
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