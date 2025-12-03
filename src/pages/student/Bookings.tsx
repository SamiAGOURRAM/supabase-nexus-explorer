import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { Calendar, Clock, MapPin, Building2, Briefcase } from 'lucide-react';
import LoadingScreen from '@/components/shared/LoadingScreen';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import EmptyState from '@/components/shared/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import StudentLayout from '@/components/student/StudentLayout';

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
  const { user, loading: authLoading } = useAuth('student');
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [events, setEvents] = useState<Array<{ id: string; name: string; date: string }>>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('all');
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const loadBookings = useCallback(
    async (studentId: string, eventFilter?: string, manageLoading = true) => {
      const eventId = eventFilter ?? selectedEventId;
      try {
        setError(null);
        if (manageLoading) {
          setLoading(true);
        }

        const { data, error: rpcError } = await supabase.rpc('fn_get_student_bookings', {
          p_student_id: studentId,
        });

        if (rpcError) {
          throw new Error(`Failed to load bookings: ${rpcError.message}`);
        }

        if (data && data.length > 0) {
          const formattedBookings: Booking[] = data.map((booking: any) => ({
            id: booking.booking_id,
            student_id: studentId,
            status: booking.status,
            slot_start_time: booking.slot_time,
            slot_end_time: booking.slot_time,
            slot_location: null,
            company_name: booking.company_name,
            offer_title: booking.offer_title,
          }));

          if (eventId !== 'all') {
            const slotIds = data.map((b: any) => b.slot_id).filter(Boolean);
            if (slotIds.length > 0) {
              const { data: slots, error: slotsError } = await supabase
                .from('event_slots')
                .select('id, event_id')
                .in('id', slotIds);

              if (slotsError) {
                console.error('Error fetching slots:', slotsError);
              }

              const slotEventMap = new Map(slots?.map((s) => [s.id, s.event_id]) || []);
              const filtered = formattedBookings.filter((_booking, index) => {
                const slotId = data[index].slot_id;
                return slotEventMap.get(slotId) === eventId;
              });
              setBookings(filtered);
            } else {
              setBookings([]);
            }
          } else {
            setBookings(formattedBookings);
          }
        } else {
          setBookings([]);
        }
      } catch (err: any) {
        console.error('Error loading bookings:', err);
        setError(err instanceof Error ? err : new Error('Failed to load bookings'));
        showError('Failed to load bookings. Please try again.');
      } finally {
        if (manageLoading) {
          setLoading(false);
        }
      }
    },
    [selectedEventId, showError]
  );

  const loadInitialData = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      setError(null);

      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('id, name, date')
        .order('date', { ascending: false });

      if (eventsError) {
        throw new Error(`Failed to load events: ${eventsError.message}`);
      }

      setEvents(eventsData || []);
      await loadBookings(user.id, selectedEventId, false);
    } catch (err: any) {
      console.error('Error loading bookings:', err);
      setError(err instanceof Error ? err : new Error('Failed to load bookings'));
      showError('Failed to load bookings. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [loadBookings, selectedEventId, showError, user]);

  useEffect(() => {
    if (!authLoading) {
      loadInitialData();
    }
  }, [authLoading, loadInitialData]);

  const handleEventChange = (value: string) => {
    setSelectedEventId(value);
    if (user) {
      loadBookings(user.id, value);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this interview?')) return;

    try {
      setCancellingId(bookingId);
      if (!user) {
        showError('You must be logged in to cancel a booking');
        setCancellingId(null);
        return;
      }

      const { data, error } = await supabase.rpc('fn_cancel_booking', {
        p_booking_id: bookingId,
        p_student_id: user.id
      });

      if (error) {
        console.error('RPC error:', error);
        throw new Error(error.message || 'Failed to cancel booking');
      }

      // Check if we got a valid response
      if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error('Invalid response from server');
      }

      const result = data[0];
      if (result.success) {
        showSuccess(result.message || 'Booking cancelled successfully');
        // Reload bookings to reflect the cancellation
        await loadBookings(user.id, selectedEventId, false);
      } else {
        // Function returned success: false with an error message
        throw new Error(result.message || 'Failed to cancel booking');
      }
    } catch (error: any) {
      console.error('Error cancelling booking:', error);
      showError(error.message || 'Failed to cancel booking. Please try again.');
    } finally {
      setCancellingId(null);
    }
  };

  const upcomingBookings = useMemo(
    () =>
      bookings.filter(
        (b) => b.status === 'confirmed' && new Date(b.slot_start_time) >= new Date()
      ),
    [bookings]
  );

  const pastBookings = useMemo(
    () =>
      bookings.filter(
        (b) => new Date(b.slot_start_time) < new Date() || b.status === 'cancelled'
      ),
    [bookings]
  );

  if (authLoading) {
    return <LoadingScreen message="Preparing your bookings..." />;
  }

  if (loading) {
    return <LoadingScreen message="Loading your bookings..." />;
  }

  if (error) {
    return (
      <StudentLayout onSignOut={handleSignOut}>
        <div className="p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <ErrorDisplay
              error={error}
              onRetry={async () => {
                if (user) {
                  await loadBookings(user.id, selectedEventId);
                }
              }}
            />
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout onSignOut={handleSignOut}>
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#1a1f3a] via-[#2a3f5f] to-[#1a1f3a]">
          <div className="absolute inset-0 opacity-[0.03]">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
                backgroundSize: "32px 32px",
              }}
            />
          </div>
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500 rounded-full mix-blend-screen filter blur-3xl opacity-5" />
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[#ffb300] rounded-full mix-blend-screen filter blur-3xl opacity-5" />
          
          <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-12 md:py-16">
            <div className="mb-6">
              <div className="inline-block mb-3">
                <div className="flex items-center gap-2 px-4 py-1.5 bg-white/5 backdrop-blur-sm rounded-full border border-white/10">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-white/80 font-medium">{upcomingBookings.length} Upcoming</span>
                </div>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 leading-tight">
                My Bookings
              </h1>
              <p className="text-lg text-white/70 max-w-2xl">
                Manage your interview appointments
              </p>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </section>

        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8 space-y-6">
        {/* Event Selector */}
        {events.length > 0 && (
          <div className="bg-card rounded-xl border border-border p-4 mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              Filter by Event
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => handleEventChange(e.target.value)}
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
          <div className="group bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-xl hover:border-blue-200 transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                <Calendar className="w-6 h-6 text-white" strokeWidth={2} />
              </div>
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">{bookings.length}</p>
            <p className="text-sm text-gray-600 font-medium">Total Bookings</p>
          </div>
          <div className="group bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-xl hover:border-green-200 transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                <Clock className="w-6 h-6 text-white" strokeWidth={2} />
              </div>
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">{upcomingBookings.length}</p>
            <p className="text-sm text-gray-600 font-medium">Upcoming</p>
          </div>
          <div className="group bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-xl hover:border-purple-200 transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                <Briefcase className="w-6 h-6 text-white" strokeWidth={2} />
              </div>
              <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            </div>
            <p className="text-3xl font-bold text-gray-900 mb-1">{pastBookings.length}</p>
            <p className="text-sm text-gray-600 font-medium">Past</p>
          </div>
        </div>

        {upcomingBookings.length > 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 mb-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-50 rounded-lg">
                <Clock className="w-5 h-5 text-green-600" strokeWidth={2.5} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Upcoming Interviews</h2>
            </div>
            <div className="space-y-4">
              {upcomingBookings.map((booking, index) => {
                const bookingDate = new Date(booking.slot_start_time);
                const today = new Date();
                const isToday = bookingDate.toDateString() === today.toDateString();
                const isTomorrow = bookingDate.toDateString() === new Date(today.getTime() + 86400000).toDateString();
                
                return (
                  <div
                    key={booking.id}
                    className={`group relative p-5 rounded-xl border-2 transition-all duration-300 animate-fade-in hover:shadow-lg ${
                      isToday 
                        ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 hover:border-green-300' 
                        : isTomorrow
                        ? 'bg-gradient-to-br from-blue-50 to-blue-50 border-blue-200 hover:border-blue-300'
                        : 'bg-white border-gray-200 hover:border-blue-300'
                    }`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {isToday && (
                      <div className="absolute -top-3 left-6 px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full shadow-md">
                        Today
                      </div>
                    )}
                    {isTomorrow && (
                      <div className="absolute -top-3 left-6 px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full shadow-md">
                        Tomorrow
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-white rounded-lg shadow-sm group-hover:shadow-md transition-shadow">
                            <Building2 className="w-5 h-5 text-[#007e40]" strokeWidth={2} />
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900 text-lg">{booking.company_name}</h3>
                            <p className="text-sm text-gray-600">{booking.offer_title}</p>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-4 text-sm bg-white/50 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-gray-700">
                            <Calendar className="w-4 h-4 text-blue-600" strokeWidth={2.5} />
                            <span className="font-medium">
                              {new Date(booking.slot_start_time).toLocaleDateString('en-US', {
                                weekday: 'long',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-700">
                            <Clock className="w-4 h-4 text-purple-600" strokeWidth={2.5} />
                            <span className="font-medium">
                              {new Date(booking.slot_start_time).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          {booking.slot_location && (
                            <div className="flex items-center gap-2 text-gray-700">
                              <MapPin className="w-4 h-4 text-red-600" strokeWidth={2.5} />
                              <span className="font-medium">{booking.slot_location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleCancelBooking(booking.id)}
                        disabled={cancellingId === booking.id}
                        className="px-4 py-2.5 text-sm font-semibold text-red-600 hover:text-white bg-white hover:bg-red-500 border-2 border-red-200 hover:border-red-500 rounded-xl transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 duration-200"
                      >
                        {cancellingId === booking.id ? (
                          <span className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Cancelling...
                          </span>
                        ) : 'Cancel'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : bookings.length > 0 ? (
          <EmptyState
            icon={Calendar}
            title="No Upcoming Interviews"
            message="You don't have any upcoming interviews scheduled. Browse offers to book an interview slot."
            action={
              <Link
                to="/student/offers"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                Browse Offers
              </Link>
            }
            className="bg-card rounded-xl border border-border p-8 mb-8"
          />
        ) : null}

        {pastBookings.length > 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gray-50 rounded-lg">
                <Briefcase className="w-5 h-5 text-gray-600" strokeWidth={2.5} />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Past Bookings</h2>
            </div>
            <div className="space-y-3">
              {pastBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="p-4 bg-gray-50/50 rounded-xl border border-gray-200"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-1.5 bg-white rounded-lg shadow-sm">
                      <Building2 className="w-4 h-4 text-gray-500" strokeWidth={2} />
                    </div>
                    <h3 className="font-semibold text-gray-700">{booking.company_name}</h3>
                    {booking.status === 'cancelled' && (
                      <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                        Cancelled
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2 ml-9">{booking.offer_title}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 ml-9">
                    <Calendar className="w-3.5 h-3.5" strokeWidth={2} />
                    {new Date(booking.slot_start_time).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {bookings.length === 0 && (
          <EmptyState
            icon={Calendar}
            title="No Bookings Yet"
            message="Ready to schedule your first interview? Browse available offers and book a time that works for you."
            action={
              <Link
                to="/student/offers"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                <Briefcase className="w-4 h-4" />
                Browse Offers
              </Link>
            }
            className="bg-card rounded-xl border border-border p-8"
          />
        )}
        </div>
      </div>
    </StudentLayout>
  );
}
