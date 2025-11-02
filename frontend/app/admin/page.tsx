'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type DashboardStats = {
  total_events: number
  upcoming_events: number
  past_events: number
  total_companies: number
  verified_companies: number
  pending_companies: number
  pending_registrations: number
  total_registrations: number
  approved_registrations: number
  total_bookings: number
  total_students: number
  total_offers: number
}

type EventSummary = {
  id: string
  name: string
  date: string
  location: string
  total_companies: number
  pending_registrations: number
  approved_registrations: number
  total_slots: number
  booked_slots: number
  booking_rate: number
}

type RecentActivity = {
  id: string
  type: 'company_registered' | 'registration_pending' | 'booking_created'
  description: string
  created_at: string
  status?: string
}

export default function AdminDashboard() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [upcomingEvents, setUpcomingEvents] = useState<EventSummary[]>([])
  const [pendingCompanies, setPendingCompanies] = useState<any[]>([])
  const [pendingRegistrations, setPendingRegistrations] = useState<any[]>([])

  useEffect(() => {
    checkAdminAndLoadData()
  }, [])

  const checkAdminAndLoadData = async () => {
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

      if (!profile || profile.role !== 'admin') {
        router.push('/offers')
        return
      }

      await loadDashboardData()
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadDashboardData = async () => {
    const today = new Date().toISOString()

    // Load comprehensive stats
    const [
      { count: totalEvents },
      { count: upcomingEventsCount },
      { count: totalCompanies },
      { count: verifiedCompanies },
      { count: pendingCompaniesCount },
      { count: pendingRegs },
      { count: totalRegs },
      { count: approvedRegs },
      { count: totalBookings },
      { data: studentsData },
      { count: totalOffers }
    ] = await Promise.all([
      supabase.from('events').select('*', { count: 'exact', head: true }),
      supabase.from('events').select('*', { count: 'exact', head: true }).gte('date', today),
      supabase.from('companies').select('*', { count: 'exact', head: true }),
      supabase.from('companies').select('*', { count: 'exact', head: true }).eq('verification_status', 'verified'),
      supabase.from('companies').select('*', { count: 'exact', head: true }).eq('verification_status', 'pending'),
      supabase.from('event_registrations').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('event_registrations').select('*', { count: 'exact', head: true }),
      supabase.from('event_registrations').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('interview_bookings').select('*', { count: 'exact', head: true }),
      supabase.from('students').select('id'),
      supabase.from('offers').select('*', { count: 'exact', head: true })
    ])

    setStats({
      total_events: totalEvents || 0,
      upcoming_events: upcomingEventsCount || 0,
      past_events: (totalEvents || 0) - (upcomingEventsCount || 0),
      total_companies: totalCompanies || 0,
      verified_companies: verifiedCompanies || 0,
      pending_companies: pendingCompaniesCount || 0,
      pending_registrations: pendingRegs || 0,
      total_registrations: totalRegs || 0,
      approved_registrations: approvedRegs || 0,
      total_bookings: totalBookings || 0,
      total_students: studentsData?.length || 0,
      total_offers: totalOffers || 0
    })

    // Load upcoming events with registration stats
    const { data: eventsData } = await supabase
      .from('events')
      .select('*')
      .gte('date', today)
      .order('date', { ascending: true })
      .limit(5)

    if (eventsData) {
      const eventsWithStats = await Promise.all(
        eventsData.map(async (event) => {
          const [
            { count: totalComps },
            { count: pendingRegs },
            { count: approvedRegs },
            { count: totalSlots },
            { count: bookedSlots }
          ] = await Promise.all([
            supabase.from('event_registrations').select('*', { count: 'exact', head: true }).eq('event_id', event.id),
            supabase.from('event_registrations').select('*', { count: 'exact', head: true }).eq('event_id', event.id).eq('status', 'pending'),
            supabase.from('event_registrations').select('*', { count: 'exact', head: true }).eq('event_id', event.id).eq('status', 'approved'),
            supabase.from('event_slots').select('*', { count: 'exact', head: true }).eq('event_id', event.id).eq('is_active', true),
            supabase.from('interview_bookings')
              .select('slot_id', { count: 'exact', head: true })
              .eq('status', 'confirmed')
              .in('slot_id', 
                (await supabase.from('event_slots').select('id').eq('event_id', event.id).eq('is_active', true)).data?.map(s => s.id) || []
              )
          ])

          const bookingRate = (totalSlots && totalSlots > 0) ? Math.round((bookedSlots || 0) / totalSlots * 100) : 0

          return {
            id: event.id,
            name: event.name,
            date: event.date,
            location: event.location,
            total_companies: totalComps || 0,
            pending_registrations: pendingRegs || 0,
            approved_registrations: approvedRegs || 0,
            total_slots: totalSlots || 0,
            booked_slots: bookedSlots || 0,
            booking_rate: bookingRate
          }
        })
      )
      setUpcomingEvents(eventsWithStats)
    }

    // Load pending companies
    const { data: pendingComps } = await supabase
      .from('companies')
      .select(`
        id,
        company_name,
        industry,
        created_at,
        profiles!companies_profile_id_fkey (email, full_name)
      `)
      .eq('verification_status', 'pending')
      .order('created_at', { ascending: false })
      .limit(5)

    setPendingCompanies(pendingComps || [])

    // Load pending event registrations
    const { data: pendingRegsData } = await supabase
      .from('event_registrations')
      .select(`
        id,
        registered_at,
        companies (id, company_name),
        events (id, name, date)
      `)
      .eq('status', 'pending')
      .order('registered_at', { ascending: false })
      .limit(5)

    setPendingRegistrations(pendingRegsData || [])
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">Welcome back, Admin</p>
            </div>
            <button
              onClick={async () => {
                await supabase.auth.signOut()
                router.push('/')
              }}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Action Required Section */}
        {(stats && (stats.pending_companies > 0 || stats.pending_registrations > 0)) && (
          <div className="mb-8 bg-amber-50 border border-amber-200 rounded-lg p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-amber-800">Action Required</h3>
                <div className="mt-2 text-sm text-amber-700">
                  <ul className="list-disc list-inside space-y-1">
                    {stats.pending_companies > 0 && (
                      <li>{stats.pending_companies} compan{stats.pending_companies > 1 ? 'ies' : 'y'} waiting for verification</li>
                    )}
                    {stats.pending_registrations > 0 && (
                      <li>{stats.pending_registrations} event registration{stats.pending_registrations > 1 ? 's' : ''} pending approval</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Events Metric */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <Link href="/admin/events" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                Manage →
              </Link>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats?.upcoming_events || 0}</p>
              <p className="text-sm text-gray-600 mt-1">Upcoming Events</p>
              <p className="text-xs text-gray-500 mt-2">{stats?.total_events || 0} total events</p>
            </div>
          </div>

          {/* Companies Metric */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <Link href="/admin/companies" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                Review →
              </Link>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats?.verified_companies || 0}</p>
              <p className="text-sm text-gray-600 mt-1">Verified Companies</p>
              {stats && stats.pending_companies > 0 && (
                <p className="text-xs text-amber-600 mt-2 font-medium">{stats.pending_companies} pending approval</p>
              )}
            </div>
          </div>

          {/* Registrations Metric */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats?.approved_registrations || 0}</p>
              <p className="text-sm text-gray-600 mt-1">Approved Registrations</p>
              {stats && stats.pending_registrations > 0 && (
                <p className="text-xs text-amber-600 mt-2 font-medium">{stats.pending_registrations} pending review</p>
              )}
            </div>
          </div>

          {/* Bookings Metric */}
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats?.total_bookings || 0}</p>
              <p className="text-sm text-gray-600 mt-1">Total Interviews</p>
              <p className="text-xs text-gray-500 mt-2">{stats?.total_students || 0} students registered</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upcoming Events */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Upcoming Events</h2>
              <Link href="/admin/events" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                View all
              </Link>
            </div>
            <div className="p-6">
              {upcomingEvents.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-600">No upcoming events</p>
                  <Link href="/admin/events" className="mt-4 inline-block text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                    Create your first event →
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcomingEvents.map((event) => (
                    <Link
                      key={event.id}
                      href={`/admin/events/${event.id}/registrations`}
                      className="block p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-md transition"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{event.name}</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {new Date(event.date).toLocaleDateString('en-US', { 
                              weekday: 'long', 
                              month: 'long', 
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                        {event.pending_registrations > 0 && (
                          <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded-full">
                            {event.pending_registrations} pending
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t border-gray-100">
                        <div>
                          <p className="text-xs text-gray-500">Companies</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {event.approved_registrations}/{event.total_companies}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Interviews</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {event.booked_slots}/{event.total_slots}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Fill Rate</p>
                          <p className="text-sm font-semibold text-gray-900">{event.booking_rate}%</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pending Approvals */}
          <div className="space-y-6">
            {/* Pending Companies */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Pending Company Verifications</h2>
                <Link href="/admin/companies" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                  View all
                </Link>
              </div>
              <div className="p-6">
                {pendingCompanies.length === 0 ? (
                  <p className="text-center text-sm text-gray-600 py-4">No pending verifications</p>
                ) : (
                  <div className="space-y-3">
                    {pendingCompanies.map((company: any) => (
                      <Link
                        key={company.id}
                        href="/admin/companies"
                        className="block p-3 border border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-sm transition"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900">{company.company_name}</p>
                            <p className="text-sm text-gray-600">{company.industry || 'Industry not specified'}</p>
                          </div>
                          <span className="text-xs text-gray-500">
                            {new Date(company.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Pending Registrations */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Pending Event Registrations</h2>
              </div>
              <div className="p-6">
                {pendingRegistrations.length === 0 ? (
                  <p className="text-center text-sm text-gray-600 py-4">No pending registrations</p>
                ) : (
                  <div className="space-y-3">
                    {pendingRegistrations.map((reg: any) => (
                      <Link
                        key={reg.id}
                        href={`/admin/events/${reg.events.id}/registrations`}
                        className="block p-3 border border-gray-200 rounded-lg hover:border-indigo-300 hover:shadow-sm transition"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{reg.companies.company_name}</p>
                          <p className="text-sm text-gray-600 mt-1">{reg.events.name}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Registered {new Date(reg.registered_at).toLocaleDateString()}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
