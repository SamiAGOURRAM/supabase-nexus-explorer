'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type StudentBooking = {
  id: string
  student_id: string
  offer_title: string
  slot_time: string
  status: string
  notes: string | null
  student: {
    full_name: string
    email: string
    phone: string | null
    student_number: string | null
    specialization: string | null
    graduation_year: number | null
    cv_url: string | null
  }
}

export default function StudentsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [bookings, setBookings] = useState<StudentBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [specializationFilter, setSpecializationFilter] = useState('')
  const [yearFilter, setYearFilter] = useState('')

  useEffect(() => {
    loadStudents()
  }, [])

  const loadStudents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('profile_id', user.id)
        .single()

      if (!company) throw new Error('Company not found')

      const { data, error } = await supabase
        .from('interview_bookings')
        .select(`
          id,
          student_id,
          status,
          notes,
          event_slots (
            slot_time
          ),
          profiles!interview_bookings_student_id_fkey (
            full_name,
            email,
            phone,
            student_number,
            specialization,
            graduation_year,
            cv_url
          ),
          offers!inner (
            title,
            company_id
          )
        `)
        .eq('offers.company_id', company.id)
        .order('event_slots(slot_time)', { ascending: true })

      if (error) throw error

      const formattedBookings = data?.map((booking: any) => ({
        id: booking.id,
        student_id: booking.student_id,
        offer_title: booking.offers.title,
        slot_time: booking.event_slots?.slot_time || 'N/A',
        status: booking.status,
        notes: booking.notes,
        student: booking.profiles
      })) || []

      setBookings(formattedBookings)
    } catch (err) {
      console.error('Error loading students:', err)
    } finally {
      setLoading(false)
    }
  }

  const exportToCSV = () => {
    let csv = 'Student Name,Email,Phone,Student Number,Specialization,Graduation Year,Offer,Interview Date,Status,Notes\n'
    
    filteredBookings.forEach(booking => {
      const date = booking.slot_time !== 'N/A' ? new Date(booking.slot_time).toLocaleString() : 'N/A'
      csv += `"${booking.student.full_name}","${booking.student.email}","${booking.student.phone || ''}","${booking.student.student_number || ''}","${booking.student.specialization || ''}","${booking.student.graduation_year || ''}","${booking.offer_title}","${date}","${booking.status}","${booking.notes || ''}"\n`
    })

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `students-list-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
  }

  // Get unique values for filters
  const specializations = Array.from(new Set(bookings.map(b => b.student.specialization).filter(Boolean)))
  const graduationYears = Array.from(new Set(bookings.map(b => b.student.graduation_year).filter(Boolean))).sort()

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = searchQuery === '' || 
      booking.student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (booking.student.student_number && booking.student.student_number.toLowerCase().includes(searchQuery.toLowerCase()))
    
    const matchesSpecialization = !specializationFilter || booking.student.specialization === specializationFilter
    const matchesYear = !yearFilter || booking.student.graduation_year?.toString() === yearFilter

    return matchesSearch && matchesSpecialization && matchesYear
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading students...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Student Directory</h1>
              <p className="text-gray-600 mt-1">All students who booked interviews with your company</p>
            </div>
            <div className="flex gap-3">
              <Link href="/company" className="text-gray-600 hover:text-gray-900">
                ← Dashboard
              </Link>
              <button
                onClick={exportToCSV}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition"
              >
                📥 Export CSV
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-blue-600">
              {new Set(bookings.map(b => b.student_id)).size}
            </div>
            <div className="text-sm text-gray-600">Unique Students</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-green-600">
              {bookings.filter(b => b.status === 'confirmed').length}
            </div>
            <div className="text-sm text-gray-600">Confirmed</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-yellow-600">
              {bookings.filter(b => b.status === 'pending').length}
            </div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-purple-600">
              {bookings.length}
            </div>
            <div className="text-sm text-gray-600">Total Bookings</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search by Name, Email or Student #
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Specialization
              </label>
              <select
                value={specializationFilter}
                onChange={(e) => setSpecializationFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Specializations</option>
                {specializations.map(spec => (
                  <option key={spec} value={spec as string}>{spec}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Graduation Year
              </label>
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Years</option>
                {graduationYears.map(year => (
                  <option key={year} value={year?.toString()}>{year}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Students Table */}
        {filteredBookings.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 mb-4">
              {searchQuery || specializationFilter || yearFilter 
                ? 'No students match your filters.' 
                : 'No student bookings yet.'}
            </p>
            <p className="text-sm text-gray-400">
              Students will appear here once they book interviews with your company.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Academic Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Interview Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredBookings.map(booking => (
                    <tr key={booking.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {booking.student.full_name}
                        </div>
                        {booking.student.student_number && (
                          <div className="text-sm text-gray-500">
                            #{booking.student.student_number}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{booking.student.email}</div>
                        {booking.student.phone && (
                          <div className="text-sm text-gray-500">{booking.student.phone}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {booking.student.specialization && (
                          <div className="text-sm text-gray-900">{booking.student.specialization}</div>
                        )}
                        {booking.student.graduation_year && (
                          <div className="text-sm text-gray-500">Class of {booking.student.graduation_year}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{booking.offer_title}</div>
                        <div className="text-sm text-gray-500">
                          {booking.slot_time !== 'N/A' 
                            ? new Date(booking.slot_time).toLocaleString()
                            : 'No slot assigned'}
                        </div>
                        <span className={`inline-flex mt-1 px-2 py-1 text-xs font-semibold rounded-full ${
                          booking.status === 'confirmed' 
                            ? 'bg-green-100 text-green-800' 
                            : booking.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          {booking.student.cv_url && (
                            <a
                              href={booking.student.cv_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-900"
                            >
                              📄 CV
                            </a>
                          )}
                          <Link
                            href={`/company/schedule`}
                            className="text-purple-600 hover:text-purple-900"
                          >
                            📅 Schedule
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="mt-6 text-center text-sm text-gray-500">
          Showing {filteredBookings.length} of {bookings.length} booking{bookings.length !== 1 ? 's' : ''}
        </div>
      </main>
    </div>
  )
}
