'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { EventConfig, SlotWithDetails, BookingWithDetails, StatsResponse } from '@/types/database'

export default function StudentDashboard() {
  const [loading, setLoading] = useState(true)
  const [config, setConfig] = useState<EventConfig | null>(null)
  const [stats, setStats] = useState<StatsResponse | null>(null)
  const [slots, setSlots] = useState<SlotWithDetails[]>([])
  const [myBookings, setMyBookings] = useState<BookingWithDetails[]>([])
  const [filter, setFilter] = useState<'all' | 'Opérationnel' | 'Administratif'>('all')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAuth()
    loadData()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'student') {
      router.push('/login')
    }
  }

  const loadData = async () => {
    setLoading(true)
    try {
      // Load event config
      const { data: configData } = await supabase
        .from('event_config')
        .select('*')
        .eq('id', 1)
        .single()
      setConfig(configData)

      // Load student stats
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: statsData } = await supabase.rpc('fn_get_student_booking_stats', {
          student_id_param: user.id
        })
        setStats(statsData as StatsResponse)
      }

      // Load available slots with details
      const { data: slotsData } = await supabase
        .from('event_slots')
        .select(`
          *,
          company:companies(*),
          offer:offers(*)
        `)
        .order('start_time', { ascending: true })

      if (slotsData) {
        setSlots(slotsData as any)
      }

      // Load my bookings
      if (user) {
        const { data: bookingsData } = await supabase
          .from('bookings')
          .select(`
            *,
            slot:event_slots(
              *,
              company:companies(*),
              offer:offers(*)
            )
          `)
          .eq('student_id', user.id)
          .eq('status', 'confirmed')
          .order('created_at', { ascending: false })

        if (bookingsData) {
          setMyBookings(bookingsData as any)
        }
      }
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleBook = async (slotId: string) => {
    try {
      const { data, error } = await supabase.rpc('fn_book_interview', {
        slot_id_to_book: slotId
      })

      if (error) throw error

      const result = data as any

      if (result.success) {
        alert('✅ Booking successful!')
        loadData() // Reload data
      } else {
        alert(`❌ Booking failed: ${result.error_message}`)
      }
    } catch (err: any) {
      alert(`❌ Error: ${err.message}`)
    }
  }

  const handleCancel = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return

    try {
      const { data, error } = await supabase.rpc('fn_cancel_booking', {
        booking_id_to_cancel: bookingId
      })

      if (error) throw error

      const result = data as any

      if (result.success) {
        alert('✅ Booking cancelled!')
        loadData()
      } else {
        alert(`❌ Cancellation failed: ${result.error_message}`)
      }
    } catch (err: any) {
      alert(`❌ Error: ${err.message}`)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const filteredSlots = slots.filter(slot => 
    filter === 'all' || slot.offer.interest_tag === filter
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  const phaseText = config?.current_phase === 0 ? 'Not Open' : 
                    config?.current_phase === 1 ? 'Phase 1 (Priority)' : 
                    'Phase 2 (Open to All)'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Student Dashboard</h1>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Booking Status</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-600">Current Phase</div>
              <div className="text-2xl font-bold">{phaseText}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">My Bookings</div>
              <div className="text-2xl font-bold">
                {stats?.current_bookings || 0} / {stats?.max_bookings || 0}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Remaining</div>
              <div className="text-2xl font-bold">{stats?.remaining_bookings || 0}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Event Date</div>
              <div className="text-lg font-bold">{config?.event_date}</div>
            </div>
          </div>
        </div>

        {/* My Bookings */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">My Bookings ({myBookings.length})</h2>
          {myBookings.length === 0 ? (
            <p className="text-gray-500">No bookings yet</p>
          ) : (
            <div className="space-y-3">
              {myBookings.map((booking) => (
                <div key={booking.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{booking.slot.company.company_name}</div>
                      <div className="text-sm text-gray-600">{booking.slot.offer.title}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        📅 {new Date(booking.slot.start_time).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Booked in Phase {booking.booking_phase}
                      </div>
                    </div>
                    <button
                      onClick={() => handleCancel(booking.id)}
                      className="px-3 py-1 text-sm bg-red-50 text-red-700 border border-red-200 rounded hover:bg-red-100"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Available Slots */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Available Slots</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 text-sm rounded ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('Opérationnel')}
                className={`px-3 py-1 text-sm rounded ${filter === 'Opérationnel' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
              >
                Opérationnel
              </button>
              <button
                onClick={() => setFilter('Administratif')}
                className={`px-3 py-1 text-sm rounded ${filter === 'Administratif' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
              >
                Administratif
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {filteredSlots.map((slot) => (
              <div key={slot.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="font-medium">{slot.company.company_name}</div>
                    <div className="text-sm text-gray-600">{slot.offer.title}</div>
                    <div className="text-sm text-gray-500 mt-1">
                      📅 {new Date(slot.start_time).toLocaleString()} - {new Date(slot.end_time).toLocaleTimeString()}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <span className={`text-xs px-2 py-1 rounded ${
                        slot.offer.interest_tag === 'Opérationnel' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {slot.offer.interest_tag}
                      </span>
                      {slot.company.is_verified && (
                        <span className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800">
                          ✓ Verified
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleBook(slot.id)}
                    disabled={config?.current_phase === 0 || (stats?.remaining_bookings || 0) <= 0}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Book
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
