import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Users, Filter, Download } from 'lucide-react'

type StudentWithBookings = {
  student_id: string
  student_name: string
  student_email: string
  specialization: string | null
  graduation_year: number | null
  total_bookings: number
  companies: Array<{
    company_name: string
    company_id: string
  }>
  sessions: string[]
}

type Event = {
  id: string
  name: string
  date: string
}

export default function EventStudents() {
  const navigate = useNavigate()
  const { id: eventId } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState<Event | null>(null)
  const [students, setStudents] = useState<StudentWithBookings[]>([])
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([])
  
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCompany, setFilterCompany] = useState<string>('all')

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
    if (!eventId) return

    const { data: eventData } = await supabase
      .from('events')
      .select('id, name, date')
      .eq('id', eventId)
      .single()

    if (eventData) setEvent(eventData)

    const { data: participantsData } = await supabase
      .from('event_participants')
      .select(`
        companies!inner (
          id,
          company_name
        )
      `)
      .eq('event_id', eventId)

    if (participantsData) {
      const uniqueCompanies = participantsData
        .map((p: any) => ({ id: p.companies.id, name: p.companies.company_name }))
        .filter((c: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.id === c.id) === i)
      setCompanies(uniqueCompanies)
    }

    // First get slot IDs for this event
    const { data: eventSlots, error: slotsError } = await supabase
      .from('event_slots')
      .select('id, company_id, session_id')
      .eq('event_id', eventId)
      .eq('is_active', true);

    if (slotsError) {
      console.error('Error fetching event slots:', slotsError);
    }

    const slotIds = eventSlots?.map(s => s.id) || [];
    console.log(`Found ${slotIds.length} active slots for event ${eventId}`);

    // Then query bookings using slot IDs - only if we have slots
    // Use the bookings table (interview_bookings was deprecated)
    // Query bookings separately to avoid complex nested relationship issues
    let bookingsData: any[] = [];
    if (slotIds.length > 0) {
      // Get bookings with student info
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, student_id, slot_id')
        .in('slot_id', slotIds)
        .eq('status', 'confirmed');
      
      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
        bookingsData = [];
      } else {
        console.log(`Found ${bookings?.length || 0} confirmed bookings for ${slotIds.length} slots`);
        if (bookings && bookings.length > 0) {
          // Get unique student IDs
          const studentIds = [...new Set(bookings.map(b => b.student_id))];
          
          // Get student profiles
          const { data: studentProfiles } = await supabase
            .from('profiles')
            .select('id, full_name, email, specialization, graduation_year')
            .in('id', studentIds);
          
          // Get slot details with company info
          const uniqueSlotIds = [...new Set(bookings.map(b => b.slot_id))];
          const { data: slotsWithDetails } = await supabase
            .from('event_slots')
            .select(`
              id,
              company_id,
              session_id,
              companies!inner (
                id,
                company_name
              )
            `)
            .in('id', uniqueSlotIds);
          
          // Get session names if any slots have sessions
          const sessionIds = [...new Set(slotsWithDetails?.map(s => s.session_id).filter(Boolean) || [])];
          let sessionsMap = new Map<string, string>();
          if (sessionIds.length > 0) {
            const { data: sessions } = await supabase
              .from('speed_recruiting_sessions')
              .select('id, name')
              .in('id', sessionIds);
            
            sessions?.forEach(s => sessionsMap.set(s.id, s.name));
          }
          
          // Create a map for quick lookups
          const profilesMap = new Map(studentProfiles?.map(p => [p.id, p]) || []);
          const slotsMap = new Map(slotsWithDetails?.map(s => [s.id, s]) || []);
          
          // Combine data
          bookingsData = bookings.map(booking => {
            const profile = profilesMap.get(booking.student_id);
            const slot = slotsMap.get(booking.slot_id);
            const sessionName = slot?.session_id ? sessionsMap.get(slot.session_id) : null;
            
            return {
              student_id: booking.student_id,
              slot_id: booking.slot_id,
              profiles: profile || null,
              event_slots: slot ? {
                company_id: slot.company_id,
                event_id: eventId,
                companies: slot.companies,
                speed_recruiting_sessions: sessionName ? { name: sessionName } : null
              } : null
            };
          }).filter(b => b.profiles && b.event_slots); // Filter out any incomplete data
        }
      }
    }

    if (bookingsData && bookingsData.length > 0) {
      const studentMap = new Map<string, StudentWithBookings>()

      bookingsData.forEach((booking: any) => {
        // Skip if data is incomplete
        if (!booking.profiles || !booking.event_slots) {
          console.warn('Skipping booking with incomplete data:', booking);
          return;
        }
        
        const studentId = booking.profiles.id
        
        if (!studentMap.has(studentId)) {
          studentMap.set(studentId, {
            student_id: studentId,
            student_name: booking.profiles.full_name,
            student_email: booking.profiles.email,
            specialization: booking.profiles.specialization,
            graduation_year: booking.profiles.graduation_year,
            total_bookings: 0,
            companies: [],
            sessions: []
          })
        }

        const student = studentMap.get(studentId)!
        student.total_bookings++

        const companyId = booking.event_slots.companies.id
        const companyName = booking.event_slots.companies.company_name
        if (!student.companies.find(c => c.company_id === companyId)) {
          student.companies.push({ company_id: companyId, company_name: companyName })
        }

        // Handle session name (might be null)
        const sessionName = booking.event_slots.speed_recruiting_sessions?.name
        if (sessionName && !student.sessions.includes(sessionName)) {
          student.sessions.push(sessionName)
        }
      })

      const studentsArray = Array.from(studentMap.values());
      console.log('Loaded students:', studentsArray.length);
      setStudents(studentsArray);
    } else {
      // No bookings found - set empty array
      console.log('No bookings found for event:', eventId);
      setStudents([])
    }
  }

  const filteredStudents = students.filter(student => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesName = student.student_name.toLowerCase().includes(query)
      const matchesEmail = student.student_email.toLowerCase().includes(query)
      const matchesSpecialization = student.specialization?.toLowerCase().includes(query)
      if (!matchesName && !matchesEmail && !matchesSpecialization) return false
    }

    if (filterCompany !== 'all') {
      const hasCompany = student.companies.some(c => c.company_id === filterCompany)
      if (!hasCompany) return false
    }

    return true
  })

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Specialization', 'Graduation Year', 'Total Interviews', 'Companies', 'Sessions']
    const rows = filteredStudents.map(s => [
      s.student_name,
      s.student_email,
      s.specialization || 'N/A',
      s.graduation_year?.toString() || 'N/A',
      s.total_bookings.toString(),
      s.companies.map(c => c.company_name).join('; '),
      s.sessions.join('; ')
    ])

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${event?.name || 'event'}-students.csv`
    a.click()
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{event.name}</h1>
              <p className="text-sm text-muted-foreground mt-1">Student Participation</p>
            </div>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-card rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Total Students</p>
            <p className="text-2xl font-bold">{students.length}</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Total Interviews</p>
            <p className="text-2xl font-bold text-primary">
              {students.reduce((sum, s) => sum + s.total_bookings, 0)}
            </p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Avg Interviews/Student</p>
            <p className="text-2xl font-bold text-success">
              {students.length > 0
                ? (students.reduce((sum, s) => sum + s.total_bookings, 0) / students.length).toFixed(1)
                : 0}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-lg border p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Filters</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Search</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or specialization..."
                className="w-full px-3 py-2 bg-background border rounded-md"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Company</label>
              <select
                value={filterCompany}
                onChange={(e) => setFilterCompany(e.target.value)}
                className="w-full px-3 py-2 bg-background border rounded-md"
              >
                <option value="all">All Companies</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>{company.name}</option>
                ))}
              </select>
            </div>
          </div>

          {(searchQuery || filterCompany !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('')
                setFilterCompany('all')
              }}
              className="mt-4 text-sm text-primary hover:underline"
            >
              Clear all filters
            </button>
          )}
        </div>

        {/* Students Table */}
        <div className="bg-card rounded-lg border">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold">
              Students ({filteredStudents.length})
            </h3>
          </div>

          {filteredStudents.length === 0 ? (
            <div className="px-6 py-12 text-center text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No students found matching your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted">
                    <th className="text-left py-3 px-4 font-semibold">Student</th>
                    <th className="text-left py-3 px-4 font-semibold">Specialization</th>
                    <th className="text-center py-3 px-4 font-semibold">Interviews</th>
                    <th className="text-left py-3 px-4 font-semibold">Companies</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map(student => (
                    <tr key={student.student_id} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-sm font-medium">
                            {student.student_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {student.student_email}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm">
                          {student.specialization || 'N/A'}
                        </p>
                        {student.graduation_year && (
                          <p className="text-xs text-muted-foreground">
                            Class of {student.graduation_year}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-1 bg-primary/10 text-primary text-sm rounded-full font-medium">
                          {student.total_bookings}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {student.companies.map((company, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded"
                            >
                              {company.company_name}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
