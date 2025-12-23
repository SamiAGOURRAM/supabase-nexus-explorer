import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { Calendar, Clock, MapPin, Building2, Briefcase, AlertTriangle, X, Download } from 'lucide-react';
import LoadingScreen from '@/components/shared/LoadingScreen';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import EmptyState from '@/components/shared/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import StudentLayout from '@/components/student/StudentLayout';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  const [confirmCancelModal, setConfirmCancelModal] = useState<{ show: boolean; bookingId: string | null; companyName: string; offerTitle: string; slotTime: string }>({
    show: false,
    bookingId: null,
    companyName: '',
    offerTitle: '',
    slotTime: ''
  });
  const [downloadingBookings, setDownloadingBookings] = useState(false);

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
      setConfirmCancelModal({ show: false, bookingId: null, companyName: '', offerTitle: '', slotTime: '' });
    }
  };

  const showCancelConfirmation = (booking: Booking) => {
    const slotTime = new Date(booking.slot_start_time).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    setConfirmCancelModal({
      show: true,
      bookingId: booking.id,
      companyName: booking.company_name,
      offerTitle: booking.offer_title,
      slotTime: slotTime
    });
  };

  const handleDownloadBookings = async () => {
    try {
      setDownloadingBookings(true);
      
      if (!user) {
        showError('You must be logged in to download bookings');
        return;
      }

      // Get complete booking data with all details
      const { data: fullBookingsData, error: bookingsError } = await supabase
        .rpc('fn_get_student_bookings', {
          p_student_id: user.id,
        });

      if (bookingsError) {
        throw new Error(`Failed to fetch bookings: ${bookingsError.message}`);
      }

      if (!fullBookingsData || fullBookingsData.length === 0) {
        showError('No bookings to download');
        return;
      }

      // Filter only upcoming/confirmed bookings (exclude past and cancelled)
      const upcomingBookings = fullBookingsData.filter((booking: any) => 
        booking.status === 'confirmed' && new Date(booking.slot_time) >= new Date()
      );

      if (upcomingBookings.length === 0) {
        showError('No upcoming bookings to download');
        return;
      }

      // Get user profile for PDF header
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      // Generate PDF with only upcoming bookings
      generateBookingsPDF(upcomingBookings, profile);
      
      showSuccess('Bookings downloaded successfully');
    } catch (error: any) {
      console.error('Error downloading bookings:', error);
      showError(error.message || 'Failed to download bookings. Please try again.');
    } finally {
      setDownloadingBookings(false);
    }
  };

  const generateBookingsPDF = (bookingsData: any[], profile: any) => {
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.setTextColor(26, 31, 58); // #1a1f3a
    doc.text('My Upcoming Interview Bookings', 14, 22);
    
    // Add student info
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    if (profile?.full_name) {
      doc.text(`Student: ${profile.full_name}`, 14, 32);
    }
    if (profile?.email) {
      doc.text(`Email: ${profile.email}`, 14, 38);
    }
    doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}`, 14, 44);
    
    // Prepare table data
    const tableData = bookingsData.map((booking) => {
      const slotDate = new Date(booking.slot_time);
      return [
        booking.company_name || '',
        booking.offer_title || '',
        booking.event_name || '',
        slotDate.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric',
          year: 'numeric'
        }),
        slotDate.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit'
        }),
        booking.status === 'confirmed' ? '✓' : 
        booking.status === 'cancelled' ? '✗' : 
        booking.status || ''
      ];
    });
    
    // Add table
    autoTable(doc, {
      startY: 52,
      head: [['Company', 'Offer', 'Event', 'Date', 'Time', 'Status']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [26, 31, 58], // #1a1f3a
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10
      },
      bodyStyles: {
        fontSize: 9,
        textColor: [50, 50, 50]
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      columnStyles: {
        0: { cellWidth: 35 }, // Company
        1: { cellWidth: 45 }, // Offer
        2: { cellWidth: 35 }, // Event
        3: { cellWidth: 25 }, // Date
        4: { cellWidth: 20 }, // Time
        5: { cellWidth: 18, halign: 'center' } // Status
      },
      margin: { top: 52, left: 14, right: 14 }
    });
    
    // Add footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Page ${i} of ${pageCount}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }
    
    // Download
    const dateStr = new Date().toISOString().split('T')[0];
    doc.save(`my-bookings-${dateStr}.pdf`);
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
        <section className="bg-[#1a1f3a] border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-12">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  My Bookings
                </h1>
                <p className="text-white/70">
                  Manage your interview appointments
                </p>
              </div>
              {bookings.length > 0 && (
                <button
                  onClick={handleDownloadBookings}
                  disabled={downloadingBookings}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white text-[#1a1f3a] rounded-lg hover:bg-gray-100 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" />
                  {downloadingBookings ? 'Generating PDF...' : 'Download PDF'}
                </button>
              )}
            </div>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8 space-y-6">
        {/* Event Selector */}
        {events.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Filter by Event
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => handleEventChange(e.target.value)}
              className="w-full md:w-auto px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#007e40] focus:border-transparent"
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{bookings.length}</p>
            </div>
            <p className="text-sm text-gray-600">Total Bookings</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-50 rounded-lg">
                <Clock className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{upcomingBookings.length}</p>
            </div>
            <p className="text-sm text-gray-600">Upcoming</p>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-50 rounded-lg">
                <Briefcase className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{pastBookings.length}</p>
            </div>
            <p className="text-sm text-gray-600">Past</p>
          </div>
        </div>

        {upcomingBookings.length > 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-50 rounded-lg">
                <Clock className="w-5 h-5 text-green-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Upcoming Interviews</h2>
            </div>
            <div className="space-y-4">
              {upcomingBookings.map((booking) => {
                const bookingDate = new Date(booking.slot_start_time);
                const today = new Date();
                const isToday = bookingDate.toDateString() === today.toDateString();
                const isTomorrow = bookingDate.toDateString() === new Date(today.getTime() + 86400000).toDateString();
                
                return (
                  <div
                    key={booking.id}
                    className={`p-4 rounded-lg border ${
                      isToday 
                        ? 'bg-green-50 border-green-200' 
                        : isTomorrow
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    {isToday && (
                      <div className="inline-block px-2 py-1 bg-green-500 text-white text-xs font-bold rounded mb-3">
                        Today
                      </div>
                    )}
                    {isTomorrow && (
                      <div className="inline-block px-2 py-1 bg-blue-500 text-white text-xs font-bold rounded mb-3">
                        Tomorrow
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-white rounded-lg border border-gray-200">
                            <Building2 className="w-5 h-5 text-[#007e40]" />
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-900">{booking.company_name}</h3>
                            <p className="text-sm text-gray-600">{booking.offer_title}</p>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-4 text-sm text-gray-700">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            <span>
                              {new Date(booking.slot_start_time).toLocaleDateString('en-US', {
                                weekday: 'long',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-purple-600" />
                            <span>
                              {new Date(booking.slot_start_time).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          {booking.slot_location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4 text-red-600" />
                              <span>{booking.slot_location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => showCancelConfirmation(booking)}
                        disabled={cancellingId === booking.id}
                        className="px-4 py-2 text-sm font-semibold text-red-600 hover:text-white bg-white hover:bg-red-500 border border-red-200 hover:border-red-500 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {cancellingId === booking.id ? 'Cancelling...' : 'Cancel'}
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
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-gray-50 rounded-lg">
                <Briefcase className="w-5 h-5 text-gray-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">Past Bookings</h2>
            </div>
            <div className="space-y-3">
              {pastBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-white rounded-lg">
                      <Building2 className="w-4 h-4 text-gray-500" />
                    </div>
                    <h3 className="font-semibold text-gray-700">{booking.company_name}</h3>
                    {booking.status === 'cancelled' && (
                      <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded">
                        Cancelled
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-2 ml-11">{booking.offer_title}</p>
                  <div className="flex items-center gap-2 text-xs text-gray-500 ml-11">
                    <Calendar className="w-3.5 h-3.5" />
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

      {/* Cancel Confirmation Modal */}
      {confirmCancelModal.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full mx-4 animate-fade-in">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start gap-4 mb-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                    Cancel Interview?
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    This action cannot be undone
                  </p>
                </div>
                <button
                  onClick={() => setConfirmCancelModal({ show: false, bookingId: null, companyName: '', offerTitle: '', slotTime: '' })}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mb-6">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-gray-500" />
                    <span className="font-semibold text-gray-900 dark:text-white">{confirmCancelModal.companyName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-700 dark:text-gray-300">{confirmCancelModal.offerTitle}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-700 dark:text-gray-300">{confirmCancelModal.slotTime}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmCancelModal({ show: false, bookingId: null, companyName: '', offerTitle: '', slotTime: '' })}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                >
                  Keep Interview
                </button>
                <button
                  onClick={() => confirmCancelModal.bookingId && handleCancelBooking(confirmCancelModal.bookingId)}
                  disabled={cancellingId === confirmCancelModal.bookingId}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancellingId === confirmCancelModal.bookingId ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Cancelling...
                    </span>
                  ) : (
                    'Yes, Cancel'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </StudentLayout>
  );
}
