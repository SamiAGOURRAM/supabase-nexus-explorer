import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Building2, TrendingUp, Users, Trash2 } from 'lucide-react'

type CompanyStats = {
  id: string
  participant_id: string
  company_name: string
  company_code: string
  email: string | null
  industry: string | null
  website: string | null
  total_slots: number
  booked_slots: number
  unique_students: number
}

type Event = {
  id: string
  name: string
  date: string
}

export default function EventCompanies() {
  const navigate = useNavigate()
  const { id: eventId } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState<Event | null>(null)
  const [companies, setCompanies] = useState<CompanyStats[]>([])

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
        id,
        company_id,
        companies!inner (
          id,
          company_name,
          company_code,
          email,
          industry,
          website
        )
      `)
      .eq('event_id', eventId)

    if (participantsData) {
      const companiesWithStats = await Promise.all(
        participantsData.map(async (p: any) => {
          const company = p.companies

          const { count: totalSlots } = await supabase
            .from('event_slots')
            .select('*', { count: 'exact', head: true })
            .eq('event_id', eventId)
            .eq('company_id', company.id)

          const { data: bookedSlotsData } = await supabase
            .from('event_slots')
            .select(`
              id,
              interview_bookings!inner (
                id,
                student_id
              )
            `)
            .eq('event_id', eventId)
            .eq('company_id', company.id)

          const bookedSlots = bookedSlotsData?.length || 0
          
          const uniqueStudents = new Set(
            bookedSlotsData?.flatMap((slot: any) => 
              slot.interview_bookings.map((b: any) => b.student_id)
            ) || []
          ).size

          return {
            ...company,
            participant_id: p.id,
            total_slots: totalSlots || 0,
            booked_slots: bookedSlots,
            unique_students: uniqueStudents
          }
        })
      )

      setCompanies(companiesWithStats as any)
    }
  }

  const handleRemoveCompany = async (participantId: string, companyName: string) => {
    if (!confirm(`Remove ${companyName} from this event?`)) return

    const { error } = await supabase
      .from('event_participants')
      .delete()
      .eq('id', participantId)

    if (error) {
      alert('Error removing company: ' + error.message)
    } else {
      await loadData()
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

  const totalStats = {
    companies: companies.length,
    totalSlots: companies.reduce((sum, c) => sum + c.total_slots, 0),
    bookedSlots: companies.reduce((sum, c) => sum + c.booked_slots, 0),
    avgBookingRate: companies.length > 0
      ? Math.round(
          (companies.reduce((sum, c) => sum + (c.total_slots > 0 ? (c.booked_slots / c.total_slots) * 100 : 0), 0) /
            companies.length)
        )
      : 0
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link to="/admin/events" className="text-sm text-primary hover:underline mb-2 inline-block">
            ← Back to Events
          </Link>
          <h1 className="text-2xl font-bold">{event.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">Company Analytics</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-card rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Companies</p>
            <p className="text-2xl font-bold">{totalStats.companies}</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Total Slots</p>
            <p className="text-2xl font-bold">{totalStats.totalSlots}</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Booked Slots</p>
            <p className="text-2xl font-bold text-primary">{totalStats.bookedSlots}</p>
          </div>
          <div className="bg-card rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">Avg Booking Rate</p>
            <p className="text-2xl font-bold text-success">{totalStats.avgBookingRate}%</p>
          </div>
        </div>

        {/* Companies List */}
        <div className="bg-card rounded-lg border">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold">
              Companies ({companies.length})
            </h3>
          </div>

          {companies.length === 0 ? (
            <div className="px-6 py-12 text-center text-muted-foreground">
              <Building2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No companies invited yet.</p>
            </div>
          ) : (
            <div className="divide-y">
              {companies.map(company => {
                const bookingRate = company.total_slots > 0
                  ? Math.round((company.booked_slots / company.total_slots) * 100)
                  : 0

                return (
                  <div
                    key={company.id}
                    className="px-6 py-4 hover:bg-muted/50 transition"
                  >
                    <div className="flex items-start justify-between">
                      <Link
                        to={`/admin/events/${eventId}/companies/${company.id}`}
                        className="flex-1"
                      >
                        <div className="flex items-center gap-3">
                          <h4 className="text-lg font-semibold">
                            {company.company_name}
                          </h4>
                          <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded font-mono">
                            {company.company_code}
                          </span>
                        </div>
                        
                        {company.industry && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {company.industry}
                          </p>
                        )}

                        <div className="mt-3 grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Interview Slots</p>
                            <p className="text-sm font-medium">
                              {company.booked_slots} / {company.total_slots}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Booking Rate</p>
                            <p className="text-sm font-medium">
                              {bookingRate}%
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Students Met</p>
                            <p className="text-sm font-medium flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {company.unique_students}
                            </p>
                          </div>
                        </div>
                      </Link>

                      <div className="ml-4 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveCompany(company.participant_id, company.company_name)
                          }}
                          className="p-2 text-destructive hover:bg-destructive/10 rounded transition"
                          title="Remove company from event"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
