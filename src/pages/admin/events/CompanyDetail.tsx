import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Building2, Users, ExternalLink } from 'lucide-react'

type Company = {
  id: string
  company_name: string
  company_code: string
  email: string | null
  industry: string | null
  website: string | null
  description: string | null
}

type StudentBooking = {
  student_id: string
  student_name: string
  student_email: string
  specialization: string | null
  graduation_year: number | null
  slot_time: string
  session_name: string
}

type Event = {
  id: string
  name: string
  date: string
}

export default function CompanyDetail() {
  const navigate = useNavigate()
  const { id: eventId, companyId } = useParams<{ id: string; companyId: string }>()
  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState<Event | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [bookings, setBookings] = useState<StudentBooking[]>([])
  const [stats, setStats] = useState({
    total_slots: 0,
    booked_slots: 0,
    unique_students: 0
  })

  useEffect(() => {
    checkAdminAndLoad()
  }, [eventId, companyId])

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
    if (!eventId || !companyId) return

    const { data: eventData } = await supabase
      .from('events')
      .select('id, name, date')
      .eq('id', eventId)
      .single()

    if (eventData) setEvent(eventData)

    const { data: companyData } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single()

    if (companyData) setCompany(companyData)

    const { count: totalSlots } = await supabase
      .from('event_slots')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('company_id', companyId)

    // First get slot IDs for this event and company
    const { data: eventSlots } = await supabase
      .from('event_slots')
      .select('id')
      .eq('event_id', eventId)
      .eq('company_id', companyId)
      .eq('is_active', true);

    const slotIds = eventSlots?.map(s => s.id) || [];

    // Then query bookings using slot IDs - only if we have slots
    let bookingsData: any[] = [];
    if (slotIds.length > 0) {
      const { data, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          id,
          student_id,
          slot_id,
          profiles!inner (
            id,
            full_name,
            email,
            specialization,
            graduation_year
          ),
          event_slots!inner (
            start_time,
            end_time,
            speed_recruiting_sessions (
              name
            )
          )
        `)
        .in('slot_id', slotIds)
        .eq('status', 'confirmed');
      
      if (bookingsError) {
        console.error('Error fetching bookings:', bookingsError);
        // Continue with empty array if query fails
        bookingsData = [];
      } else {
        bookingsData = data || [];
      }
    }

    if (bookingsData && bookingsData.length > 0) {
      const formattedBookings = bookingsData.map((b: any) => ({
        student_id: b.profiles.id,
        student_name: b.profiles.full_name,
        student_email: b.profiles.email,
        specialization: b.profiles.specialization,
        graduation_year: b.profiles.graduation_year,
        slot_time: b.event_slots.start_time,
        session_name: b.event_slots.speed_recruiting_sessions.name
      }))

      setBookings(formattedBookings)
      
      const uniqueStudents = new Set(formattedBookings.map(b => b.student_id)).size

      setStats({
        total_slots: totalSlots || 0,
        booked_slots: formattedBookings.length,
        unique_students: uniqueStudents
      })
    } else {
      // No bookings found - set empty arrays
      setBookings([])
      setStats({
        total_slots: totalSlots || 0,
        booked_slots: 0,
        unique_students: 0
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!event || !company) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-destructive">Company or event not found</p>
      </div>
    )
  }

  const bookingRate = stats.total_slots > 0
    ? Math.round((stats.booked_slots / stats.total_slots) * 100)
    : 0

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link 
            to={`/admin/events/${eventId}/companies`} 
            className="text-sm text-primary hover:underline mb-2 inline-block"
          >
            ← Back to Companies
          </Link>
          <h1 className="text-2xl font-bold">{company.company_name}</h1>
          <p className="text-sm text-muted-foreground mt-1">{event.name}</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Company Info */}
        <div className="bg-card rounded-lg border p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold">{company.company_name}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Code: <span className="font-mono">{company.company_code}</span>
              </p>
              {company.industry && (
                <p className="text-sm text-muted-foreground mt-1">
                  Industry: {company.industry}
                </p>
              )}
              {company.website && (
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
                >
                  <ExternalLink className="w-3 h-3" />
                  Visit Website
                </a>
              )}
              {company.description && (
                <p className="text-sm text-muted-foreground mt-3">
                  {company.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-card rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Total Slots</p>
            <p className="text-2xl font-bold">{stats.total_slots}</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Booked Slots</p>
            <p className="text-2xl font-bold text-primary">{stats.booked_slots}</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Booking Rate</p>
            <p className="text-2xl font-bold text-success">{bookingRate}%</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Students Met</p>
            <p className="text-2xl font-bold">{stats.unique_students}</p>
          </div>
        </div>

        {/* Student Bookings */}
        <div className="bg-card rounded-lg border">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold">
              Student Interviews ({bookings.length})
            </h3>
          </div>

          {bookings.length === 0 ? (
            <div className="px-6 py-12 text-center text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No interviews booked yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted">
                    <th className="text-left py-3 px-4 font-semibold">Student</th>
                    <th className="text-left py-3 px-4 font-semibold">Specialization</th>
                    <th className="text-left py-3 px-4 font-semibold">Session</th>
                    <th className="text-left py-3 px-4 font-semibold">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking, index) => (
                    <tr key={index} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="text-sm font-medium">
                            {booking.student_name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {booking.student_email}
                          </p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-sm">
                          {booking.specialization || 'N/A'}
                        </p>
                        {booking.graduation_year && (
                          <p className="text-xs text-muted-foreground">
                            Class of {booking.graduation_year}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {booking.session_name}
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {new Date(booking.slot_time).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
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
