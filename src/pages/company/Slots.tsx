import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Calendar, Clock, MapPin, Users } from 'lucide-react';

type Slot = {
  id: string;
  start_time: string;
  end_time: string;
  location: string | null;
  capacity: number;
  event_id: string;
  event_name: string;
  event_date: string;
  offer_title: string;
  bookings_count: number;
  is_active: boolean;
};

export default function CompanySlots() {
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState<Slot[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadSlots();
  }, []);

  const loadSlots = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/login');
      return;
    }

    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('profile_id', user.id)
      .single();

    if (!company) {
      setLoading(false);
      return;
    }

    // Get all slots for this company
    const { data: eventSlots } = await supabase
      .from('event_slots')
      .select(`
        id,
        start_time,
        end_time,
        location,
        capacity,
        is_active,
        event_id,
        events(name, date),
        offers(title)
      `)
      .eq('company_id', company.id)
      .order('start_time', { ascending: true });

    if (eventSlots) {
      // Count bookings for each slot
      const slotsWithBookings = await Promise.all(
        eventSlots.map(async (slot: any) => {
          const { count } = await supabase
            .from('interview_bookings')
            .select('*', { count: 'exact', head: true })
            .eq('slot_id', slot.id)
            .eq('status', 'confirmed');

          return {
            id: slot.id,
            start_time: slot.start_time,
            end_time: slot.end_time,
            location: slot.location,
            capacity: slot.capacity,
            is_active: slot.is_active,
            event_id: slot.event_id,
            event_name: slot.events?.name || 'Unknown Event',
            event_date: slot.events?.date || '',
            offer_title: slot.offers?.title || 'Unknown Offer',
            bookings_count: count || 0,
          };
        })
      );

      setSlots(slotsWithBookings);
    }

    setLoading(false);
  };

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
            <Link to="/company" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Interview Slots</h1>
              <p className="text-sm text-muted-foreground mt-1">Manage your interview schedule</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {slots.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <Calendar className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No slots created yet</h3>
            <p className="text-muted-foreground mb-6">Contact the event administrator to create interview slots</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Group slots by event */}
            {Array.from(new Set(slots.map(s => s.event_id))).map(eventId => {
              const eventSlots = slots.filter(s => s.event_id === eventId);
              const firstSlot = eventSlots[0];
              
              return (
                <div key={eventId} className="bg-card rounded-xl border border-border p-6">
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
                    <Calendar className="w-5 h-5 text-primary" />
                    <div>
                      <h2 className="text-lg font-bold text-foreground">{firstSlot.event_name}</h2>
                      <p className="text-sm text-muted-foreground">
                        {new Date(firstSlot.event_date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {eventSlots.map(slot => {
                      const isFull = slot.bookings_count >= slot.capacity;
                      const hasBookings = slot.bookings_count > 0;

                      return (
                        <div
                          key={slot.id}
                          className={`p-4 rounded-lg border ${
                            !slot.is_active
                              ? 'bg-muted/30 border-muted'
                              : isFull
                              ? 'bg-green-500/5 border-green-500/20'
                              : hasBookings
                              ? 'bg-blue-500/5 border-blue-500/20'
                              : 'bg-background border-border'
                          }`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <p className="text-sm font-medium text-foreground">
                                  {new Date(slot.start_time).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {Math.round((new Date(slot.end_time).getTime() - new Date(slot.start_time).getTime()) / 60000)} min
                                </p>
                              </div>
                            </div>
                            {isFull ? (
                              <span className="px-2 py-1 bg-green-500/20 text-green-600 text-xs font-medium rounded">
                                Full
                              </span>
                            ) : hasBookings ? (
                              <span className="px-2 py-1 bg-blue-500/20 text-blue-600 text-xs font-medium rounded">
                                Partial
                              </span>
                            ) : !slot.is_active ? (
                              <span className="px-2 py-1 bg-muted text-muted-foreground text-xs font-medium rounded">
                                Inactive
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-background text-muted-foreground text-xs font-medium rounded border border-border">
                                Available
                              </span>
                            )}
                          </div>

                          <p className="text-sm text-foreground font-medium mb-2 truncate">
                            {slot.offer_title}
                          </p>

                          {slot.location && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                              <MapPin className="w-3 h-3" />
                              {slot.location}
                            </div>
                          )}

                          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm text-foreground font-medium">
                              {slot.bookings_count} / {slot.capacity}
                            </span>
                            <span className="text-xs text-muted-foreground">booked</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
