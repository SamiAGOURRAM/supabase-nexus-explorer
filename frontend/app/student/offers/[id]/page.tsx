'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

type Offer = {
  id: string
  title: string
  description: string
  department: string | null
  location: string | null
  duration_months: number | null
  paid: boolean
  requirements: string | null
  skills_required: string[] | null
  benefits: string | null
  company: {
    company_name: string
    description: string | null
    website: string | null
  }
}

type TimeSlot = {
  slot_id: string
  slot_time: string
  capacity: number
  booked_count: number
  available_count: number
  event_name: string
  event_date: string
}

type BookingLimit = {
  can_book: boolean
  current_bookings: number
  max_allowed: number
  current_phase: number
}

export default function OfferDetailPage() {
  const router = useRouter()
  const params = useParams()
  const offerId = params.id as string
  const supabase = createClient()
  
  const [loading, setLoading] = useState(true)
  const [offer, setOffer] = useState<Offer | null>(null)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<string>('')
  const [bookingLimit, setBookingLimit] = useState<BookingLimit | null>(null)
  const [booking, setBooking] = useState(false)

  useEffect(() => {
    loadOfferDetails()
  }, [offerId])

  const loadOfferDetails = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Load offer
      const { data: offerData, error: offerError } = await supabase
        .from('offers')
        .select(`
          id,
          title,
          description,
          department,
          location,
          duration_months,
          paid,
          requirements,
          skills_required,
          benefits,
          companies!inner (
            company_name,
            description,
            website,
            is_verified
          )
        `)
        .eq('id', offerId)
        .eq('is_active', true)
        .eq('companies.is_verified', true)
        .single()

      if (offerError || !offerData) {
        alert('Offer not found or inactive')
        router.push('/student/offers')
        return
      }

      setOffer(offerData as any)

      // Load available slots
      const { data: slotsData } = await supabase.rpc('fn_get_available_slots', {
        p_offer_id: offerId
      })

      if (slotsData) {
        setSlots(slotsData)
        
        // Get booking limit for first event (assuming all slots are from same event)
        if (slotsData.length > 0) {
          const { data: { user } } = await supabase.auth.getUser()
          // We need to get event_id from a slot first
          const { data: slotInfo } = await supabase
            .from('event_slots')
            .select('event_id')
            .eq('id', slotsData[0].slot_id)
            .single()
          
          if (slotInfo) {
            const { data: limitData } = await supabase.rpc('fn_check_student_booking_limit', {
              p_student_id: user.id,
              p_event_id: slotInfo.event_id
            })
            
            if (limitData && limitData.length > 0) {
              setBookingLimit(limitData[0])
            }
          }
        }
      }
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleBooking = async () => {
    if (!selectedSlot) {
      alert('Please select a time slot')
      return
    }

    if (!bookingLimit?.can_book) {
      alert(`You have reached your booking limit (${bookingLimit?.current_bookings}/${bookingLimit?.max_allowed})`)
      return
    }

    setBooking(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase.rpc('fn_book_interview', {
        p_student_id: user.id,
        p_slot_id: selectedSlot,
        p_offer_id: offerId
      })

      if (error) throw error

      if (data && data.length > 0) {
        if (data[0].success) {
          alert(data[0].message)
          router.push('/student/bookings')
        } else {
          alert(data[0].message)
        }
      }
    } catch (err: any) {
      alert('Error: ' + err.message)
    } finally {
      setBooking(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading offer...</div>
      </div>
    )
  }

  if (!offer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Offer not found</p>
          <Link href="/student/offers" className="text-blue-600 hover:text-blue-800">
            ← Back to offers
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <Link href="/student/offers" className="text-gray-600 hover:text-gray-900 text-sm mb-2 inline-block">
            ← Back to offers
          </Link>
          <h1 className="text-3xl font-bold">{offer.title}</h1>
          <p className="text-xl text-gray-600 mt-1">{offer.company.company_name}</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Offer Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Description</h2>
              <p className="text-gray-700 whitespace-pre-line">{offer.description}</p>
            </div>

            {/* Details */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">Details</h2>
              <div className="grid grid-cols-2 gap-4">
                {offer.department && (
                  <div>
                    <span className="text-sm text-gray-500">Department</span>
                    <p className="font-medium">{offer.department}</p>
                  </div>
                )}
                {offer.location && (
                  <div>
                    <span className="text-sm text-gray-500">Location</span>
                    <p className="font-medium">{offer.location}</p>
                  </div>
                )}
                {offer.duration_months && (
                  <div>
                    <span className="text-sm text-gray-500">Duration</span>
                    <p className="font-medium">{offer.duration_months} months</p>
                  </div>
                )}
                <div>
                  <span className="text-sm text-gray-500">Compensation</span>
                  <p className="font-medium">{offer.paid ? '💰 Paid' : 'Unpaid'}</p>
                </div>
              </div>
            </div>

            {/* Requirements */}
            {offer.requirements && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4">Requirements</h2>
                <p className="text-gray-700 whitespace-pre-line">{offer.requirements}</p>
              </div>
            )}

            {/* Skills */}
            {offer.skills_required && offer.skills_required.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4">Required Skills</h2>
                <div className="flex flex-wrap gap-2">
                  {offer.skills_required.map((skill, idx) => (
                    <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Benefits */}
            {offer.benefits && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-bold mb-4">Benefits</h2>
                <p className="text-gray-700 whitespace-pre-line">{offer.benefits}</p>
              </div>
            )}

            {/* About Company */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold mb-4">About {offer.company.company_name}</h2>
              <p className="text-gray-700 mb-4">{offer.company.description}</p>
              {offer.company.website && (
                <a
                  href={offer.company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  🌐 Visit website →
                </a>
              )}
            </div>
          </div>

          {/* Right Column - Booking */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-6">
              <h2 className="text-xl font-bold mb-4">Book Interview</h2>

              {/* Booking Limit Info */}
              {bookingLimit && (
                <div className={`mb-4 p-3 rounded-lg ${
                  bookingLimit.can_book ? 'bg-blue-50 border border-blue-200' : 'bg-red-50 border border-red-200'
                }`}>
                  <p className="text-sm font-medium">
                    Your bookings: {bookingLimit.current_bookings}/{bookingLimit.max_allowed}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Phase {bookingLimit.current_phase} limit
                  </p>
                </div>
              )}

              {slots.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">😔</div>
                  <p className="text-gray-600">No available slots</p>
                  <p className="text-sm text-gray-500 mt-1">Check back later</p>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Time Slot
                    </label>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {slots.map(slot => {
                        const slotTime = new Date(slot.slot_time)
                        const isSelected = selectedSlot === slot.slot_id
                        
                        return (
                          <button
                            key={slot.slot_id}
                            onClick={() => setSelectedSlot(slot.slot_id)}
                            className={`w-full text-left p-3 rounded-lg border-2 transition ${
                              isSelected
                                ? 'border-blue-600 bg-blue-50'
                                : 'border-gray-200 hover:border-blue-300'
                            }`}
                          >
                            <div className="font-medium text-gray-900">
                              {slotTime.toLocaleDateString('en-US', { 
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </div>
                            <div className="text-sm text-gray-600">
                              {slotTime.toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {slot.available_count} / {slot.capacity} spots available
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <button
                    onClick={handleBooking}
                    disabled={!selectedSlot || booking || !bookingLimit?.can_book}
                    className={`w-full py-3 rounded-lg font-medium transition ${
                      !selectedSlot || booking || !bookingLimit?.can_book
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {booking ? 'Booking...' : 
                     !bookingLimit?.can_book ? 'Booking Limit Reached' :
                     'Confirm Booking'}
                  </button>

                  {selectedSlot && (
                    <p className="text-xs text-gray-500 mt-3 text-center">
                      You can cancel up to 24 hours before
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
