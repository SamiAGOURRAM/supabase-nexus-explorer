'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Booking = {
  booking_id: string
  slot_time: string
  offer_title: string
  company_name: string
  event_name: string
  status: string
  notes: string | null
  can_cancel: boolean
}

export default function BookingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming')

  useEffect(() => {
    checkStudentAndLoadBookings()
  }, [])

  const checkStudentAndLoadBookings = async () => {
    try {
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

      if (!profile || profile.role !== 'student') {
        router.push('/offers')
        return
      }

      await loadBookings(user.id)
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadBookings = async (studentId: string) => {
    const { data, error } = await supabase.rpc('fn_get_student_bookings', {
      p_student_id: studentId
    })

    if (!error && data) {
      setBookings(data)
    }
  }

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase.rpc('fn_cancel_booking', {
        p_booking_id: bookingId,
        p_student_id: user.id
      })

      if (error) throw error

      if (data && data.length > 0 && data[0].success) {
        alert(data[0].message)
        await loadBookings(user.id)
      } else {
        alert(data[0]?.message || 'Failed to cancel booking')
      }
    } catch (err: any) {
      alert('Error: ' + err.message)
    }
  }

  const now = new Date()
  const filteredBookings = bookings.filter(booking => {
    const slotTime = new Date(booking.slot_time)
    if (filter === 'upcoming') return slotTime > now
    if (filter === 'past') return slotTime <= now
    return true
  })

  const upcomingCount = bookings.filter(b => new Date(b.slot_time) > now).length
  const pastCount = bookings.filter(b => new Date(b.slot_time) <= now).length

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading bookings...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">My Bookings</h1>
              <p className="text-gray-600 mt-1">Manage your interview schedule</p>
            </div>
            <Link href="/student" className="text-gray-600 hover:text-gray-900">
              ← Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-blue-600">{bookings.length}</div>
            <div className="text-sm text-gray-600">Total Bookings</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-green-600">{upcomingCount}</div>
            <div className="text-sm text-gray-600">Upcoming</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-gray-600">{pastCount}</div>
            <div className="text-sm text-gray-600">Past</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-md transition ${
                filter === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({bookings.length})
            </button>
            <button
              onClick={() => setFilter('upcoming')}
              className={`px-4 py-2 rounded-md transition ${
                filter === 'upcoming'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Upcoming ({upcomingCount})
            </button>
            <button
              onClick={() => setFilter('past')}
              className={`px-4 py-2 rounded-md transition ${
                filter === 'past'
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Past ({pastCount})
            </button>
          </div>
        </div>

        {/* Bookings List */}
        {filteredBookings.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">📅</div>
            <p className="text-gray-500 mb-4">
              {filter === 'upcoming' ? 'No upcoming bookings' :
               filter === 'past' ? 'No past bookings' :
               'No bookings yet'}
            </p>
            <Link
              href="/student/offers"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition"
            >
              Browse Offers
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map(booking => {
              const slotTime = new Date(booking.slot_time)
              const isPast = slotTime < now
              const isToday = slotTime.toDateString() === now.toDateString()

              return (
                <div
                  key={booking.booking_id}
                  className={`bg-white rounded-lg shadow p-6 ${
                    isToday ? 'border-2 border-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {isToday && (
                        <span className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded mb-2">
                          TODAY
                        </span>
                      )}
                      <h3 className="text-xl font-bold text-gray-900 mb-1">
                        {booking.offer_title}
                      </h3>
                      <p className="text-lg text-gray-700 mb-2">{booking.company_name}</p>
                      
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <span>📅</span>
                          <span className="font-medium">
                            {slotTime.toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>🕐</span>
                          <span className="font-medium">
                            {slotTime.toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>🎯</span>
                          <span>{booking.event_name}</span>
                        </div>
                      </div>

                      {booking.notes && (
                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                          <p className="text-sm text-gray-700">
                            <strong>Notes:</strong> {booking.notes}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-3">
                      <span
                        className={`px-3 py-1 text-sm font-semibold rounded-full ${
                          booking.status === 'confirmed'
                            ? 'bg-green-100 text-green-800'
                            : booking.status === 'cancelled'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {booking.status === 'confirmed' ? '✓ Confirmed' :
                         booking.status === 'cancelled' ? '✕ Cancelled' :
                         '⏳ Pending'}
                      </span>

                      {booking.can_cancel && !isPast && (
                        <button
                          onClick={() => handleCancelBooking(booking.booking_id)}
                          className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition text-sm font-medium"
                        >
                          Cancel Booking
                        </button>
                      )}

                      {isPast && booking.status === 'confirmed' && (
                        <span className="text-sm text-gray-500">Completed</span>
                      )}

                      {!booking.can_cancel && !isPast && booking.status === 'confirmed' && (
                        <span className="text-xs text-gray-500 text-right">
                          Cannot cancel<br/>(less than 24h)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Quick Link */}
        <div className="mt-8 text-center">
          <Link
            href="/student/offers"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
          >
            <span>+</span>
            <span>Book another interview</span>
          </Link>
        </div>
      </main>
    </div>
  )
}
