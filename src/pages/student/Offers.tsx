import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Briefcase, Building2, MapPin, Calendar, Clock, X, Search } from 'lucide-react';
import { extractNestedObject, assertSupabaseType } from '@/utils/supabaseTypes';

type Offer = {
  id: string;
  title: string;
  description: string;
  interest_tag: string;
  location: string | null;
  duration_months: number | null;
  paid: boolean | null;
  remote_possible: boolean | null;
  salary_range: string | null;
  skills_required: string[] | null;
  department: string | null;
  company_id: string;
  company_name: string;
  company_logo: string | null;
};

type Slot = {
  id: string;
  start_time: string;
  end_time: string;
  location: string | null;
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

export default function StudentOffers() {
  const [loading, setLoading] = useState(true);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTag, setFilterTag] = useState<string>('');
  const [filterPaid, setFilterPaid] = useState<string>('');
  const [events, setEvents] = useState<Array<{ id: string; name: string; date: string }>>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [bookingLimit, setBookingLimit] = useState<BookingLimitInfo | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const [validationWarning, setValidationWarning] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkStudentAndLoadOffers();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      loadOffers();
    }
  }, [selectedEventId]);

  const checkStudentAndLoadOffers = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/login');
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle(); // Use maybeSingle() to avoid 406 errors

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      navigate('/login');
      return;
    }

    if (!profile || profile.role !== 'student') {
      navigate('/offers');
      return;
    }

    // Load events
    const { data: eventsData } = await supabase
      .from('events')
      .select('id, name, date')
      .gte('date', new Date().toISOString())
      .order('date', { ascending: true });

    if (eventsData && eventsData.length > 0) {
      setEvents(eventsData);
      setSelectedEventId(eventsData[0].id);
    } else {
      setLoading(false);
    }
  };

  const loadOffers = async () => {
    if (!selectedEventId) return;

    setLoading(true);
    const { data: offersData } = await supabase
      .from('offers')
      .select(`
        id,
        title,
        description,
        interest_tag,
        location,
        duration_months,
        paid,
        remote_possible,
        salary_range,
        skills_required,
        department,
        company_id,
        companies (
          company_name,
          logo_url
        )
      `)
      .eq('is_active', true)
      .eq('event_id', selectedEventId)
      .order('created_at', { ascending: false });

    if (offersData) {
      const formattedOffers: Offer[] = offersData.map((offer: any) => ({
        id: offer.id,
        title: offer.title,
        description: offer.description,
        interest_tag: offer.interest_tag,
        location: offer.location,
        duration_months: offer.duration_months,
        paid: offer.paid,
        remote_possible: offer.remote_possible,
        salary_range: offer.salary_range,
        skills_required: offer.skills_required,
        department: offer.department,
        company_id: offer.company_id,
        company_name: offer.companies?.company_name || 'Unknown Company',
        company_logo: offer.companies?.logo_url || null,
      }));

      setOffers(formattedOffers);
    }

    setLoading(false);
  };

  const handleBookInterview = async (offer: Offer) => {
    setSelectedOffer(offer);
    setLoadingSlots(true);
    setValidationWarning(null);
    setSelectedSlotId(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check booking limits
    const { data: limitData } = await supabase.rpc('fn_check_student_booking_limit', {
      p_student_id: user.id,
      p_event_id: selectedEventId
    });

    if (limitData && limitData.length > 0) {
      setBookingLimit(limitData[0]);
    }

    console.log('🔵 Fetching slots with filters:', {
      company_id: offer.company_id,
      event_id: selectedEventId,
      offer_id: offer.id,
      current_time: new Date().toISOString()
    });

    // Get all slots for this company and offer for the selected event
    // Slots are linked to offers via offer_id
    const { data: slotsData, error: slotsError } = await supabase
      .from('event_slots')
      .select('id, start_time, end_time, location, capacity, offer_id')
      .eq('company_id', offer.company_id)
      .eq('event_id', selectedEventId)
      .eq('offer_id', offer.id)  // Only show slots for this specific offer
      .eq('is_active', true)
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true });

    if (slotsError) {
      console.error('🔴 Error fetching slots:', slotsError);
    }

    console.log('🔵 Slots fetched:', slotsData?.length || 0, slotsData);

    if (slotsData) {
      // Count bookings for each slot
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

      // Filter out full slots
      const available = slotsWithCounts.filter(
        (slot) => slot.bookings_count < slot.capacity
      );

      console.log('🔵 Available slots after filtering:', available.length, available);
      console.log('🔵 Slots filtered out (full):', slotsWithCounts.length - available.length);

      setAvailableSlots(available);
    }

    setLoadingSlots(false);
  };

  const checkSlotConflict = async (slotId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const selectedSlot = availableSlots.find(s => s.id === slotId);
    if (!selectedSlot) return;

    // Check for time conflicts with existing bookings
    const { data: existingBookings } = await supabase
      .from('bookings')
      .select('event_slots!slot_id(start_time, end_time, companies(company_name))')
      .eq('student_id', user.id)
      .eq('status', 'confirmed');

    if (existingBookings && existingBookings.length > 0) {
      const slotStart = new Date(selectedSlot.start_time);
      const slotEnd = new Date(selectedSlot.end_time);

      // Check for time conflicts with existing bookings
      // Supabase nested queries require type assertions for proper typing
      for (const booking of existingBookings) {
        const eventSlot = assertSupabaseType<{ 
          start_time: string; 
          end_time: string; 
          companies: { company_name: string } | null;
        } | null>(booking.event_slots);
        
        if (!eventSlot) continue;
        
        const bookingStart = new Date(eventSlot.start_time);
        const bookingEnd = new Date(eventSlot.end_time);

        // Check for time overlap
        if (slotStart < bookingEnd && slotEnd > bookingStart) {
          // Extract company name from nested query result
          const company = extractNestedObject<{ company_name: string }>(eventSlot.companies);
          const companyName = company?.company_name || 'Unknown Company';
          setValidationWarning(
            `⚠️ Time conflict detected! You already have an interview with ${companyName} at ${bookingStart.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
          );
          return;
        }
      }
    }

    setValidationWarning(null);
  };

  const confirmBooking = async (slotId: string) => {
    if (!selectedOffer) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Final validation check
      if (bookingLimit && !bookingLimit.can_book) {
        alert('You have reached your booking limit for this phase.');
        return;
      }

      const { data, error } = await supabase.rpc('fn_book_interview', {
        p_student_id: user.id,
        p_slot_id: slotId
      });

      if (error) throw error;

      const result = Array.isArray(data) && data.length > 0 ? data[0] : null;

      if (result?.success) {
        alert(result.message || 'Interview booked successfully!');
        setSelectedOffer(null);
        setAvailableSlots([]);
        navigate('/student/bookings');
      } else {
        throw new Error(result?.message || 'Failed to book interview');
      }
    } catch (error: any) {
      console.error('Error booking interview:', error);
      alert(error.message || 'Failed to book interview. Please check booking limits and phase restrictions.');
    }
  };

  const filteredOffers = offers.filter((offer) => {
    const matchesSearch =
      searchQuery === '' ||
      offer.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      offer.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      offer.company_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTag = filterTag === '' || offer.interest_tag === filterTag;
    const matchesPaid =
      filterPaid === '' ||
      (filterPaid === 'paid' && offer.paid === true) ||
      (filterPaid === 'unpaid' && offer.paid === false);

    return matchesSearch && matchesTag && matchesPaid;
  });

  const uniqueTags = [...new Set(offers.map((o) => o.interest_tag))];

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground animate-pulse">Loading offers...</p>
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
              <h1 className="text-2xl font-bold text-foreground">Browse Offers</h1>
              <p className="text-sm text-muted-foreground mt-1">Find your perfect internship</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Event Selector */}
        {events.length > 0 && (
          <div className="bg-card rounded-xl border border-border p-4 mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              Select Event
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full md:w-auto px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
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
        )}

        {/* Filters */}
        <div className="bg-card rounded-xl border border-border p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search offers, companies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              className="px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Departments</option>
              {uniqueTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
            <select
              value={filterPaid}
              onChange={(e) => setFilterPaid(e.target.value)}
              className="px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">All Compensation</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            {filteredOffers.length} offer{filteredOffers.length !== 1 ? 's' : ''} available
          </p>
        </div>

        {/* Offers Grid */}
        {filteredOffers.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center animate-fade-in">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Briefcase className="w-10 h-10 text-muted-foreground opacity-50" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">No offers found</h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery || filterTag || filterPaid 
                ? "Try adjusting your filters to see more results" 
                : "There are no active offers for this event yet"}
            </p>
            {(searchQuery || filterTag || filterPaid) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterTag('');
                  setFilterPaid('');
                }}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            {filteredOffers.map((offer, index) => (
              <div
                key={offer.id}
                className="bg-card rounded-xl border border-border p-6 hover:border-primary hover:shadow-elegant transition-all animate-fade-in group"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <Link to={`/student/offers/${offer.id}`} className="block mb-4">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                        {offer.company_name}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">{offer.title}</p>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                    {offer.description}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                      {offer.interest_tag}
                    </span>
                    {offer.paid && (
                      <span className="px-3 py-1 bg-green-500/10 text-green-600 text-xs font-medium rounded-full">
                        💰 Paid
                      </span>
                    )}
                    {offer.remote_possible && (
                      <span className="px-3 py-1 bg-blue-500/10 text-blue-600 text-xs font-medium rounded-full">
                        🏠 Remote
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 mb-4 text-sm">
                    {offer.location && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        {offer.location}
                      </div>
                    )}
                    {offer.duration_months && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        {offer.duration_months} months
                      </div>
                    )}
                  </div>
                </Link>

                <button
                  onClick={() => handleBookInterview(offer)}
                  className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all text-sm font-medium hover:scale-105 active:scale-95"
                >
                  Book Interview
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Booking Modal */}
      {selectedOffer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl border border-border max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-card border-b border-border p-6 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground mb-1">
                  Select Interview Time
                </h2>
                <p className="text-sm text-muted-foreground">
                  {selectedOffer.title} at {selectedOffer.company_name}
                </p>
              </div>
              <button
                onClick={() => setSelectedOffer(null)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {/* Booking Limit Info */}
              {bookingLimit && (
                <div className={`mb-4 p-4 rounded-lg border ${
                  bookingLimit.can_book 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <p className={`text-sm font-medium ${
                    bookingLimit.can_book ? 'text-blue-900' : 'text-red-900'
                  }`}>
                    {bookingLimit.message}
                  </p>
                  {bookingLimit.can_book && bookingLimit.current_count === bookingLimit.max_allowed - 1 && (
                    <p className="text-xs text-orange-600 mt-1">
                      ⚠️ This will be your last booking for this phase!
                    </p>
                  )}
                </div>
              )}

              {/* Validation Warning */}
              {validationWarning && (
                <div className="mb-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <p className="text-sm text-orange-900">{validationWarning}</p>
                </div>
              )}

              {loadingSlots ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3"></div>
                  <p className="text-sm text-muted-foreground animate-pulse">Finding available slots...</p>
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="text-center py-12 animate-fade-in">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-muted-foreground opacity-50" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">No Available Slots</h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    All interview slots for this company are currently booked
                  </p>
                  <button
                    onClick={() => setSelectedOffer(null)}
                    className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors text-sm"
                  >
                    Browse Other Offers
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-4 animate-fade-in">
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
                            {new Date(slot.start_time).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}{' '}
                            -{' '}
                            {new Date(slot.end_time).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                          <div className="text-xs text-muted-foreground mb-2">
                            {new Date(slot.start_time).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </div>
                          <div className={`absolute top-2 right-2 px-2 py-0.5 text-xs rounded-full ${
                            isLowCapacity 
                              ? 'bg-orange-500/10 text-orange-600' 
                              : 'bg-green-500/10 text-green-600'
                          }`}>
                            {spotsLeft} left
                          </div>
                          {slot.location && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate">{slot.location}</span>
                            </div>
                          )}
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