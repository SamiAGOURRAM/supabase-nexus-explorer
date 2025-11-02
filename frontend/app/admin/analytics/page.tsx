'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type StudentAnalytics = {
  total_students: number
  students_with_bookings: number
  total_bookings: number
  avg_bookings_per_student: number
  students_by_specialization: Record<string, number>
  students_by_graduation_year: Record<string, number>
}

type EventAnalytics = {
  event_id: string
  event_name: string
  event_date: string
  total_slots: number
  booked_slots: number
  available_slots: number
  total_companies: number
  total_offers: number
  total_students: number
  booking_rate: number
}

type CompanyAnalytics = {
  company_id: string
  company_name: string
  total_offers: number
  active_offers: number
  total_bookings: number
  confirmed_bookings: number
  unique_students: number
  is_verified: boolean
}

export default function AnalyticsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [studentAnalytics, setStudentAnalytics] = useState<StudentAnalytics | null>(null)
  const [eventAnalytics, setEventAnalytics] = useState<EventAnalytics[]>([])
  const [companyAnalytics, setCompanyAnalytics] = useState<CompanyAnalytics[]>([])

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

      await loadAnalytics()
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadAnalytics = async () => {
    // Load student analytics
    const { data: studentData } = await supabase.rpc('fn_get_student_analytics')
    if (studentData && studentData.length > 0) {
      setStudentAnalytics(studentData[0])
    }

    // Load event analytics
    const { data: eventData } = await supabase.rpc('fn_get_event_analytics')
    if (eventData) {
      setEventAnalytics(eventData)
    }

    // Load company analytics
    const { data: companyData } = await supabase.rpc('fn_get_company_analytics')
    if (companyData) {
      setCompanyAnalytics(companyData)
    }
  }

  const exportToCSV = (type: 'events' | 'companies' | 'students') => {
    let csv = ''
    let filename = ''

    if (type === 'events') {
      csv = 'Event Name,Date,Total Slots,Booked,Available,Companies,Offers,Students,Booking Rate\n'
      eventAnalytics.forEach(e => {
        csv += `"${e.event_name}","${new Date(e.event_date).toLocaleDateString()}",${e.total_slots},${e.booked_slots},${e.available_slots},${e.total_companies},${e.total_offers},${e.total_students},${e.booking_rate}%\n`
      })
      filename = 'events-analytics.csv'
    } else if (type === 'companies') {
      csv = 'Company Name,Total Offers,Active Offers,Total Bookings,Confirmed,Unique Students,Verified\n'
      companyAnalytics.forEach(c => {
        csv += `"${c.company_name}",${c.total_offers},${c.active_offers},${c.total_bookings},${c.confirmed_bookings},${c.unique_students},${c.is_verified}\n`
      })
      filename = 'companies-analytics.csv'
    } else {
      csv = 'Metric,Value\n'
      csv += `Total Students,${studentAnalytics?.total_students}\n`
      csv += `Students with Bookings,${studentAnalytics?.students_with_bookings}\n`
      csv += `Total Bookings,${studentAnalytics?.total_bookings}\n`
      csv += `Avg Bookings per Student,${studentAnalytics?.avg_bookings_per_student}\n`
      filename = 'students-analytics.csv'
    }

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading analytics...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Detailed Analytics</h1>
              <p className="text-gray-600 mt-1">Comprehensive insights and statistics</p>
            </div>
            <Link href="/admin" className="text-gray-600 hover:text-gray-900">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Student Analytics Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Student Engagement</h2>
            <button
              onClick={() => exportToCSV('students')}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition text-sm"
            >
              📥 Export CSV
            </button>
          </div>

          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-3xl font-bold text-blue-600">
                {studentAnalytics?.total_students || 0}
              </div>
              <div className="text-sm text-gray-600 mt-1">Total Students</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-3xl font-bold text-green-600">
                {studentAnalytics?.students_with_bookings || 0}
              </div>
              <div className="text-sm text-gray-600 mt-1">Active Students</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-3xl font-bold text-purple-600">
                {studentAnalytics?.total_bookings || 0}
              </div>
              <div className="text-sm text-gray-600 mt-1">Total Bookings</div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-3xl font-bold text-orange-600">
                {studentAnalytics?.avg_bookings_per_student || 0}
              </div>
              <div className="text-sm text-gray-600 mt-1">Avg per Student</div>
            </div>
          </div>

          {/* Distribution Charts */}
          <div className="grid grid-cols-2 gap-6">
            {/* Specialization Distribution */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Students by Specialization</h3>
              {studentAnalytics?.students_by_specialization && Object.keys(studentAnalytics.students_by_specialization).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(studentAnalytics.students_by_specialization)
                    .sort(([, a], [, b]) => b - a)
                    .map(([spec, count]) => (
                      <div key={spec}>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">{spec}</span>
                          <span className="text-sm text-gray-600">{count} students</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{
                              width: `${(count / (studentAnalytics?.total_students || 1)) * 100}%`
                            }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No data available</p>
              )}
            </div>

            {/* Graduation Year Distribution */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Students by Graduation Year</h3>
              {studentAnalytics?.students_by_graduation_year && Object.keys(studentAnalytics.students_by_graduation_year).length > 0 ? (
                <div className="space-y-3">
                  {Object.entries(studentAnalytics.students_by_graduation_year)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([year, count]) => (
                      <div key={year}>
                        <div className="flex justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">Class of {year}</span>
                          <span className="text-sm text-gray-600">{count} students</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{
                              width: `${(count / (studentAnalytics?.total_students || 1)) * 100}%`
                            }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No data available</p>
              )}
            </div>
          </div>
        </section>

        {/* Event Analytics Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Event Performance</h2>
            <button
              onClick={() => exportToCSV('events')}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition text-sm"
            >
              📥 Export CSV
            </button>
          </div>

          {eventAnalytics.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-gray-500">No events yet</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Event</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Slots</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Booked</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Available</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Companies</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Students</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Booking Rate</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {eventAnalytics.map(event => (
                      <tr key={event.event_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{event.event_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(event.event_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {event.total_slots}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                          {event.booked_slots}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">
                          {event.available_slots}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {event.total_companies}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {event.total_students}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-gray-900 mr-2">
                              {event.booking_rate}%
                            </span>
                            <div className="w-20 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  event.booking_rate >= 80 ? 'bg-green-600' :
                                  event.booking_rate >= 50 ? 'bg-yellow-600' :
                                  'bg-red-600'
                                }`}
                                style={{ width: `${event.booking_rate}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>

        {/* Company Analytics Section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Company Rankings</h2>
            <button
              onClick={() => exportToCSV('companies')}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition text-sm"
            >
              📥 Export CSV
            </button>
          </div>

          {companyAnalytics.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-gray-500">No companies yet</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Company</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Offers</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bookings</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Confirmed</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Students</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {companyAnalytics.map((company, index) => (
                      <tr key={company.company_id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm font-bold ${
                            index === 0 ? 'text-yellow-600' :
                            index === 1 ? 'text-gray-400' :
                            index === 2 ? 'text-orange-600' :
                            'text-gray-500'
                          }`}>
                            #{index + 1}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{company.company_name}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {company.total_offers}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                          {company.active_offers}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {company.total_bookings}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">
                          {company.confirmed_bookings}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-purple-600 font-medium">
                          {company.unique_students}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            company.is_verified
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {company.is_verified ? '✓ Verified' : 'Pending'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
