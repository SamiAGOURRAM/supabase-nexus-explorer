import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Briefcase, Building2, MapPin, Calendar, Clock, Users, X, DollarSign, Tag, Search } from 'lucide-react';

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

    // Get all slots for this company for the selected event
    const { data: slotsData } = await supabase
      .from('event_slots')
      .select('id, start_time, end_time, location, capacity')
      .eq('company_id', offer.company_id)
      .eq('event_id', selectedEventId)
      .eq('is_active', true)
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true });

    if (slotsData) {
      // Count bookings for each slot
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

      // Filter out full slots
      const available = slotsWithCounts.filter(
        (slot) => slot.bookings_count < slot.capacity
      );

      setAvailableSlots(available);
    }

    setLoadingSlots(false);
  };

  const confirmBooking = async (slotId: string) => {
    if (!selectedOffer) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase.rpc('fn_book_interview', {
        p_student_id: user.id,
        p_slot_id: slotId,
        p_offer_id: selectedOffer.id
      });

      if (error) throw error;

      if (data && data.success) {
        alert('Interview booked successfully!');
        setSelectedOffer(null);
        setAvailableSlots([]);
        navigate('/student/bookings');
      } else {
        throw new Error(data?.error_message || 'Failed to book interview');
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
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <Briefcase className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No offers found</h3>
            <p className="text-muted-foreground">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOffers.map((offer) => (
              <div
                key={offer.id}
                className="bg-card rounded-xl border border-border p-6 hover:border-primary hover:shadow-elegant transition-all"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-foreground mb-1">{offer.company_name}</h3>
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

                <button
                  onClick={() => handleBookInterview(offer)}
                  className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
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
              {loadingSlots ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : availableSlots.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">No available time slots</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot.id}
                      onClick={() => confirmBooking(slot.id)}
                      className="w-full p-4 bg-background rounded-lg border border-border hover:border-primary hover:shadow-elegant transition-all text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Clock className="w-4 h-4 text-primary" />
                            <p className="font-medium text-foreground">
                              {new Date(slot.start_time).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}{' '}
                              -{' '}
                              {new Date(slot.end_time).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(slot.start_time).toLocaleDateString('en-US', {
                              weekday: 'long',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </p>
                          {slot.location && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                              <MapPin className="w-3 h-3" />
                              {slot.location}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="px-3 py-1 bg-green-500/10 text-green-600 text-xs font-medium rounded-full">
                            {slot.capacity - slot.bookings_count} spot{slot.capacity - slot.bookings_count !== 1 ? 's' : ''} left
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}