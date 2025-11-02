'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Event = {
  id: string
  name: string
  date: string
  description: string | null
  interview_duration_minutes: number
  buffer_minutes: number
  slots_per_time: number
  created_at: string
}

type TimeRange = {
  id: string
  event_id: string
  day_date: string
  start_time: string
  end_time: string
}

export default function EventsManagement() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<Event[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null)
  const [timeRanges, setTimeRanges] = useState<TimeRange[]>([])

  const [formData, setFormData] = useState({
    name: '',
    date: '',
    description: '',
    interview_duration_minutes: 20,
    buffer_minutes: 5,
    slots_per_time: 2
  })

  const [rangeForm, setRangeForm] = useState({
    day_date: '',
    start_time: '09:00',
    end_time: '17:00'
  })

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

      await loadEvents()
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadEvents = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('date', { ascending: false })

    if (!error && data) {
      setEvents(data)
    }
  }

  const loadTimeRanges = async (eventId: string) => {
    const { data, error } = await supabase
      .from('event_time_ranges')
      .select('*')
      .eq('event_id', eventId)
      .order('day_date', { ascending: true })
      .order('start_time', { ascending: true })

    if (!error && data) {
      setTimeRanges(data)
    }
  }

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data, error } = await supabase
        .from('events')
        .insert([formData])
        .select()
        .single()

      if (error) throw error

      setShowCreateForm(false)
      setFormData({
        name: '',
        date: '',
        description: '',
        interview_duration_minutes: 20,
        buffer_minutes: 5,
        slots_per_time: 2
      })
      await loadEvents()
      alert('Event created successfully!')
    } catch (err: any) {
      alert('Error creating event: ' + err.message)
    }
  }

  const handleAddTimeRange = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEvent) return

    try {
      const { data, error } = await supabase.rpc('fn_add_event_time_range', {
        p_event_id: selectedEvent,
        p_day_date: rangeForm.day_date,
        p_start_time: rangeForm.start_time,
        p_end_time: rangeForm.end_time
      })

      if (error) throw error

      setRangeForm({
        day_date: '',
        start_time: '09:00',
        end_time: '17:00'
      })
      await loadTimeRanges(selectedEvent)
      alert('Time range added and slots generated!')
    } catch (err: any) {
      alert('Error adding time range: ' + err.message)
    }
  }

  const handleDeleteTimeRange = async (rangeId: string) => {
    if (!confirm('Delete this time range? All associated slots will be regenerated.')) return

    try {
      const { error } = await supabase.rpc('fn_delete_event_time_range', {
        p_range_id: rangeId
      })

      if (error) throw error

      if (selectedEvent) {
        await loadTimeRanges(selectedEvent)
      }
      alert('Time range deleted and slots regenerated!')
    } catch (err: any) {
      alert('Error deleting time range: ' + err.message)
    }
  }

  const handleGenerateSlots = async (eventId: string) => {
    if (!confirm('Regenerate all time slots for this event? (Note: Auto-regeneration is enabled, manual regeneration is usually not needed)')) return

    try {
      const { data, error } = await supabase.rpc('fn_trigger_slot_regeneration', {
        p_event_id: eventId
      })

      if (error) throw error

      const result = data[0]
      alert(`✅ ${result.message}\n\nSlots created: ${result.slots_created}\nCompanies: ${result.companies_processed}\nTime ranges: ${result.time_ranges_processed}`)
    } catch (err: any) {
      alert('Error generating slots: ' + err.message)
    }
  }

  const handleViewEvent = async (eventId: string) => {
    setSelectedEvent(eventId)
    await loadTimeRanges(eventId)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Manage Events</h1>
              <p className="text-gray-600 mt-1">Create events and configure interview time slots</p>
            </div>
            <Link href="/admin" className="text-gray-600 hover:text-gray-900">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Create Event Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition font-medium"
          >
            {showCreateForm ? '✕ Cancel' : '+ Create New Event'}
          </button>
        </div>

        {/* Create Event Form */}
        {showCreateForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Create New Event</h2>
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Spring 2025 Career Fair"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Event Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Event description..."
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Interview Duration (minutes) *
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="120"
                    required
                    value={formData.interview_duration_minutes}
                    onChange={(e) => setFormData({ ...formData, interview_duration_minutes: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Buffer Between Interviews (minutes) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    required
                    value={formData.buffer_minutes}
                    onChange={(e) => setFormData({ ...formData, buffer_minutes: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Simultaneous Interviews *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    required
                    value={formData.slots_per_time}
                    onChange={(e) => setFormData({ ...formData, slots_per_time: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> After creating the event, you'll be able to add multiple time ranges (e.g., 9:00-12:00, 14:00-17:00).
                  Time slots will be automatically generated based on your configuration.
                </p>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 font-medium transition"
              >
                Create Event
              </button>
            </form>
          </div>
        )}

        {/* Events List */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">All Events</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {events.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500">
                No events yet. Create your first event to get started.
              </div>
            ) : (
              events.map(event => (
                <div key={event.id} className="px-6 py-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{event.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        📅 {new Date(event.date).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                      {event.description && (
                        <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                      )}
                      <div className="flex gap-4 mt-2 text-sm text-gray-500">
                        <span>⏱️ {event.interview_duration_minutes} min interviews</span>
                        <span>⏸️ {event.buffer_minutes} min buffer</span>
                        <span>👥 {event.slots_per_time} simultaneous</span>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Link
                        href={`/admin/events/${event.id}/registrations`}
                        className="bg-purple-100 text-purple-700 px-4 py-2 rounded-md hover:bg-purple-200 transition text-sm font-medium"
                      >
                        👥 Registrations
                      </Link>
                      <Link
                        href={`/admin/events/${event.id}/phases`}
                        className="bg-blue-100 text-blue-700 px-4 py-2 rounded-md hover:bg-blue-200 transition text-sm font-medium"
                      >
                        📅 Phases
                      </Link>
                      <button
                        onClick={() => handleViewEvent(event.id)}
                        className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-md hover:bg-indigo-200 transition text-sm font-medium"
                      >
                        ⚙️ Configure Slots
                      </button>
                      <button
                        onClick={() => handleGenerateSlots(event.id)}
                        className="bg-green-100 text-green-700 px-4 py-2 rounded-md hover:bg-green-200 transition text-sm font-medium"
                      >
                        🔄 Regenerate
                      </button>
                    </div>
                  </div>

                  {/* Time Ranges for Selected Event */}
                  {selectedEvent === event.id && (
                    <div className="mt-6 border-t pt-4">
                      <h4 className="font-semibold text-gray-900 mb-4">Time Ranges</h4>
                      
                      {/* Add Time Range Form */}
                      <form onSubmit={handleAddTimeRange} className="bg-gray-50 p-4 rounded-lg mb-4">
                        <div className="grid grid-cols-4 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                            <input
                              type="date"
                              required
                              value={rangeForm.day_date}
                              onChange={(e) => setRangeForm({ ...rangeForm, day_date: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Start Time</label>
                            <input
                              type="time"
                              required
                              value={rangeForm.start_time}
                              onChange={(e) => setRangeForm({ ...rangeForm, start_time: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">End Time</label>
                            <input
                              type="time"
                              required
                              value={rangeForm.end_time}
                              onChange={(e) => setRangeForm({ ...rangeForm, end_time: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            />
                          </div>
                          <div className="flex items-end">
                            <button
                              type="submit"
                              className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm font-medium"
                            >
                              + Add Range
                            </button>
                          </div>
                        </div>
                      </form>

                      {/* Existing Time Ranges */}
                      <div className="space-y-2">
                        {timeRanges.length === 0 ? (
                          <p className="text-sm text-gray-500 italic">No time ranges yet. Add your first range above.</p>
                        ) : (
                          timeRanges.map(range => (
                            <div key={range.id} className="flex items-center justify-between bg-white border border-gray-200 p-3 rounded-lg">
                              <div className="flex items-center gap-4 text-sm">
                                <span className="font-medium text-gray-900">
                                  {new Date(range.day_date).toLocaleDateString()}
                                </span>
                                <span className="text-gray-600">
                                  {range.start_time.substring(0, 5)} - {range.end_time.substring(0, 5)}
                                </span>
                              </div>
                              <button
                                onClick={() => handleDeleteTimeRange(range.id)}
                                className="text-red-600 hover:text-red-800 text-sm font-medium"
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
