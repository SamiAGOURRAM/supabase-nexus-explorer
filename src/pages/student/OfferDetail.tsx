import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Building2, MapPin, Clock, DollarSign, Tag, Briefcase, CheckCircle, Calendar, X } from 'lucide-react';

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
  const [offer, setOffer] = useState<Offer | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [bookingLimit, setBookingLimit] = useState<BookingLimitInfo | null>(null);
  const [validationWarning, setValidationWarning] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string>('');

  useEffect(() => {
    loadOfferDetail();
  }, [id]);

  const loadOfferDetail = async () => {
    if (!id) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/login');
      return;
    }

    // Get the latest active event
    const { data: eventsData } = await supabase
      .from('events')
      .select('id')
      .gte('date', new Date().toISOString())
      .order('date', { ascending: true })
      .limit(1);

    if (eventsData && eventsData.length > 0) {
      setEventId(eventsData[0].id);
    }

    const { data: offerData, error } = await supabase
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
      .single();

    if (error || !offerData) {
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
      company_name: offerData.companies?.company_name || 'Unknown',
      company_logo: offerData.companies?.logo_url || null,
      company_description: offerData.companies?.description || null,
      company_website: offerData.companies?.website || null,
      company_industry: offerData.companies?.industry || null,
    });

    setLoading(false);
  };

  const handleBookInterview = async () => {
    if (!offer || !eventId) return;

    setShowBookingModal(true);
    setLoadingSlots(true);
    setValidationWarning(null);
    setSelectedSlotId(null);

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

    // Get slots
    const { data: slotsData } = await supabase
      .from('event_slots')
      .select('id, start_time, end_time, capacity')
      .eq('company_id', offer.company_id)
      .eq('event_id', eventId)
      .eq('is_active', true)
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true });

    if (slotsData) {
      const slotsWithCounts = await Promise.all(
        slotsData.map(async (slot) => {
          const { count } = await supabase
            .from('interview_bookings')
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
        (slot) => slot.bookings_count < slot.capacity
      );

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
      .from('interview_bookings')
      .select('slot_id')
      .eq('student_id', user.id)
      .eq('status', 'confirmed');

    if (error) {
      console.error('Error checking conflicts:', error);
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
        console.error('Error fetching slots:', slotsError);
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (bookingLimit && !bookingLimit.can_book) {
        alert('You have reached your booking limit for this phase.');
        return;
      }

      const { data, error } = await supabase.rpc('fn_book_interview', {
        p_student_id: user.id,
        p_slot_id: slotId,
        p_offer_id: offer.id
      });

      if (error) throw error;

      if (data && data.success) {
        alert('Interview booked successfully!');
        setShowBookingModal(false);
        navigate('/student/bookings');
      } else {
        throw new Error(data?.error_message || 'Failed to book interview');
      }
    } catch (error: any) {
      console.error('Error booking interview:', error);
      alert(error.message || 'Failed to book interview.');
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
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground animate-pulse">Loading offer...</p>
        </div>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground mb-2">Offer Not Found</h2>
          <p className="text-muted-foreground mb-4">This offer may have been removed or is no longer active.</p>
          <Link to="/student/offers" className="text-primary hover:underline">
            Back to Offers
          </Link>
        </div>
      </div>
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
                  <p className="text-muted-foreground text-sm">All slots are currently booked</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 mb-4">
                    {availableSlots.map((slot) => {
                      const spotsLeft = slot.capacity - slot.bookings_count;
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
                      disabled={!bookingLimit?.can_book || !!validationWarning}
                      className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {validationWarning ? 'Cannot Book - Time Conflict' : 'Confirm Booking'}
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
