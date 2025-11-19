import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { ArrowLeft, Building2, MapPin, Clock, DollarSign, Tag, Briefcase, CheckCircle, Calendar, X } from 'lucide-react';
import { extractNestedObject } from '@/utils/supabaseTypes';
import { debug, error as logError } from '@/utils/logger';
import LoadingScreen from '@/components/shared/LoadingScreen';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import NotFound from '@/components/shared/NotFound';

type Offer = {
  id: string;
  title: string;
  description: string;
  requirements: string | null;
  skills_required: string[] | null;
  benefits: string | null;
  interest_tag: string;
  location: string | null;
  duration_months: number | null;
  paid: boolean | null;
  remote_possible: boolean | null;
  salary_range: string | null;
  department: string | null;
  company_id: string;
  company_name: string;
  company_logo: string | null;
  company_description: string | null;
  company_website: string | null;
  company_industry: string | null;
};

type Slot = {
  id: string;
  start_time: string;
  end_time: string;
  capacity: number;
  bookings_count: number;
};

type BookingLimitInfo = {
  can_book: boolean;
  current_count: number;
  max_allowed: number;
  current_phase: number;
  message: string;
};

export default function OfferDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [offer, setOffer] = useState<Offer | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [bookingLimit, setBookingLimit] = useState<BookingLimitInfo | null>(null);
  const [validationWarning, setValidationWarning] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const [eventId, setEventId] = useState<string>('');
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    loadOfferDetail();
  }, [id]);

  // Auto-refresh slots every 10 seconds when booking modal is open
  useEffect(() => {
    if (!showBookingModal) return;

    const interval = setInterval(() => {
      debug('[Auto-refresh] Refreshing slots...');
      fetchSlots();
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [showBookingModal, offer, eventId]);

  const loadOfferDetail = async () => {
    if (!id) {
      setError(new Error('Offer ID is required'));
      setLoading(false);
      return;
    }

    try {
      setError(null);
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      // Get the latest active event
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('id')
        .gte('date', new Date().toISOString())
        .order('date', { ascending: true })
        .limit(1);

      if (eventsError) {
        logError('Error loading events:', eventsError);
      }

      if (eventsData && eventsData.length > 0) {
        setEventId(eventsData[0].id);
      }

      const { data: offerData, error: offerError } = await supabase
        .from('offers')
        .select(`
          id,
          title,
          description,
          requirements,
          skills_required,
          benefits,
          interest_tag,
          location,
          duration_months,
          paid,
          remote_possible,
          salary_range,
          department,
          company_id,
          companies (
            company_name,
            logo_url,
            description,
            website,
            industry
          )
        `)
        .eq('id', id)
        .eq('is_active', true)
        .maybeSingle();

      if (offerError) {
        throw new Error(`Failed to load offer: ${offerError.message}`);
      }

      if (!offerData) {
        setError(new Error('Offer not found or is no longer active'));
        setLoading(false);
        return;
      }

      setOffer({
        id: offerData.id,
        title: offerData.title,
        description: offerData.description,
        requirements: offerData.requirements,
        skills_required: offerData.skills_required,
        benefits: offerData.benefits,
        interest_tag: offerData.interest_tag,
        location: offerData.location,
        duration_months: offerData.duration_months,
        paid: offerData.paid,
        remote_possible: offerData.remote_possible,
        salary_range: offerData.salary_range,
        department: offerData.department,
        company_id: offerData.company_id,
        // Extract company data from nested Supabase query result
        // Supabase returns nested objects as arrays or objects depending on join type
        ...(() => {
          const company = extractNestedObject<{
            company_name: string;
            logo_url: string | null;
            description: string | null;
            website: string | null;
            industry: string | null;
          }>(offerData.companies);
          
          return {
            company_name: company?.company_name || 'Unknown',
            company_logo: company?.logo_url || null,
            company_description: company?.description || null,
            company_website: company?.website || null,
            company_industry: company?.industry || null,
          };
        })(),
      });
    } catch (err: any) {
      logError('Error loading offer detail:', err);
      const errorMessage = err instanceof Error ? err : new Error('Failed to load offer details');
      setError(errorMessage);
      showError('Failed to load offer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBookInterview = async () => {
    if (!offer || !eventId) return;

    setShowBookingModal(true);
    setLoadingSlots(true);
    setValidationWarning(null);
    setSelectedSlotId(null);

    await fetchSlots(); // Fetch fresh slots when modal opens
  };

  const fetchSlots = async () => {
    if (!offer || !eventId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check booking limits
    const { data: limitData } = await supabase.rpc('fn_check_student_booking_limit', {
      p_student_id: user.id,
      p_event_id: eventId
    });

    if (limitData && limitData.length > 0) {
      setBookingLimit(limitData[0]);
    }

    // Get slots for this specific offer
    // Slots are linked to offers via offer_id
    const currentTime = new Date().toISOString();
    debug('[OfferDetail] Fetching slots with filters:', {
      company_id: offer.company_id,
      event_id: eventId,
      current_time: currentTime,
      timestamp: new Date().toISOString()
    });

    // Try 1: Get ALL slots for this company (no time filter, no is_active filter)
    const { data: allSlots } = await supabase
      .from('event_slots')
      .select('*')
      .eq('company_id', offer.company_id);
    
    debug('[DEBUG] ALL SLOTS for company (no filters):', {
      total: allSlots?.length || 0,
      breakdown: {
        active: allSlots?.filter(s => s.is_active).length || 0,
        inactive: allSlots?.filter(s => !s.is_active).length || 0,
        future: allSlots?.filter(s => new Date(s.start_time) > new Date()).length || 0,
        past: allSlots?.filter(s => new Date(s.start_time) <= new Date()).length || 0,
        withEventId: allSlots?.filter(s => s.event_id).length || 0,
        withoutEventId: allSlots?.filter(s => !s.event_id).length || 0
      }
    });

    // Try 2: Get slots with our intended filters (future slots only)
    let { data: slotsData, error: slotsError } = await supabase
      .from('event_slots')
      .select('id, start_time, end_time, location, capacity, offer_id, company_id, event_id, is_active')
      .eq('company_id', offer.company_id)
      .eq('is_active', true)
      .gte('start_time', currentTime)
      .order('start_time', { ascending: true });

    debug('[OfferDetail] FILTERED QUERY RESULT (future only):', {
      error: slotsError,
      count: slotsData?.length || 0
    });

    // If no future slots, get ALL active slots (including past ones)
    // This handles the case where slots were created but are now in the past
    if (!slotsError && (!slotsData || slotsData.length === 0)) {
      debug('[OfferDetail] No future slots found, fetching ALL active slots including past...');
      const { data: allActiveSlots, error: allSlotsError } = await supabase
        .from('event_slots')
        .select('id, start_time, end_time, location, capacity, offer_id, company_id, event_id, is_active')
        .eq('company_id', offer.company_id)
        .eq('is_active', true)
        .order('start_time', { ascending: true });
      
      slotsData = allActiveSlots;
      slotsError = allSlotsError;
      
      debug('[OfferDetail] ALL ACTIVE SLOTS (including past):', {
        count: slotsData?.length || 0
      });
    }
    if (slotsError) {
      logError('[OfferDetail] Error fetching slots:', slotsError);
      showError(`Error fetching slots: ${slotsError.message}`);
    }

    if (slotsData) {
      const slotsWithCounts = await Promise.all(
        slotsData.map(async (slot) => {
          const { count } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('slot_id', slot.id)
            .eq('status', 'confirmed');

          return {
            ...slot,
            bookings_count: count || 0,
          };
        })
      );

      const available = slotsWithCounts.filter(
        (slot) => slot.bookings_count < (slot.capacity || 1) // Default capacity to 1 if null
      );

      debug('[OfferDetail] Available slots after filtering:', available.length);

      setAvailableSlots(available);
    }

    setLoadingSlots(false);
  };

  const checkSlotConflict = async (slotId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const selectedSlot = availableSlots.find(s => s.id === slotId);
    if (!selectedSlot) return;

    // Get existing bookings - simplified query
    const { data: existingBookings, error } = await supabase
      .from('bookings')
      .select('slot_id')
      .eq('student_id', user.id)
      .eq('status', 'confirmed');

    if (error) {
      logError('Error checking conflicts:', error);
      return;
    }

    if (existingBookings && existingBookings.length > 0) {
      // Get slot details for all existing bookings
      const slotIds = existingBookings.map(b => b.slot_id);
      const { data: slots, error: slotsError } = await supabase
        .from('event_slots')
        .select('id, start_time, end_time, company_id')
        .in('id', slotIds);

      if (slotsError) {
        logError('Error fetching slots:', slotsError);
        return;
      }

      if (slots && slots.length > 0) {
        const slotStart = new Date(selectedSlot.start_time);
        const slotEnd = new Date(selectedSlot.end_time);

        for (const existingSlot of slots) {
          const bookingStart = new Date(existingSlot.start_time);
          const bookingEnd = new Date(existingSlot.end_time);

          if (slotStart < bookingEnd && slotEnd > bookingStart) {
            // Get company name
            const { data: company } = await supabase
              .from('companies')
              .select('company_name')
              .eq('id', existingSlot.company_id)
              .single();

            const companyName = company?.company_name || 'Unknown Company';
            setValidationWarning(
              `⚠️ Time conflict with ${companyName} at ${bookingStart.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
            );
            return;
          }
        }
      }
    }

    setValidationWarning(null);
  };

  const confirmBooking = async (slotId: string) => {
    if (!offer) return;

    try {
      setBooking(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showError('You must be logged in to book an interview');
        return;
      }

      if (bookingLimit && !bookingLimit.can_book) {
        const errorMsg = 'You have reached your booking limit for this phase.';
        showError(errorMsg);
        return;
      }

      // Use the offer_id from the current offer (we're on the offer detail page)
      if (!offer.id) {
        throw new Error('Offer ID not found');
      }

      const { data, error } = await supabase.rpc('fn_book_interview', {
        p_student_id: user.id,
        p_slot_id: slotId,
        p_offer_id: offer.id
      });

      if (error) {
        logError('RPC Error:', error);
        throw error;
      }

      // fn_book_interview returns TABLE, so data is an array
      const result = Array.isArray(data) && data.length > 0 ? data[0] : null;
      
      if (!result) {
        throw new Error('No response from booking function');
      }

      debug('Booking result:', result);

      if (result.success) {
        showSuccess(result.message || 'Interview booked successfully!');
        setShowBookingModal(false);
        setSelectedSlotId(null);
        setAvailableSlots([]);
        // Small delay before navigation for better UX
        setTimeout(() => {
          navigate('/student/bookings');
        }, 1000);
      } else {
        throw new Error(result.message || 'Failed to book interview');
      }
    } catch (error: any) {
      logError('Error booking interview:', error);
      const errorMsg = error.message || 'Failed to book interview. Please try again.';
      showError(errorMsg);
    } finally {
      setBooking(false);
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return <LoadingScreen message="Loading offer details..." />;
  }

  if (error && !offer) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Link to="/student/offers" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {error.message.includes('not found') ? (
            <NotFound resource="Offer" backTo="/student/offers" backLabel="Back to Offers" />
          ) : (
            <ErrorDisplay error={error} onRetry={loadOfferDetail} />
          )}
        </main>
      </div>
    );
  }

  if (!offer) {
    return (
      <NotFound resource="Offer" backTo="/student/offers" backLabel="Back to Offers" />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link to="/student/offers" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{offer.title}</h1>
              <p className="text-sm text-muted-foreground mt-1">Internship Offer Details</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Company Info Card */}
            <Link 
              to={`/student/companies/${offer.company_id}`}
              className="block bg-card rounded-xl border border-border p-6 hover:border-primary transition-all hover:shadow-elegant"
            >
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 className="w-8 h-8 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-foreground mb-1 hover:text-primary">{offer.company_name}</h2>
                  {offer.company_industry && (
                    <p className="text-sm text-muted-foreground mb-2">{offer.company_industry}</p>
                  )}
                  {offer.company_description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{offer.company_description}</p>
                  )}
                  <p className="text-xs text-primary mt-2">Click to view company profile →</p>
                </div>
              </div>
            </Link>

            {/* Description */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-primary" />
                About This Position
              </h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{offer.description}</p>
            </div>

            {/* Requirements */}
            {offer.requirements && (
              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="text-lg font-bold text-foreground mb-4">Requirements</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{offer.requirements}</p>
              </div>
            )}

            {/* Skills */}
            {offer.skills_required && offer.skills_required.length > 0 && (
              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="text-lg font-bold text-foreground mb-4">Required Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {offer.skills_required.map((skill, idx) => (
                    <span key={idx} className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Benefits */}
            {offer.benefits && (
              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="text-lg font-bold text-foreground mb-4">Benefits</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{offer.benefits}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Info */}
            <div className="bg-card rounded-xl border border-border p-6 sticky top-4">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-sm">
                  <Tag className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground">Department:</span>
                  <span className="font-medium text-foreground">{offer.interest_tag}</span>
                </div>

                {offer.location && (
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="text-muted-foreground">Location:</span>
                    <span className="font-medium text-foreground">{offer.location}</span>
                  </div>
                )}

                {offer.duration_months && (
                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="font-medium text-foreground">{offer.duration_months} months</span>
                  </div>
                )}

                {offer.salary_range && (
                  <div className="flex items-center gap-3 text-sm">
                    <DollarSign className="w-4 h-4 text-primary" />
                    <span className="text-muted-foreground">Salary:</span>
                    <span className="font-medium text-foreground">{offer.salary_range}</span>
                  </div>
                )}

                <div className="pt-4 border-t border-border space-y-2">
                  {offer.paid && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      Paid Position
                    </div>
                  )}
                  {offer.remote_possible && (
                    <div className="flex items-center gap-2 text-sm text-blue-600">
                      <CheckCircle className="w-4 h-4" />
                      Remote Work Possible
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={handleBookInterview}
                className="w-full mt-6 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all font-medium hover:scale-105 active:scale-95"
              >
                Book Interview
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border border-border max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b border-border p-6 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground mb-1">Select Interview Time</h2>
                <p className="text-sm text-muted-foreground">{offer.title} at {offer.company_name}</p>
              </div>
              <button onClick={() => setShowBookingModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {bookingLimit && (
                <div className={`mb-4 p-4 rounded-lg border ${bookingLimit.can_book ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
                  <p className={`text-sm font-medium ${bookingLimit.can_book ? 'text-blue-900' : 'text-red-900'}`}>
                    {bookingLimit.message}
                  </p>
                </div>
              )}

              {validationWarning && (
                <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm text-orange-900">{validationWarning}</p>
                </div>
              )}

              {loadingSlots ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
                  <p className="text-sm text-muted-foreground">Loading slots...</p>
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 text-muted-foreground opacity-50 mx-auto mb-4" />
                  <h3 className="font-semibold text-foreground mb-2">No Available Slots</h3>

                  <p className="text-muted-foreground text-sm mb-4">
                    All slots for {offer.company_name} are booked.
                  </p>
                  <details className="text-left max-w-md mx-auto">
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                      Debug Info (click to expand)
                    </summary>
                    <pre className="text-xs bg-muted p-3 rounded mt-2 overflow-auto">
                      Company ID: {offer.company_id}{'\n'}
                      Event ID: {eventId || 'Not set'}{'\n'}
                      Check browser console for query details
                    </pre>
                  </details>
                  <Link
                    to="/student/offers"
                    className="inline-block mt-4 px-4 py-2 text-sm text-primary hover:underline"
                  >
                    Browse Other Offers
                  </Link>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 mb-4">
                    {availableSlots.map((slot) => {
                      const capacity = slot.capacity || 1; // Default to 1 if null
                      const spotsLeft = capacity - slot.bookings_count;
                      const isLowCapacity = spotsLeft <= 2;
                      const isSelected = selectedSlotId === slot.id;

                      return (
                        <button
                          key={slot.id}
                          onClick={() => {
                            setSelectedSlotId(slot.id);
                            checkSlotConflict(slot.id);
                          }}
                          className={`relative p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                            isSelected 
                              ? 'border-primary bg-primary/5 shadow-lg' 
                              : 'border-border hover:border-primary bg-background'
                          }`}
                        >
                          <div className="text-sm font-semibold text-foreground mb-1">
                            {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                          </div>
                          <div className="text-xs text-muted-foreground mb-2">
                            {formatDate(slot.start_time)}
                          </div>
                          <div className={`absolute top-2 right-2 px-2 py-0.5 text-xs rounded-full ${
                            isLowCapacity 
                              ? 'bg-orange-500/10 text-orange-600' 
                              : 'bg-green-500/10 text-green-600'
                          }`}>
                            {spotsLeft} left
                          </div>
                          {isSelected && (
                            <div className="absolute inset-0 rounded-lg ring-2 ring-primary pointer-events-none" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {selectedSlotId && (
                    <button
                      onClick={() => confirmBooking(selectedSlotId)}
                      disabled={!bookingLimit?.can_book || !!validationWarning || booking}
                      className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {booking ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Booking...</span>
                        </>
                      ) : validationWarning ? (
                        'Cannot Book - Time Conflict'
                      ) : (
                        'Confirm Booking'
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
