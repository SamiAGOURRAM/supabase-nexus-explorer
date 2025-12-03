import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { Briefcase, MapPin, Calendar, Clock, X, Search, ArrowLeft } from 'lucide-react';
import { debug, error as logError } from '@/utils/logger';
import EmptyState from '@/components/shared/EmptyState';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import StudentLayout from '@/components/student/StudentLayout';
import { useAuth } from '@/hooks/useAuth';

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
  const [error, setError] = useState<Error | null>(null);
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
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [booking, setBooking] = useState(false);
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  const { signOut } = useAuth('student');
  const modalCloseRef = useRef<HTMLButtonElement | null>(null);
  const modalOverlayRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    checkStudentAndLoadOffers();
  }, []);

  // Close modal on ESC and focus management
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedOffer) {
        setSelectedOffer(null);
      }
    };

    if (selectedOffer) {
      // focus the close button for keyboard users
      setTimeout(() => modalCloseRef.current?.focus(), 0);
      document.addEventListener('keydown', onKey);
    }

    return () => document.removeEventListener('keydown', onKey);
  }, [selectedOffer]);

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
      logError('Profile fetch error:', profileError);
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

    try {
      setError(null);
      setLoading(true);
      
      const { data: offersData, error: offersError } = await supabase
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

      if (offersError) {
        throw new Error(`Failed to load offers: ${offersError.message}`);
      }

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
      } else {
        setOffers([]);
      }
    } catch (err: any) {
      logError('Error loading offers:', err);
      const errorMessage = err instanceof Error ? err : new Error('Failed to load offers');
      setError(errorMessage);
      showError('Failed to load offers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBookInterview = async (offer: Offer) => {
    setSelectedOffer(offer);
    setLoadingSlots(true);
    setValidationWarning(null);
    setBookingError(null);
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

    debug('Fetching slots with filters:', {
      company_id: offer.company_id,
      event_id: selectedEventId,
      offer_id: offer.id,
      company_name: offer.company_name,
      offer_title: offer.title,
      current_time: new Date().toISOString()
    });

    // Get all slots for this company for the selected event
    // Note: Slots are generated per company, not per offer
    // When admin creates sessions, slots are linked to companies, not specific offers
    const { data: slotsData, error: slotsError } = await supabase
      .from('event_slots')
      .select('id, start_time, end_time, location, capacity, offer_id, company_id, event_id, is_active')
      .eq('company_id', offer.company_id)
      .eq('event_id', selectedEventId)
      // Removed .eq('offer_id', offer.id) - slots are per company, not per offer
      .eq('is_active', true)
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true });

    if (slotsError) {
      logError('Error fetching slots:', slotsError);
      alert(`Error fetching slots: ${slotsError.message}`);
    }

    debug('Slots fetched:', slotsData?.length || 0);

    if (slotsData) {
      debug('Processing', slotsData.length, 'slots to check capacity...');
      
      // Count bookings for each slot
      const slotsWithCounts = await Promise.all(
        slotsData.map(async (slot) => {
          const { count, error: countError } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('slot_id', slot.id)
            .eq('status', 'confirmed');

          if (countError) {
            logError('Error counting bookings for slot:', countError);
          }

          return {
            ...slot,
            bookings_count: count || 0,
          };
        })
      );

      // Filter out full slots
      // Default capacity to 1 if null/undefined (single interview slot)
      const available = slotsWithCounts.filter(
        (slot) => slot.bookings_count < (slot.capacity || 1)
      );

      debug('Available slots after filtering:', available.length, 'out of', slotsWithCounts.length);

      if (available.length === 0 && slotsWithCounts.length > 0) {
        logError('All slots are full! All', slotsWithCounts.length, 'slots have reached capacity');
      }

      setAvailableSlots(available);
    }

    setLoadingSlots(false);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === modalOverlayRef.current) {
      setSelectedOffer(null);
    }
  };

  const checkSlotConflict = async (slotId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Clear previous errors when checking a new slot
    setBookingError(null);

    const selectedSlot = availableSlots.find(s => s.id === slotId);
    if (!selectedSlot) return;

    // Get existing bookings - simplified query to avoid nested join issues
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

          // Check for time overlap
          if (slotStart < bookingEnd && slotEnd > bookingStart) {
            // Get company name separately to avoid nested join issues
            const { data: company } = await supabase
              .from('companies')
              .select('company_name')
              .eq('id', existingSlot.company_id)
              .single();

            const companyName = company?.company_name || 'Unknown Company';
            setValidationWarning(
              `⚠️ Time conflict detected! You already have an interview with ${companyName} at ${bookingStart.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
            );
            return;
          }
        }
      }
    }

    setValidationWarning(null);
  };

  const confirmBooking = async (slotId: string) => {
    if (!selectedOffer) return;

    // Clear previous errors
    setBookingError(null);

    try {
      setBooking(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showError('You must be logged in to book an interview');
        return;
      }

      // Final validation check
      if (bookingLimit && !bookingLimit.can_book) {
        const errorMsg = 'You have reached your booking limit for this phase.';
        setBookingError(errorMsg);
        showError(errorMsg);
        return;
      }

      // Use the offer_id from the selected offer
      if (!selectedOffer?.id) {
        const errorMsg = 'Offer ID not found';
        setBookingError(errorMsg);
        showError(errorMsg);
        return;
      }

      const { data, error } = await supabase.rpc('fn_book_interview', {
        p_student_id: user.id,
        p_slot_id: slotId,
        p_offer_id: selectedOffer.id
      });

      if (error) throw error;

      const result = Array.isArray(data) && data.length > 0 ? data[0] : null;

      if (result?.success) {
        // Success! Show success message and navigate
        showSuccess(result.message || 'Interview booked successfully!');
        setSelectedOffer(null);
        setAvailableSlots([]);
        setSelectedSlotId(null);
        // Refresh offers to update availability
        await loadOffers();
        // Small delay before navigation for better UX
        setTimeout(() => {
          navigate('/student/bookings');
        }, 1000);
      } else {
        // Show error message in UI
        const errorMsg = result?.message || 'Failed to book interview';
        setBookingError(errorMsg);
        showError(errorMsg);
      }
    } catch (error: any) {
      logError('Error booking interview:', error);
      const errorMsg = error.message || 'Failed to book interview. Please check booking limits and phase restrictions.';
      setBookingError(errorMsg);
      showError(errorMsg);
    } finally {
      setBooking(false);
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

  if (loading && offers.length === 0) {
    return (
      <StudentLayout onSignOut={signOut}>
        <div className="p-6 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground">Browse Offers</h1>
              <p className="text-muted-foreground text-sm md:text-base mt-1">Find your perfect internship</p>
            </div>
          {/* Skeleton Loading */}
          <div className="space-y-6">
            {/* Event selector skeleton */}
            <div className="bg-card/50 rounded-xl border border-border p-4 animate-pulse">
              <div className="h-4 w-24 bg-muted rounded mb-2"></div>
              <div className="h-10 w-full md:w-64 bg-muted rounded"></div>
            </div>
            
            {/* Filters skeleton */}
            <div className="bg-card/50 rounded-xl border border-border p-6 animate-pulse">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-2 h-10 bg-muted rounded-lg"></div>
                <div className="h-10 bg-muted rounded-lg"></div>
                <div className="h-10 bg-muted rounded-lg"></div>
              </div>
            </div>
            
            {/* Cards skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-card/50 rounded-xl border border-border p-6 animate-pulse">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 bg-muted rounded-lg flex-shrink-0"></div>
                    <div className="flex-1">
                      <div className="h-4 w-3/4 bg-muted rounded mb-2"></div>
                      <div className="h-3 w-1/2 bg-muted rounded"></div>
                    </div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="h-3 w-full bg-muted rounded"></div>
                    <div className="h-3 w-5/6 bg-muted rounded"></div>
                    <div className="h-3 w-4/6 bg-muted rounded"></div>
                  </div>
                  <div className="flex gap-2 mb-4">
                    <div className="h-6 w-20 bg-muted rounded-full"></div>
                    <div className="h-6 w-16 bg-muted rounded-full"></div>
                  </div>
                  <div className="h-10 w-full bg-muted rounded-lg"></div>
                </div>
              ))}
            </div>
          </div>
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout onSignOut={signOut}>
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
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#ffb300] rounded-full mix-blend-screen filter blur-3xl opacity-5" />
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[#007e40] rounded-full mix-blend-screen filter blur-3xl opacity-5" />
          
          <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-12 md:py-16">
            <div className="mb-6">
              <div className="inline-block mb-3">
                <div className="flex items-center gap-2 px-4 py-1.5 bg-white/5 backdrop-blur-sm rounded-full border border-white/10">
                  <Briefcase className="w-4 h-4 text-[#ffb300]" />
                  <span className="text-sm text-white/80 font-medium">{filteredOffers.length} {filteredOffers.length === 1 ? 'Offer' : 'Offers'} Available</span>
                </div>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 leading-tight">
                Browse Offers
              </h1>
              <p className="text-lg text-white/70 max-w-2xl">
                Find your perfect internship opportunity
              </p>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </section>

        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8 space-y-6">

          {error && (
            <div>
              <ErrorDisplay error={error} onRetry={loadOffers} />
            </div>
          )}

          {/* Event Selector */}
          {events.length > 0 && (
            <div className="bg-card/80 backdrop-blur-sm rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="w-4 h-4 text-primary" />
              </div>
              <label className="text-sm font-semibold text-foreground">
                Select Event
              </label>
            </div>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all hover:border-primary/50"
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
          <div className="bg-card/80 backdrop-blur-sm rounded-xl border border-border shadow-sm hover:shadow-md transition-shadow p-6">
          <div className="flex items-center gap-2 mb-4">
            <Search className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Filter & Search</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search offers, companies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all hover:border-primary/50"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              className="px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all hover:border-primary/50"
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
              className="px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all hover:border-primary/50"
            >
              <option value="">All Compensation</option>
              <option value="paid">💰 Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
          </div>
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Showing <span className="font-semibold text-foreground">{filteredOffers.length}</span> of <span className="font-semibold text-foreground">{offers.length}</span> offer{offers.length !== 1 ? 's' : ''}
            </p>
            {(searchQuery || filterTag || filterPaid) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterTag('');
                  setFilterPaid('');
                }}
                className="text-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
              >
                <X className="w-3 h-3" />
                Clear filters
              </button>
            )}
          </div>
          </div>

          {/* Offers Grid */}
        {filteredOffers.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title={searchQuery || filterTag || filterPaid ? "No offers match your filters" : "No offers available"}
            message={
              searchQuery || filterTag || filterPaid 
                ? "We couldn't find any offers matching your filters. Try adjusting your search criteria to see more results." 
                : "There are no active offers for this event yet. Check back soon or contact your administrator."
            }
            action={
              (searchQuery || filterTag || filterPaid) ? (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterTag('');
                    setFilterPaid('');
                  }}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all font-medium shadow-sm hover:shadow-md inline-flex items-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Clear All Filters
                </button>
              ) : undefined
            }
            className="bg-card/80 backdrop-blur-sm rounded-2xl border-2 border-dashed border-border p-12"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
            {filteredOffers.map((offer, index) => (
              <div
                key={offer.id}
                className="bg-card/80 backdrop-blur-sm rounded-xl border border-border p-6 hover:border-primary/50 hover:shadow-lg transition-all duration-300 animate-fade-in group relative overflow-hidden"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Gradient background effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                
                <div className="relative z-10">
                  <Link to={`/student/offers/${offer.id}`} className="block mb-4" aria-label={`View details for ${offer.title} at ${offer.company_name}`}>
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden bg-gradient-to-br from-slate-100 to-slate-50 shadow-sm group-hover:shadow-md transition-shadow">
                        {offer.company_logo ? (
                          <img src={offer.company_logo} alt={`${offer.company_name} logo`} className="w-14 h-14 object-cover" />
                        ) : (
                          <div className="w-14 h-14 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl flex items-center justify-center text-primary font-bold text-lg">
                            {offer.company_name.split(' ').map(s => s[0]).slice(0,2).join('').toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-foreground mb-1 group-hover:text-primary transition-colors truncate text-lg">
                          {offer.company_name}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-1 font-medium">{offer.title}</p>
                        {offer.department && (
                          <p className="text-xs text-muted-foreground/60 mt-1">{offer.department}</p>
                        )}
                      </div>
                      {offer.salary_range && (
                        <div className="text-right ml-2">
                          <div className="text-sm font-semibold text-primary">{offer.salary_range}</div>
                        </div>
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3 leading-relaxed">
                      {offer.description}
                    </p>

                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="px-3 py-1.5 bg-primary/10 text-primary text-xs font-semibold rounded-full shadow-sm">
                        {offer.interest_tag}
                      </span>
                      {offer.paid && (
                        <span className="px-3 py-1.5 bg-gradient-to-r from-green-500/10 to-emerald-500/10 text-green-600 text-xs font-semibold rounded-full shadow-sm">
                          💰 Paid
                        </span>
                      )}
                      {offer.remote_possible && (
                        <span className="px-3 py-1.5 bg-gradient-to-r from-blue-500/10 to-cyan-500/10 text-blue-600 text-xs font-semibold rounded-full shadow-sm">
                          🏠 Remote
                        </span>
                      )}
                    </div>

                    {offer.skills_required && offer.skills_required.length > 0 && (
                      <div className="mb-4 p-3 bg-muted/30 rounded-lg border border-border/50">
                        <p className="text-xs font-medium text-muted-foreground mb-1.5">Required Skills</p>
                        <div className="flex flex-wrap gap-1.5">
                          {offer.skills_required.slice(0, 4).map((skill, i) => (
                            <span key={i} className="px-2 py-0.5 bg-background text-foreground text-xs rounded border border-border">
                              {skill}
                            </span>
                          ))}
                          {offer.skills_required.length > 4 && (
                            <span className="px-2 py-0.5 text-muted-foreground text-xs">
                              +{offer.skills_required.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2 mb-4 text-sm">
                      {offer.location && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="w-4 h-4 text-primary/60" />
                          <span className="font-medium">{offer.location}</span>
                        </div>
                      )}
                      {offer.duration_months && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="w-4 h-4 text-primary/60" />
                          <span className="font-medium">{offer.duration_months} months duration</span>
                        </div>
                      )}
                    </div>
                  </Link>

                  <button
                    onClick={() => handleBookInterview(offer)}
                    aria-label={`Book interview with ${offer.company_name} - ${offer.title}`}
                    className="w-full px-4 py-3 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-lg hover:shadow-lg transition-all text-sm font-semibold hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 group/btn"
                  >
                    <Calendar className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                    Book Interview
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>

      {/* Booking Modal */}
        {selectedOffer && (
        <div ref={modalOverlayRef} onClick={handleOverlayClick} className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div role="dialog" aria-modal="true" aria-label="Select Interview Time" className="bg-card rounded-2xl border border-border/50 max-w-4xl w-full max-h-[85vh] overflow-hidden shadow-2xl animate-scale-in flex flex-col">
            {/* Modal Header - Compact */}
            <div className="relative bg-gradient-to-br from-primary/5 via-card to-card border-b border-border/50 p-4 md:p-5 flex-shrink-0">
              {/* Decorative background pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute top-0 right-0 w-48 h-48 bg-primary rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary rounded-full blur-3xl"></div>
              </div>
              
              <div className="relative flex items-center gap-3 md:gap-4">
                {/* Company Logo - Compact */}
                <div className="relative group flex-shrink-0">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center overflow-hidden bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 shadow-md ring-1 ring-primary/10 group-hover:ring-primary/30 transition-all">
                    {selectedOffer.company_logo ? (
                      <img src={selectedOffer.company_logo} alt={`${selectedOffer.company_name} logo`} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl flex items-center justify-center text-primary font-bold text-lg">
                        {selectedOffer.company_name.split(' ').map(s => s[0]).slice(0,2).join('').toUpperCase()}
                      </div>
                    )}
                  </div>
                  {/* Verified badge */}
                  <div className="absolute -bottom-0.5 -right-0.5 bg-green-500 rounded-full p-1 shadow-md ring-2 ring-card">
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                
                {/* Header Content - Compact */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg md:text-xl font-bold text-foreground mb-1 flex items-center gap-2">
                    <Calendar className="w-4 h-4 md:w-5 md:h-5 text-primary flex-shrink-0" />
                    <span className="truncate">Book Interview</span>
                  </h2>
                  <p className="text-sm font-semibold text-foreground truncate">
                    {selectedOffer.title}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <p className="text-xs text-primary font-semibold flex items-center gap-1.5 truncate">
                      <Briefcase className="w-3 h-3 flex-shrink-0" />
                      {selectedOffer.company_name}
                    </p>
                    {selectedOffer.location && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                        <MapPin className="w-3 h-3 flex-shrink-0" />
                        {selectedOffer.location}
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Close Button - Compact */}
                <button
                  ref={modalCloseRef}
                  onClick={() => setSelectedOffer(null)}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted/80 p-2 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-primary shadow-sm hover:shadow flex-shrink-0"
                  aria-label="Close dialog"
                >
                  <X className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="p-4 md:p-6 overflow-y-auto flex-1">
              {/* Booking Limit Info - Compact */}
              {bookingLimit && (
                <div className={`mb-4 p-3 md:p-4 rounded-xl border backdrop-blur-sm ${
                  bookingLimit.can_book 
                    ? 'bg-gradient-to-br from-blue-50 to-blue-50/50 border-blue-200 dark:from-blue-950/30 dark:to-blue-950/10 dark:border-blue-800/50' 
                    : 'bg-gradient-to-br from-red-50 to-red-50/50 border-red-200 dark:from-red-950/30 dark:to-red-950/10 dark:border-red-800/50'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${bookingLimit.can_book ? 'bg-blue-500/10' : 'bg-red-500/10'}`}>
                      {bookingLimit.can_book ? (
                        <Briefcase className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <X className="w-4 h-4 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className={`text-xs md:text-sm font-bold ${
                          bookingLimit.can_book ? 'text-blue-900 dark:text-blue-100' : 'text-red-900 dark:text-red-100'
                        }`}>
                          {bookingLimit.message}
                        </p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          bookingLimit.can_book 
                            ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300' 
                            : 'bg-red-500/20 text-red-700 dark:text-red-300'
                        }`}>
                          {bookingLimit.current_count}/{bookingLimit.max_allowed}
                        </span>
                      </div>
                      {bookingLimit.can_book && bookingLimit.current_count === bookingLimit.max_allowed - 1 && (
                        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-orange-700 dark:text-orange-300 font-semibold">
                          <span>⚠️</span>
                          <span>Last booking for this phase!</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Validation Warning - Compact */}
              {validationWarning && (
                <div className="mb-4 p-3 md:p-4 bg-gradient-to-br from-orange-50 to-orange-50/50 border border-orange-200 dark:from-orange-950/30 dark:to-orange-950/10 dark:border-orange-800/50 rounded-xl animate-shake">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500/10 rounded-lg">
                      <Clock className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-orange-900 dark:text-orange-100 mb-0.5">Time Conflict</p>
                      <p className="text-xs text-orange-800 dark:text-orange-200">{validationWarning}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Booking Error - Display API errors */}
              {bookingError && (
                <div className="mb-4 p-3 md:p-4 bg-gradient-to-br from-red-50 to-red-50/50 border border-red-200 dark:from-red-950/30 dark:to-red-950/10 dark:border-red-800/50 rounded-xl animate-shake">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-red-500/10 rounded-lg flex-shrink-0">
                      <X className="w-4 h-4 text-red-600 dark:text-red-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-red-900 dark:text-red-100 mb-0.5">Booking Failed</p>
                      <p className="text-xs text-red-800 dark:text-red-200">{bookingError}</p>
                    </div>
                    <button
                      onClick={() => setBookingError(null)}
                      className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors flex-shrink-0"
                      aria-label="Dismiss error"
                    >
                      <X className="w-3 h-3 text-red-600 dark:text-red-400" />
                    </button>
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
                    All slots for <span className="font-semibold text-foreground">{selectedOffer.company_name}</span> are booked.
                  </p>
                  <button
                    onClick={() => setSelectedOffer(null)}
                    className="px-4 py-2 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-lg hover:shadow-lg transition-all text-sm font-semibold shadow-sm hover:scale-105 active:scale-95 inline-flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Browse Other Offers
                  </button>
                </div>
              ) : (
                <>
                  {/* Slots Header - Compact */}
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
                    
                    {/* Legend - Compact */}
                    <div className="flex flex-wrap items-center gap-2 p-2 bg-muted/30 rounded-lg text-xs">
                      <span className="font-medium text-muted-foreground">Legend:</span>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 bg-green-500/20 border border-green-500/30 rounded-full"></div>
                        <span className="text-muted-foreground">3+ spots</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 bg-orange-500/20 border border-orange-500/30 rounded-full"></div>
                        <span className="text-muted-foreground">Limited</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Slots Grid - Compact & Responsive */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3 mb-4 animate-fade-in">
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
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedSlotId(slot.id); checkSlotConflict(slot.id); } }}
                          aria-pressed={isSelected}
                          tabIndex={0}
                          style={{ animationDelay: `${idx * 20}ms` }}
                          className={`relative p-3 rounded-xl border-2 transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary animate-fade-in ${
                            isSelected 
                              ? 'border-primary bg-gradient-to-br from-primary/15 to-primary/5 shadow-lg scale-105' 
                              : 'border-border hover:border-primary/50 bg-card hover:shadow-md'
                          }`}
                        >
                          {/* Time Display */}
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

                          {/* Capacity Badge */}
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-full border ${
                            isLowCapacity 
                              ? 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/40' 
                              : 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/40'
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${isLowCapacity ? 'bg-orange-600' : 'bg-green-600'} animate-pulse`}></div>
                            <span>{spotsLeft} left</span>
                          </div>

                          {/* Location - Only show if available and slot not too small */}
                          {slot.location && (
                            <div className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground mt-2 pt-2 border-t border-border/50">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{slot.location}</span>
                            </div>
                          )}

                          {/* Selected Indicator */}
                          {isSelected && (
                            <div className="absolute -top-1.5 -right-1.5 bg-primary rounded-full p-1 shadow-md ring-2 ring-card">
                              <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Confirm Button - Compact */}
                  {selectedSlotId && (
                    <div className="sticky bottom-0 pt-3 pb-1">
                      <button
                        onClick={() => confirmBooking(selectedSlotId)}
                        disabled={!bookingLimit?.can_book || !!validationWarning || booking}
                        className="w-full px-4 py-3 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-xl hover:shadow-xl transition-all duration-300 font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] shadow-md disabled:hover:scale-100 group relative overflow-hidden"
                      >
                        {/* Animated background */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
                        
                        <div className="relative flex items-center gap-2">
                          {validationWarning ? (
                            <>
                              <X className="w-5 h-5" />
                              <span>Time Conflict</span>
                            </>
                          ) : booking ? (
                            <>
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Booking...</span>
                            </>
                          ) : (
                            <>
                              <Calendar className="w-5 h-5 group-hover:scale-110 transition-transform" />
                              <span>Confirm Booking</span>
                              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                              </svg>
                            </>
                          )}
                        </div>
                      </button>
                      
                      {/* Helper text */}
                      <p className="text-center text-xs text-muted-foreground mt-2">
                        {validationWarning ? (
                          <span className="text-orange-600 dark:text-orange-400 font-medium">Select a different slot</span>
                        ) : (
                          <span>You'll receive confirmation by email</span>
                        )}
                      </p>
                    </div>
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