import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Users } from 'lucide-react'

type Booking = {
  id: string
  student_id: string
  profiles: {
    full_name: string
    email: string
  }
}

type SlotDetails = {
  company_name: string
  company_code: string
  bookings: Booking[]
}

type TimeSlot = {
  start_time: string
  end_time: string
  totalCapacity: number
  totalBooked: number
  slotIds: string[]
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
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [slotDetails, setSlotDetails] = useState<SlotDetails[]>([])
  const [loadingDetails, setLoadingDetails] = useState(false)

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

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

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
    if (!eventId) return

    const { data: eventData } = await supabase
      .from('events')
      .select('id, name, date')
      .eq('id', eventId)
      .single()

    if (eventData) setEvent(eventData)

    // Fetch all slots for the event
    const { data: slotsData } = await supabase
      .from('event_slots')
      .select('id, start_time, end_time, capacity')
      .eq('event_id', eventId)
      .eq('is_active', true)
      .order('start_time')

    if (slotsData && slotsData.length > 0) {
      // Get booking counts for each slot
      const slotsWithCounts = await Promise.all(
        slotsData.map(async (slot: any) => {
          const { count } = await supabase
            .from('interview_bookings')
            .select('*', { count: 'exact', head: true })
            .eq('slot_id', slot.id)
            .eq('status', 'confirmed')

          return {
            ...slot,
            bookings_count: count || 0
          }
        })
      )

      // Group by time ranges
      const grouped = slotsWithCounts.reduce((acc, slot) => {
        const timeKey = `${slot.start_time}-${slot.end_time}`
        if (!acc[timeKey]) {
          acc[timeKey] = {
            start_time: slot.start_time,
            end_time: slot.end_time,
            totalCapacity: 0,
            totalBooked: 0,
            slotIds: []
          }
        }
        acc[timeKey].totalCapacity += slot.capacity
        acc[timeKey].totalBooked += slot.bookings_count
        acc[timeKey].slotIds.push(slot.id)
        return acc
      }, {} as Record<string, TimeSlot>)

      const timeSlotsArray = Object.values(grouped).sort((a, b) => 
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      )

      setTimeSlots(timeSlotsArray)
    }
  }

  const loadSlotDetails = async (timeKey: string, slotIds: string[]) => {
    setLoadingDetails(true)
    try {
      // Fetch all bookings for these slots with student info
      const { data: bookingsData } = await supabase
        .from('interview_bookings')
        .select(`
          id,
          student_id,
          slot_id,
          profiles!interview_bookings_student_id_fkey (
            full_name,
            email
          )
        `)
        .in('slot_id', slotIds)
        .eq('status', 'confirmed')

      if (!bookingsData || bookingsData.length === 0) {
        setSlotDetails([])
        return
      }

      // Fetch slot company info separately
      const { data: slotsData } = await supabase
        .from('event_slots')
        .select('id, company_id, session_id')
        .in('id', slotIds)

      if (!slotsData) {
        setSlotDetails([])
        return
      }

      // Get unique company IDs
      const companyIds = [...new Set(slotsData.map(s => s.company_id))]
      const { data: companiesData } = await supabase
        .from('companies')
        .select('id, company_name, company_code')
        .in('id', companyIds)

      const companiesMap = new Map(companiesData?.map(c => [c.id, c]) || [])

      // Group bookings by company
      const companyMap = new Map<string, SlotDetails>()
      
      slotsData.forEach((slot: any) => {
        const companyKey = slot.company_id
        const companyInfo = companiesMap.get(companyKey)
        
        // Find bookings for this slot
        const slotBookings = bookingsData?.filter(b => b.slot_id === slot.id) || []
        
        // Only add company if it has bookings
        if (slotBookings.length > 0) {
          if (!companyMap.has(companyKey)) {
            companyMap.set(companyKey, {
              company_name: companyInfo?.company_name || 'Unknown',
              company_code: companyInfo?.company_code || 'N/A',
              bookings: []
            })
          }
          
          const company = companyMap.get(companyKey)!
          company.bookings.push(...slotBookings as any)
        }
      })

      setSlotDetails(Array.from(companyMap.values()))
    } catch (err) {
      console.error('Error loading slot details:', err)
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleSlotClick = (timeKey: string, slotIds: string[]) => {
    if (selectedSlot === timeKey) {
      setSelectedSlot(null)
      setSlotDetails([])
    } else {
      setSelectedSlot(timeKey)
      loadSlotDetails(timeKey, slotIds)
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
        {/* Time Grid */}
        <div className="bg-card rounded-lg border p-6">
          <h3 className="text-lg font-semibold mb-6">
            Interview Schedule ({timeSlots.reduce((sum, ts) => sum + ts.totalBooked, 0)} bookings)
          </h3>

          {timeSlots.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <p>No slots available for this event.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
                {timeSlots.map((timeSlot) => {
                  const timeKey = `${timeSlot.start_time}-${timeSlot.end_time}`
                  const isSelected = selectedSlot === timeKey
                  
                  return (
                    <button
                      key={timeKey}
                      onClick={() => handleSlotClick(timeKey, timeSlot.slotIds)}
                      className={`relative p-4 rounded-lg border-2 transition-all ${
                        isSelected 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border bg-card hover:border-primary/50'
                      }`}
                    >
                      <div className="text-center">
                        <div className="font-semibold text-lg">
                          {new Date(timeSlot.start_time).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                          })}
                        </div>
                        {timeSlot.totalBooked > 0 && (
                          <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                            {timeSlot.totalBooked}
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Slot Details */}
              {selectedSlot && (
                <div className="mt-6 p-6 bg-muted/30 rounded-lg border">
                  <div className="flex items-center gap-2 mb-4">
                    <Users className="w-5 h-5 text-primary" />
                    <h4 className="font-semibold text-lg">Interview Details</h4>
                  </div>

                  {loadingDetails ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  ) : slotDetails.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">No bookings for this time slot</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {slotDetails.map((company, idx) => (
                        <div key={idx} className="border-2 border-dashed border-primary/30 rounded-lg p-4 bg-card/50">
                          <div className="font-semibold text-sm mb-3 text-primary">
                            {company.company_name} 
                            <span className="text-xs text-muted-foreground ml-2">({company.company_code})</span>
                          </div>
                          
                          <div className="flex flex-wrap gap-2">
                            {company.bookings.map((booking) => (
                              <div 
                                key={booking.id} 
                                className="inline-flex items-center gap-2 px-3 py-2 bg-card border rounded-lg text-sm"
                              >
                                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                                  {booking.profiles?.full_name?.charAt(0) || '?'}
                                </div>
                                <span className="font-medium">{booking.profiles?.full_name || 'Unknown'}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}
