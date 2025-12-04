import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { Calendar, Clock, MapPin, Users, CheckCircle2, Circle, AlertCircle, TrendingUp } from 'lucide-react';
import { extractFirstFromNested } from '@/utils/supabaseTypes';
import LoadingScreen from '@/components/shared/LoadingScreen';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import EmptyState from '@/components/shared/EmptyState';
import CompanyLayout from '@/components/company/CompanyLayout';
import { useAuth } from '@/hooks/useAuth';
import { warn as logWarn, error as logError } from '@/utils/logger';

type Booking = {
  id: string;
  student_id: string;
  offer_id: string;
  profiles: {
    full_name: string;
  };
  offers: {
    title: string;
  } | null;
};

type Slot = {
  id: string;
  start_time: string;
  end_time: string;
  location: string | null;
  capacity: number;
  event_id: string;
  event_name: string;
  event_date: string;
  bookings: Booking[];
  bookings_count: number;
  is_active: boolean;
  offer_id: string | null;
};

export default function CompanySlots() {
  const { signOut } = useAuth('company');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const navigate = useNavigate();
  const { showError } = useToast();

  // Calculate statistics - moved to top level to avoid hooks order violation
  const stats = useMemo(() => {
    const totalSlots = slots.length
    const activeSlots = slots.filter(s => s.is_active).length
    const totalBookings = slots.reduce((sum, slot) => sum + slot.bookings_count, 0)
    const fullSlots = slots.filter(s => s.is_active && s.bookings_count >= s.capacity).length
    const availableSlots = slots.filter(s => s.is_active && s.bookings_count < s.capacity).length
    const totalCapacity = slots.reduce((sum, slot) => sum + slot.capacity, 0)
    const utilizationRate = totalCapacity > 0 ? Math.round((totalBookings / totalCapacity) * 100) : 0

    return {
      totalSlots,
      activeSlots,
      totalBookings,
      fullSlots,
      availableSlots,
      utilizationRate
    }
  }, [slots])

  useEffect(() => {
    loadSlots();
  }, []);

  const loadSlots = async () => {
    try {
      setError(null);
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('id')
        .eq('profile_id', user.id)
        .maybeSingle();

      if (companyError) {
        throw new Error(`Failed to load company: ${companyError.message}`);
      }

      if (!company) {
        setSlots([]);
        setLoading(false);
        return;
      }

      // Get all slots for this company
      const { data: eventSlots, error: slotsError } = await supabase
        .from('event_slots')
        .select(`
          id,
          start_time,
          end_time,
          location,
          capacity,
          is_active,
          event_id,
          offer_id
        `)
        .eq('company_id', company.id);

      if (slotsError) {
        throw new Error(`Failed to load slots: ${slotsError.message}`);
      }

      // Debug: Log slots to see offer_id (development only) - disabled to reduce console noise

      if (eventSlots && eventSlots.length > 0) {
      // Get event details
      const eventIds = [...new Set(eventSlots.map(s => s.event_id).filter((id): id is string => id !== null))];
      const { data: events } = await supabase
        .from('events')
        .select('id, name, date')
        .in('id', eventIds);

      const eventMap = new Map(events?.map(e => [e.id, e]) || []);
      
          // Batch fetch all offers for all slots to reduce queries and warnings
          const offerIds = [...new Set(eventSlots.map(s => s.offer_id).filter((id): id is string => id !== null))];
          const offerMap = new Map<string, string>();
          
          if (offerIds.length > 0) {
            const { data: offers, error: offersError } = await supabase
              .from('offers')
              .select('id, title')
              .in('id', offerIds);
            
            if (offersError) {
              logError('Failed to load offers:', offersError);
            } else if (offers) {
              offers.forEach(offer => {
                offerMap.set(offer.id, offer.title);
              });
              
              // Log missing offers only once as a summary (development only)
              if (import.meta.env.DEV) {
                const missingOfferIds = offerIds.filter(id => !offerMap.has(id));
                if (missingOfferIds.length > 0) {
                  logWarn(`Found ${missingOfferIds.length} slot(s) with missing offers: ${missingOfferIds.slice(0, 3).join(', ')}${missingOfferIds.length > 3 ? '...' : ''}`);
                }
              }
            }
          }
      
          // Get bookings with student and offer info
          // Use the slot's offer_id directly since we already have it
          const slotsWithBookings = await Promise.all(
            eventSlots.map(async (slot: any) => {
              // Get bookings for this slot
              const { data: bookings } = await supabase
                .from('bookings')
                .select(`
                  id,
                  student_id,
                  profiles!inner(id, full_name, email, phone)
                `)
                .eq('slot_id', slot.id)
                .eq('status', 'confirmed');

          // Get offer information from the pre-fetched map
          const offerTitle = slot.offer_id ? offerMap.get(slot.offer_id) || null : null;
          
          // Transform bookings to match our Booking type
          // Handle nested profiles array (Supabase !inner join returns arrays)
          const bookingsWithOffers: Booking[] = (bookings || []).map(b => {
            // Extract first profile from array (or use fallback)
            const profile = extractFirstFromNested<{ full_name: string; email?: string; phone?: string }>(
              b.profiles,
              { full_name: 'Unknown' }
            );
            
            return {
              id: b.id,
              student_id: b.student_id,
              offer_id: slot.offer_id || '',
              profiles: {
                full_name: profile.full_name
              },
              offers: offerTitle ? { title: offerTitle } : null
            };
          });

          const event = eventMap.get(slot.event_id);
          
          return {
            id: slot.id,
            start_time: slot.start_time,
            end_time: slot.end_time,
            location: slot.location,
            capacity: slot.capacity,
            is_active: slot.is_active,
            event_id: slot.event_id,
            event_name: event?.name || 'Unknown Event',
            event_date: event?.date || '',
            bookings: bookingsWithOffers || [],
            bookings_count: bookingsWithOffers?.length || 0,
            offer_id: slot.offer_id || null,
          };
        })
      );

      // Sort by start_time
      slotsWithBookings.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

        setSlots(slotsWithBookings);
      } else {
        setSlots([]);
      }
    } catch (err: any) {
      logError('Error loading slots:', err);
      const errorMessage = err instanceof Error ? err : new Error('Failed to load slots');
      setError(errorMessage);
      showError('Failed to load slots. Please try again.');
      setSlots([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading slots..." />;
  }

  if (error) {
    return (
      <CompanyLayout onSignOut={signOut}>
        <div className="p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <ErrorDisplay error={error} onRetry={loadSlots} />
          </div>
        </div>
      </CompanyLayout>
    );
  }


  // Helper function to get initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <CompanyLayout onSignOut={signOut}>
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <section className="bg-[#1a1f3a] border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-12">
            <h1 className="text-3xl font-bold text-white mb-2">
              Interview Schedule
            </h1>
            <p className="text-white/70">
              Manage and monitor your interview time slots
            </p>

            {/* Stats Grid */}
            {slots.length > 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <Calendar className="w-5 h-5 text-gray-600" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {stats.totalSlots}
                  </div>
                  <div className="text-sm text-gray-600">
                    Total Slots
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <CheckCircle2 className="w-5 h-5 text-gray-600" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {stats.activeSlots}
                  </div>
                  <div className="text-sm text-gray-600">
                    Active
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <Users className="w-5 h-5 text-gray-600" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {stats.totalBookings}
                  </div>
                  <div className="text-sm text-gray-600">
                    Bookings
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-gray-600" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {stats.utilizationRate}%
                  </div>
                  <div className="text-sm text-gray-600">
                    Utilization
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8">
          {/* Slots List */}
          {slots.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No Interview Slots"
              message="You haven't created any interview slots yet. Create slots through the Offers section when setting up your offers."
              className="bg-white rounded-lg border border-gray-200 p-12"
            />
          ) : (
            <div className="space-y-8">
              {/* Group slots by event */}
              {Array.from(new Set(slots.map(s => s.event_id))).map(eventId => {
                const eventSlots = slots.filter(s => s.event_id === eventId)
                const firstSlot = eventSlots[0]
                const eventDate = new Date(firstSlot.event_date)
                
                return (
                  <div key={eventId} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                    {/* Event Header */}
                    <div className="bg-[#1a1f3a] border-b border-gray-200 p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Calendar className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h2 className="text-xl font-bold text-white mb-1">{firstSlot.event_name}</h2>
                            <div className="flex items-center gap-4 text-sm text-white/80">
                              <span>
                                {eventDate.toLocaleDateString('en-US', {
                                  weekday: 'long',
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric'
                                })}
                              </span>
                              <span className="text-white/60">•</span>
                              <span>{eventSlots.length} slot{eventSlots.length !== 1 ? 's' : ''}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Slots Grid */}
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {eventSlots.map(slot => {
                          const isFull = slot.bookings_count >= slot.capacity
                          const hasBookings = slot.bookings_count > 0
                          const utilizationPercent = slot.capacity > 0 
                            ? Math.round((slot.bookings_count / slot.capacity) * 100) 
                            : 0
                          const startTime = new Date(slot.start_time)
                          const endTime = new Date(slot.end_time)
                          const duration = Math.round((endTime.getTime() - startTime.getTime()) / 60000)

                          return (
                            <div
                              key={slot.id}
                              className={`group relative rounded-lg border-2 transition-all duration-200 ${
                                !slot.is_active
                                  ? 'bg-gray-50 border-gray-300 opacity-60'
                                  : isFull
                                  ? 'bg-green-50 border-green-500 shadow-sm'
                                  : hasBookings
                                  ? 'bg-blue-50 border-blue-500 shadow-sm hover:border-blue-600'
                                  : 'bg-white border-gray-200 hover:border-[#007e40] hover:shadow-md'
                              }`}
                            >
                              {/* Status Badge */}
                              <div className="absolute top-3 right-3">
                                {isFull ? (
                                  <span className="px-2.5 py-1 bg-green-500 text-white text-xs font-semibold rounded-full shadow-sm">
                                    Full
                                  </span>
                                ) : hasBookings ? (
                                  <span className="px-2.5 py-1 bg-blue-500 text-white text-xs font-semibold rounded-full shadow-sm">
                                    {slot.bookings_count} Booked
                                  </span>
                                ) : !slot.is_active ? (
                                  <span className="px-2.5 py-1 bg-muted text-muted-foreground text-xs font-semibold rounded-full">
                                    Inactive
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 bg-background border border-border text-foreground text-xs font-semibold rounded-full">
                                    Available
                                  </span>
                                )}
                              </div>

                              <div className="p-5">
                                {/* Time Section */}
                                <div className="flex items-center gap-3 mb-4">
                                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Clock className="w-5 h-5 text-primary" />
                                  </div>
                                  <div>
                                    <p className="text-lg font-bold text-foreground">
                                      {startTime.toLocaleTimeString('en-US', {
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {duration} minutes
                                    </p>
                                  </div>
                                </div>

                                {/* Location */}
                                {slot.location && (
                                  <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
                                    <MapPin className="w-4 h-4" />
                                    <span className="truncate">{slot.location}</span>
                                  </div>
                                )}

                                {/* Bookings List */}
                                {slot.bookings.length > 0 && (
                                  <div className="mb-4 space-y-2">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                      Scheduled Students
                                    </p>
                                    {slot.bookings.map((booking: any) => {
                                      const studentName = booking.profiles?.full_name || 'Unknown Student'
                                      const initials = getInitials(studentName)
                                      
                                      return (
                                        <Link
                                          key={booking.id}
                                          to={`/company/students/${booking.student_id}`}
                                          className="flex items-center gap-3 p-2.5 bg-background/60 hover:bg-background rounded-lg transition-colors group/item"
                                        >
                                          <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                                            <span className="text-xs font-semibold text-primary">{initials}</span>
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-foreground group-hover/item:text-primary transition-colors truncate">
                                              {studentName}
                                            </p>
                                            {booking.offers?.title && (
                                              <p className="text-xs text-muted-foreground truncate">
                                                {booking.offers.title}
                                              </p>
                                            )}
                                          </div>
                                        </Link>
                                      )
                                    })}
                                  </div>
                                )}

                                {/* Capacity Progress Bar */}
                                <div className="mt-4 pt-4 border-t border-border">
                                  <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                      <Users className="w-4 h-4 text-muted-foreground" />
                                      <span className="text-sm font-medium text-foreground">
                                        {slot.bookings_count} / {slot.capacity}
                                      </span>
                                    </div>
                                    <span className="text-xs font-medium text-muted-foreground">
                                      {utilizationPercent}%
                                    </span>
                                  </div>
                                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full transition-all duration-300 ${
                                        isFull
                                          ? 'bg-green-500'
                                          : hasBookings
                                          ? 'bg-blue-500'
                                          : 'bg-gray-400'
                                      }`}
                                      style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </CompanyLayout>
  )
}
