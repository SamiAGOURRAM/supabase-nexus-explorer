'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type CompanyDashboard = {
  company_id: string
  profile_id: string
  company_name: string
  is_verified: boolean
  verification_status: 'pending' | 'verified' | 'rejected'
  created_at: string
  verified_at: string | null
  rejection_reason: string | null
  total_offers: number
  active_offers: number
  total_slots: number
  total_bookings: number
  status_message: string
}

type DashboardStats = {
  invited_events: number
  confirmed_bookings: number
  available_events: number
}

type UpcomingEvent = {
  event_id: string
  event_name: string
  event_date: string
  event_location: string
  total_offers: number
  total_bookings: number
}

export default function CompanyDashboardPage() {
  const [dashboard, setDashboard] = useState<CompanyDashboard | null>(null)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
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

      if (profile?.role !== 'company') {
        router.push('/offers')
        return
      }

      const { data, error } = await supabase
        .from('company_dashboard')
        .select('*')
        .eq('profile_id', user.id)
        .single()

      if (error) throw error
      setDashboard(data)

      // Load additional stats
      await loadAdditionalStats(data.company_id)
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAdditionalStats = async (companyId: string) => {
    const today = new Date().toISOString()

    // Get company's participated events (invited events)
    const { data: participatedEvents } = await supabase
      .from('event_participants')
      .select(`
        event_id,
        events:event_id (
          date
        )
      `)
      .eq('company_id', companyId)

    const upcomingParticipations = (participatedEvents || []).filter(
      (p: any) => p.events && new Date(p.events.date) >= new Date(today)
    )

    const { count: availableEvents } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .gte('date', today)

    // Get confirmed bookings by joining through event_slots
    const { count: confirmedBookings } = await supabase
      .from('interview_bookings')
      .select('id, event_slots!inner(company_id)', { count: 'exact', head: true })
      .eq('event_slots.company_id', companyId)
      .eq('status', 'confirmed')

    setStats({
      invited_events: upcomingParticipations.length,
      confirmed_bookings: confirmedBookings || 0,
      available_events: availableEvents || 0
    })

    // Load upcoming events - only show events company is invited to
    const { data: eventsData } = await supabase
      .from('event_participants')
      .select(`
        event_id,
        events:event_id (
          id,
          name,
          date,
          location
        )
      `)
      .eq('company_id', companyId)

    if (eventsData) {
      const futureEvents = eventsData
        .filter((ep: any) => ep.events && new Date(ep.events.date) >= new Date(today))
        .slice(0, 3)

      const eventsWithDetails = await Promise.all(
        futureEvents.map(async (ep: any) => {
          const event = ep.events
          
          const [
            { count: offerCount },
            { count: bookingCount }
          ] = await Promise.all([
            supabase.from('offers').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('event_id', event.id),
            supabase
              .from('interview_bookings')
              .select('id, event_slots!inner(company_id, event_id)', { count: 'exact', head: true })
              .eq('event_slots.company_id', companyId)
              .eq('event_slots.event_id', event.id)
          ])

          return {
            event_id: event.id,
            event_name: event.name,
            event_date: event.date,
            event_location: event.location,
            total_offers: offerCount || 0,
            total_bookings: bookingCount || 0
          }
        })
      )
      setUpcomingEvents(eventsWithDetails)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/offers')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!dashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Company Not Found</h2>
          <button onClick={() => router.push('/offers')} className="text-blue-600 hover:text-blue-800">
            Back to Offers
          </button>
        </div>
      </div>
    )
  }

  const getStatusBadge = () => {
    switch (dashboard.verification_status) {
      case 'verified':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <svg className="mr-1 h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Verified
          </span>
        )
      case 'pending':
        return <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">Pending Review</span>
      case 'rejected':
        return <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">Not Approved</span>
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{dashboard.company_name}</h1>
              <div className="flex items-center mt-1 space-x-2">
                {getStatusBadge()}
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Verification Status Alert */}
        {dashboard.verification_status !== 'verified' && (
          <div className="mb-8 bg-amber-50 border border-amber-200 rounded-lg p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-amber-800">Company verification pending</h3>
                <p className="mt-1 text-sm text-amber-700">{dashboard.status_message}</p>
              </div>
            </div>
          </div>
        )}

        {/* Event Invitation Journey */}
        {stats && stats.invited_events > 0 && (
          <div className="mb-8 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Event Journey</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="relative">
                <div className="flex items-center mb-2">
                  <div className="flex-shrink-0 w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                    ✓
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900">{stats.invited_events}</p>
                    <p className="text-sm text-gray-600">Event Invited</p>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="flex items-center mb-2">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                    dashboard.total_offers > 0 ? 'bg-green-500' : 'bg-gray-300'
                  }`}>
                    {dashboard.total_offers > 0 ? '✓' : '2'}
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900">{dashboard.total_offers}</p>
                    <p className="text-sm text-gray-600">Offers Created</p>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="flex items-center mb-2">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${
                    stats.confirmed_bookings > 0 ? 'bg-green-500' : 'bg-gray-300'
                  }`}>
                    {stats.confirmed_bookings > 0 ? '✓' : '3'}
                  </div>
                  <div className="ml-4">
                    <p className="text-2xl font-bold text-gray-900">{stats.confirmed_bookings}</p>
                    <p className="text-sm text-gray-600">Student Bookings</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Link href="/company/offers" className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 hover:border-blue-300 hover:shadow-md transition cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{dashboard.active_offers}</p>
              <p className="text-sm text-gray-600 mt-1">Active Offers</p>
              <p className="text-xs text-gray-500 mt-2">{dashboard.total_offers} total</p>
            </div>
          </Link>

          <Link href="/company/events" className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 hover:border-purple-300 hover:shadow-md transition cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats?.invited_events || 0}</p>
              <p className="text-sm text-gray-600 mt-1">Invited Events</p>
              <p className="text-xs text-gray-500 mt-2">{stats?.available_events || 0} available</p>
            </div>
          </Link>

          <Link href="/company/slots" className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 hover:border-green-300 hover:shadow-md transition cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{dashboard.total_slots}</p>
              <p className="text-sm text-gray-600 mt-1">Interview Slots</p>
              <p className="text-xs text-gray-500 mt-2">{dashboard.total_bookings} with bookings</p>
            </div>
          </Link>

          <Link href="/company/schedule" className="bg-white rounded-lg shadow-sm p-6 border border-gray-200 hover:border-indigo-300 hover:shadow-md transition cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats?.confirmed_bookings || 0}</p>
              <p className="text-sm text-gray-600 mt-1">Confirmed Interviews</p>
              <p className="text-xs text-gray-500 mt-2">{dashboard.total_bookings} total bookings</p>
            </div>
          </Link>
        </div>

        {/* Upcoming Events */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Events</h2>
            <Link href="/company/events" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              View all
            </Link>
          </div>
          <div className="p-6">
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="mt-2 text-sm text-gray-600">No upcoming events</p>
                <Link href="/company/events" className="mt-4 inline-block text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                  Browse available events →
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingEvents.map((event) => (
                  <div
                    key={event.event_id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-indigo-300 hover:shadow-md transition"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{event.event_name}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {new Date(event.event_date).toLocaleDateString('en-US', { 
                            month: 'long', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                        <p className="text-sm text-gray-500">{event.event_location}</p>
                      </div>
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                        Invited
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                      <div className="flex space-x-4 text-sm text-gray-600">
                        <span>{event.total_offers} offers</span>
                        <span>•</span>
                        <span>{event.total_bookings} interviews</span>
                      </div>
                      <Link
                        href={`/company/events/${event.event_id}`}
                        className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                      >
                        View Event →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
