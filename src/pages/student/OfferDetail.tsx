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
import StudentLayout from '@/components/student/StudentLayout';
import { useAuth } from '@/hooks/useAuth';

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
  const { signOut } = useAuth('student');
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
      <StudentLayout onSignOut={signOut}>
        <div className="p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <Link to="/student/offers" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
              <ArrowLeft className="w-5 h-5" />
              Back to Offers
            </Link>
            {error.message.includes('not found') ? (
              <NotFound resource="Offer" backTo="/student/offers" backLabel="Back to Offers" />
            ) : (
              <ErrorDisplay error={error} onRetry={loadOfferDetail} />
            )}
          </div>
        </div>
      </StudentLayout>
    );
  }

  if (!offer) {
    return (
      <StudentLayout onSignOut={signOut}>
        <div className="p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <NotFound resource="Offer" backTo="/student/offers" backLabel="Back to Offers" />
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout onSignOut={signOut}>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-6">
            <Link to="/student/offers" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Offers</span>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">{offer.title}</h1>
            <Link to={`/student/companies/${offer.company_id}`} className="inline-flex items-center gap-2 text-gray-600 hover:text-[#007e40] mt-2 transition-colors">
              <Building2 className="w-4 h-4" />
              <span className="font-medium">{offer.company_name}</span>
              {offer.company_industry && <span className="text-sm text-gray-400">• {offer.company_industry}</span>}
            </Link>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">About this position</h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{offer.description}</p>
            </div>

            {/* Requirements */}
            {offer.requirements && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Requirements</h2>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{offer.requirements}</p>
              </div>
            )}

            {/* Skills */}
            {offer.skills_required && offer.skills_required.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Required Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {offer.skills_required.map((skill, idx) => (
                    <span key={idx} className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded border border-gray-200">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Benefits */}
            {offer.benefits && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Benefits</h2>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">{offer.benefits}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Info */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Position Details</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Department</p>
                  <p className="text-sm font-medium text-gray-900">{offer.interest_tag}</p>
                </div>

                {offer.location && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Location</p>
                    <p className="text-sm font-medium text-gray-900">{offer.location}</p>
                  </div>
                )}

                {offer.duration_months && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Duration</p>
                    <p className="text-sm font-medium text-gray-900">{offer.duration_months} months</p>
                  </div>
                )}

                {offer.salary_range && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Salary Range</p>
                    <p className="text-sm font-medium text-gray-900">{offer.salary_range}</p>
                  </div>
                )}

                {(offer.paid || offer.remote_possible) && (
                  <div className="pt-4 border-t border-gray-200 space-y-2">
                    {offer.paid && (
                      <div className="flex items-center gap-2 text-sm text-green-700">
                        <CheckCircle className="w-4 h-4" />
                        Paid Position
                      </div>
                    )}
                    {offer.remote_possible && (
                      <div className="flex items-center gap-2 text-sm text-blue-700">
                        <CheckCircle className="w-4 h-4" />
                        Remote Possible
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                onClick={handleBookInterview}
                className="w-full mt-6 px-4 py-3 bg-[#007e40] text-white rounded-lg hover:bg-[#006633] transition-colors font-medium"
              >
                Book Interview
              </button>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-2 md:p-4">
          <div className="bg-card rounded-2xl border border-border max-w-4xl w-full max-h-[95vh] md:max-h-[90vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="relative bg-gradient-to-br from-primary/5 via-card to-card border-b border-border/50 p-4 md:p-5 flex-shrink-0">
              <div className="absolute inset-0 opacity-5">
                <div className="absolute top-0 right-0 w-48 h-48 bg-primary rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary rounded-full blur-3xl"></div>
              </div>
              
              <div className="relative flex items-center gap-3 md:gap-4">
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center overflow-hidden bg-gradient-to-br from-white to-slate-50 shadow-md ring-1 ring-primary/10 flex-shrink-0">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg md:text-xl font-bold text-foreground mb-1 flex items-center gap-2">
                    <Calendar className="w-4 h-4 md:w-5 md:h-5 text-primary flex-shrink-0" />
                    <span className="truncate">Book Interview</span>
                  </h2>
                  <p className="text-sm font-semibold text-foreground truncate">{offer.title}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <p className="text-xs text-primary font-semibold flex items-center gap-1.5 truncate">
                      <Briefcase className="w-3 h-3 flex-shrink-0" />
                      {offer.company_name}
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => setShowBookingModal(false)}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted/80 p-2 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-primary shadow-sm hover:shadow flex-shrink-0"
                  aria-label="Close dialog"
                >
                  <X className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 md:p-6 overflow-y-auto flex-1">
              {bookingLimit && (
                <div className={`mb-4 p-3 md:p-4 rounded-xl border backdrop-blur-sm ${
                  bookingLimit.can_book 
                    ? 'bg-gradient-to-br from-blue-50 to-blue-50/50 border-blue-200' 
                    : 'bg-gradient-to-br from-red-50 to-red-50/50 border-red-200'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${bookingLimit.can_book ? 'bg-blue-500/10' : 'bg-red-500/10'}`}>
                      {bookingLimit.can_book ? (
                        <Briefcase className="w-4 h-4 text-blue-600" />
                      ) : (
                        <X className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className={`text-xs md:text-sm font-bold ${
                          bookingLimit.can_book ? 'text-blue-900' : 'text-red-900'
                        }`}>
                          {bookingLimit.message}
                        </p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          bookingLimit.can_book 
                            ? 'bg-blue-500/20 text-blue-700' 
                            : 'bg-red-500/20 text-red-700'
                        }`}>
                          {bookingLimit.current_count}/{bookingLimit.max_allowed}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {validationWarning && (
                <div className="mb-4 p-3 md:p-4 bg-gradient-to-br from-orange-50 to-orange-50/50 border border-orange-200 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500/10 rounded-lg">
                      <Clock className="w-4 h-4 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-orange-900 mb-0.5">Time Conflict</p>
                      <p className="text-xs text-orange-800">{validationWarning}</p>
                    </div>
                  </div>
                </div>
              )}

              {loadingSlots ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="relative mb-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-3 border-primary/20 border-t-primary"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-primary animate-pulse" />
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground font-semibold">Finding slots...</p>
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="text-center py-12 animate-fade-in">
                  <div className="relative inline-block mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-muted/50 to-muted/20 rounded-2xl flex items-center justify-center shadow-inner">
                      <Calendar className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                    <div className="absolute -top-1 -right-1 bg-orange-500 rounded-full p-1.5 shadow-md">
                      <X className="w-3 h-3 text-white" />
                    </div>
                  </div>
                  <h3 className="font-bold text-foreground mb-2 text-base">No Available Slots</h3>
                  <p className="text-muted-foreground text-xs mb-4 max-w-xs mx-auto">
                    All slots for <span className="font-semibold text-foreground">{offer.company_name}</span> are booked.
                  </p>
                  <button
                    onClick={() => setShowBookingModal(false)}
                    className="px-4 py-2 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-lg hover:shadow-lg transition-all text-sm font-semibold shadow-sm hover:scale-105 active:scale-95 inline-flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Close
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-primary/10 rounded-lg">
                          <Clock className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-foreground">Available Slots</h3>
                          <p className="text-xs text-muted-foreground">Select your time</p>
                        </div>
                      </div>
                      <span className="text-xs bg-muted px-3 py-1 rounded-full font-semibold">
                        {availableSlots.length}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3 mb-4">
                    {availableSlots.map((slot, idx) => {
                      const capacity = slot.capacity || 1;
                      const spotsLeft = capacity - slot.bookings_count;
                      const isLowCapacity = spotsLeft <= 2;
                      const isSelected = selectedSlotId === slot.id;
                      const slotDate = new Date(slot.start_time);

                      return (
                        <button
                          key={slot.id}
                          onClick={() => {
                            setSelectedSlotId(slot.id);
                            checkSlotConflict(slot.id);
                          }}
                          style={{ animationDelay: `${idx * 20}ms` }}
                          className={`relative p-3 rounded-xl border-2 transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary ${
                            isSelected 
                              ? 'border-primary bg-gradient-to-br from-primary/15 to-primary/5 shadow-lg scale-105' 
                              : 'border-border hover:border-primary/50 bg-card hover:shadow-md'
                          }`}
                        >
                          <div className="mb-2.5">
                            <div className="text-base font-bold text-foreground flex items-center gap-1.5 mb-1">
                              <Clock className="w-4 h-4 text-primary flex-shrink-0" />
                              <span className="truncate leading-tight">
                                {slotDate.toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                            <div className="text-sm font-semibold text-foreground/90 truncate">
                              {slotDate.toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </div>
                          </div>

                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-full border ${
                            isLowCapacity 
                              ? 'bg-orange-500/20 text-orange-700 border-orange-500/40' 
                              : 'bg-green-500/20 text-green-700 border-green-500/40'
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${isLowCapacity ? 'bg-orange-600' : 'bg-green-600'} animate-pulse`}></div>
                            <span>{spotsLeft} left</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {selectedSlotId && (
                    <button
                      onClick={() => confirmBooking(selectedSlotId)}
                      disabled={!bookingLimit?.can_book || !!validationWarning || booking}
                      className="w-full px-5 py-3.5 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-xl hover:shadow-lg transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md hover:scale-105 active:scale-95 disabled:hover:scale-100"
                    >
                      {booking ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Booking...</span>
                        </>
                      ) : validationWarning ? (
                        <>
                          <X className="w-5 h-5" />
                          <span>Cannot Book - Time Conflict</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5" />
                          <span>Confirm Booking</span>
                        </>
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </StudentLayout>
  );
}
