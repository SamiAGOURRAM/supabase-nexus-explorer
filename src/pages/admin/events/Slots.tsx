import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Users } from 'lucide-react'

interface SlotDetails {
  id: string
  start_time: string
  end_time: string
  capacity: number
  booked_count: number
}

interface CompanySlots {
  company_id: string
  company_name: string
  slots: SlotDetails[]
  totalBooked: number
}

type Event = {
  id: string
  name: string
  date: string
}

export default function EventSlots() {
  const navigate = useNavigate()
  const { id: eventId } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState<Event | null>(null)
  const [companySlots, setCompanySlots] = useState<CompanySlots[]>([])
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)
  const [slotBookings, setSlotBookings] = useState<any[]>([])
  const [loadingBookings, setLoadingBookings] = useState(false)

  useEffect(() => {
    checkAdminAndLoad()
  }, [eventId])

  const checkAdminAndLoad = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        navigate('/login')
        return
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

      if (!profile || profile.role !== 'admin') {
        navigate('/offers')
        return
      }

      await loadData()
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadData = async () => {
    if (!eventId) {
      return
    }

    const { data: eventData } = await supabase
      .from('events')
      .select('id, name, date')
      .eq('id', eventId)
      .single()

    if (eventData) setEvent(eventData)

    // Fetch all slots for the event
    const { data: slotsData, error: slotsError } = await supabase
      .from('event_slots')
      .select('id, start_time, end_time, capacity, company_id')
      .eq('event_id', eventId)
      .eq('is_active', true)
      .order('start_time')



    if (slotsError) {
      console.error('Error fetching slots:', slotsError)
      return
    }

    if (slotsData && slotsData.length > 0) {
      // Get unique company IDs
      const companyIds = [...new Set(slotsData.map(slot => slot.company_id))]
      
      // Fetch company info separately
      const { data: companiesData } = await supabase
        .from('companies')
        .select('id, company_name')
        .in('id', companyIds)



      const companiesMap = new Map(companiesData?.map(c => [c.id, c.company_name]) || [])

      // Get booking counts for each slot
      const slotsWithCounts = await Promise.all(
        slotsData.map(async (slot: any) => {
          const { count } = await supabase
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('slot_id', slot.id)
            .eq('status', 'confirmed')

          return {
            ...slot,
            booked_count: count || 0
          }
        })
      )

      // Group by company
      const grouped = slotsWithCounts.reduce((acc: Record<string, CompanySlots>, slot: any) => {
        const companyId = slot.company_id
        
        if (!acc[companyId]) {
          acc[companyId] = {
            company_id: companyId,
            company_name: companiesMap.get(companyId) || 'Unknown Company',
            slots: [],
            totalBooked: 0
          }
        }
        
        acc[companyId].slots.push({
          id: slot.id,
          start_time: slot.start_time,
          end_time: slot.end_time,
          capacity: slot.capacity || 0,
          booked_count: slot.booked_count || 0
        })
        acc[companyId].totalBooked += slot.booked_count || 0
        
        return acc
      }, {} as Record<string, CompanySlots>)

      const companySlotsArray = Object.values(grouped).sort((a, b) =>
        a.company_name.localeCompare(b.company_name)
      )



      setCompanySlots(companySlotsArray)
    }
  }

  const loadSlotBookings = async (slotId: string) => {
    setLoadingBookings(true)
    try {
      const { data: bookingsData, error } = await supabase
        .from('bookings')
        .select(`
          id,
          created_at,
          profiles!bookings_student_id_fkey (
            full_name,
            email
          )
        `)
        .eq('slot_id', slotId)
        .eq('status', 'confirmed')



      if (error) {
        console.error('Error loading bookings:', error)
        setSlotBookings([])
      } else {
        setSlotBookings(bookingsData || [])
      }
    } catch (err) {
      console.error('Error:', err)
      setSlotBookings([])
    } finally {
      setLoadingBookings(false)
    }
  }

  const handleSlotClick = (slotId: string) => {
    if (selectedSlotId === slotId) {
      // Close if already selected
      setSelectedSlotId(null)
      setSlotBookings([])
    } else {
      // Open and load bookings
      setSelectedSlotId(slotId)
      loadSlotBookings(slotId)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-destructive">Event not found</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link to="/admin/events" className="text-sm text-primary hover:underline mb-2 inline-block">
            ← Back to Events
          </Link>
          <h1 className="text-2xl font-bold">{event.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">Interview Slots</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Company Grid */}
        <div className="bg-card rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-6">
            Interview Schedule ({companySlots.reduce((sum, cs) => sum + cs.totalBooked, 0)} bookings)
          </h3>

          {companySlots.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <p>No slots available for this event.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {companySlots.map((company) => (
                <div key={company.company_id} className="border-2 rounded-lg p-6 bg-card/50">
                  {/* Company Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Users className="w-5 h-5 text-primary" />
                      <h4 className="font-semibold text-lg">{company.company_name}</h4>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {company.totalBooked} booking{company.totalBooked !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Time Slots for this Company */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {company.slots.map((slot) => {
                      const isSelected = selectedSlotId === slot.id
                      return (
                        <button
                          key={slot.id}
                          onClick={() => handleSlotClick(slot.id)}
                          className={`relative p-4 rounded-lg border-2 transition-all ${
                            isSelected 
                              ? 'border-primary bg-primary/10' 
                              : 'border-border bg-card hover:border-primary/50'
                          } ${slot.booked_count > 0 ? 'cursor-pointer' : 'cursor-default'}`}
                          disabled={slot.booked_count === 0}
                        >
                          <div className="text-center">
                            <div className="font-semibold text-sm">
                              {new Date(slot.start_time).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false
                              })}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {slot.booked_count}/{slot.capacity}
                            </div>
                            {slot.booked_count > 0 && (
                              <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                                {slot.booked_count}
                              </div>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>

                  {/* Show bookings if this company's slot is selected */}
                  {company.slots.some(s => s.id === selectedSlotId) && (
                    <div className="mt-4 p-4 bg-muted/30 rounded-lg border">
                      <h5 className="font-semibold text-sm mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Booking Details
                      </h5>
                      
                      {loadingBookings ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        </div>
                      ) : slotBookings.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No bookings found</p>
                      ) : (
                        <div className="space-y-2">
                          {slotBookings.map((booking: any) => (
                            <div 
                              key={booking.id} 
                              className="flex items-center gap-3 p-3 bg-card border rounded-lg"
                            >
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                                {booking.profiles?.full_name?.charAt(0) || '?'}
                              </div>
                              <div className="flex-1">
                                <div className="font-medium text-sm">
                                  {booking.profiles?.full_name || 'Unknown Student'}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {booking.profiles?.email || 'No email'}
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(booking.created_at).toLocaleDateString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
