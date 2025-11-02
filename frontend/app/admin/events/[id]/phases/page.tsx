'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'

type EventPhaseConfig = {
  id: string
  name: string
  date: string
  phase1_start: string
  phase1_end: string
  phase2_start: string
  phase2_end: string
  current_phase: number
  phase1_booking_limit: number
  phase2_booking_limit: number
}

export default function EventPhaseManagement() {
  const router = useRouter()
  const params = useParams()
  const supabase = createClient()
  const eventId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [event, setEvent] = useState<EventPhaseConfig | null>(null)
  
  const [formData, setFormData] = useState({
    phase1_start: '',
    phase1_end: '',
    phase2_start: '',
    phase2_end: '',
    current_phase: 0,
    phase1_booking_limit: 3,
    phase2_booking_limit: 6
  })

  useEffect(() => {
    checkAdminAndLoadEvent()
  }, [eventId])

  const checkAdminAndLoadEvent = async () => {
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

      await loadEvent()
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadEvent = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single()

    if (error) {
      console.error('Error loading event:', error)
      alert('Event not found')
      router.push('/admin/events')
      return
    }

    setEvent(data)
    setFormData({
      phase1_start: data.phase1_start || '',
      phase1_end: data.phase1_end || '',
      phase2_start: data.phase2_start || '',
      phase2_end: data.phase2_end || '',
      current_phase: data.current_phase || 0,
      phase1_booking_limit: data.phase1_booking_limit || 3,
      phase2_booking_limit: data.phase2_booking_limit || 6
    })
  }

  const handleSave = async () => {
    try {
      setSaving(true)

      // Validation
      if (new Date(formData.phase1_start) >= new Date(formData.phase1_end)) {
        alert('Phase 1 start must be before Phase 1 end')
        return
      }

      if (new Date(formData.phase1_end) > new Date(formData.phase2_start)) {
        alert('Phase 1 must end before or when Phase 2 starts')
        return
      }

      if (new Date(formData.phase2_start) >= new Date(formData.phase2_end)) {
        alert('Phase 2 start must be before Phase 2 end')
        return
      }

      if (formData.phase1_booking_limit <= 0) {
        alert('Phase 1 booking limit must be greater than 0')
        return
      }

      if (formData.phase2_booking_limit < formData.phase1_booking_limit) {
        alert('Phase 2 booking limit must be greater than or equal to Phase 1 limit')
        return
      }

      // Update event
      const { error } = await supabase
        .from('events')
        .update({
          phase1_start: formData.phase1_start,
          phase1_end: formData.phase1_end,
          phase2_start: formData.phase2_start,
          phase2_end: formData.phase2_end,
          current_phase: formData.current_phase,
          phase1_booking_limit: formData.phase1_booking_limit,
          phase2_booking_limit: formData.phase2_booking_limit
        })
        .eq('id', eventId)

      if (error) throw error

      alert('Phase configuration updated successfully!')
      await loadEvent()
    } catch (err) {
      console.error('Error saving:', err)
      alert('Error saving phase configuration')
    } finally {
      setSaving(false)
    }
  }

  const getPhaseStatus = () => {
    const now = new Date()
    const phase1Start = new Date(formData.phase1_start)
    const phase1End = new Date(formData.phase1_end)
    const phase2Start = new Date(formData.phase2_start)
    const phase2End = new Date(formData.phase2_end)

    if (now < phase1Start) {
      return { status: 'upcoming', message: 'Booking has not started yet' }
    } else if (now >= phase1Start && now < phase1End) {
      return { status: 'phase1', message: 'Currently in Phase 1 (Priority Booking)' }
    } else if (now >= phase2Start && now < phase2End) {
      return { status: 'phase2', message: 'Currently in Phase 2 (Open Booking)' }
    } else if (now >= phase2End) {
      return { status: 'ended', message: 'Booking period has ended' }
    } else {
      return { status: 'between', message: 'Between phases' }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Event not found</p>
          <Link href="/admin/events" className="mt-4 text-indigo-600 hover:text-indigo-700">
            Back to Events
          </Link>
        </div>
      </div>
    )
  }

  const phaseStatus = getPhaseStatus()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/admin/events" className="text-sm text-indigo-600 hover:text-indigo-700 mb-2 inline-block">
                ← Back to Events
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">{event.name}</h1>
              <p className="text-sm text-gray-600 mt-1">Phase Management</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Current Status */}
        <div className={`mb-8 p-6 rounded-lg border-2 ${
          phaseStatus.status === 'phase1' ? 'bg-blue-50 border-blue-300' :
          phaseStatus.status === 'phase2' ? 'bg-green-50 border-green-300' :
          phaseStatus.status === 'upcoming' ? 'bg-yellow-50 border-yellow-300' :
          'bg-gray-50 border-gray-300'
        }`}>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Current Status</h2>
          <p className="text-gray-700">{phaseStatus.message}</p>
        </div>

        {/* Manual Phase Control */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Manual Phase Control</h2>
          <p className="text-sm text-gray-600 mb-4">
            Override automatic phase detection. Use this to manually control which booking phase is active.
          </p>
          <div className="space-y-3">
            <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition"
                   style={{ borderColor: formData.current_phase === 0 ? '#4F46E5' : '#E5E7EB' }}>
              <input
                type="radio"
                name="current_phase"
                value={0}
                checked={formData.current_phase === 0}
                onChange={(e) => setFormData({ ...formData, current_phase: 0 })}
                className="mr-3"
              />
              <div>
                <p className="font-semibold text-gray-900">Phase 0 - Closed</p>
                <p className="text-sm text-gray-600">Booking is closed. Students cannot book interviews.</p>
              </div>
            </label>

            <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition"
                   style={{ borderColor: formData.current_phase === 1 ? '#4F46E5' : '#E5E7EB' }}>
              <input
                type="radio"
                name="current_phase"
                value={1}
                checked={formData.current_phase === 1}
                onChange={(e) => setFormData({ ...formData, current_phase: 1 })}
                className="mr-3"
              />
              <div>
                <p className="font-semibold text-gray-900">Phase 1 - Priority Booking</p>
                <p className="text-sm text-gray-600">
                  Only non-"Head Start" students can book (max {formData.phase1_booking_limit} interviews)
                </p>
              </div>
            </label>

            <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition"
                   style={{ borderColor: formData.current_phase === 2 ? '#4F46E5' : '#E5E7EB' }}>
              <input
                type="radio"
                name="current_phase"
                value={2}
                checked={formData.current_phase === 2}
                onChange={(e) => setFormData({ ...formData, current_phase: 2 })}
                className="mr-3"
              />
              <div>
                <p className="font-semibold text-gray-900">Phase 2 - Open to All</p>
                <p className="text-sm text-gray-600">
                  All students can book (max {formData.phase2_booking_limit} interviews)
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Phase 1 Configuration */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Phase 1 - Priority Booking</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date & Time
              </label>
              <input
                type="datetime-local"
                value={formData.phase1_start?.substring(0, 16) || ''}
                onChange={(e) => setFormData({ ...formData, phase1_start: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date & Time
              </label>
              <input
                type="datetime-local"
                value={formData.phase1_end?.substring(0, 16) || ''}
                onChange={(e) => setFormData({ ...formData, phase1_end: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Booking Limit (interviews per student)
              </label>
              <input
                type="number"
                min="1"
                value={formData.phase1_booking_limit}
                onChange={(e) => setFormData({ ...formData, phase1_booking_limit: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        </div>

        {/* Phase 2 Configuration */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Phase 2 - Open Booking</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Date & Time
              </label>
              <input
                type="datetime-local"
                value={formData.phase2_start?.substring(0, 16) || ''}
                onChange={(e) => setFormData({ ...formData, phase2_start: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Date & Time
              </label>
              <input
                type="datetime-local"
                value={formData.phase2_end?.substring(0, 16) || ''}
                onChange={(e) => setFormData({ ...formData, phase2_end: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Booking Limit (interviews per student)
              </label>
              <input
                type="number"
                min={formData.phase1_booking_limit}
                value={formData.phase2_booking_limit}
                onChange={(e) => setFormData({ ...formData, phase2_booking_limit: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />
              <p className="text-sm text-gray-500 mt-1">
                Must be ≥ Phase 1 limit ({formData.phase1_booking_limit})
              </p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end space-x-4">
          <Link
            href="/admin/events"
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>

        {/* Help Section */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">ℹ️ How Phases Work</h3>
          <ul className="text-sm text-blue-800 space-y-2">
            <li>
              <strong>Phase 1:</strong> Priority booking for standard students (non-"Head Start"). 
              Limited to {formData.phase1_booking_limit} interviews.
            </li>
            <li>
              <strong>Phase 2:</strong> Open to all students including "Head Start" students. 
              Students can book up to {formData.phase2_booking_limit} interviews total.
            </li>
            <li>
              <strong>Manual Control:</strong> Use the "Manual Phase Control" section to override automatic phase detection.
            </li>
            <li>
              <strong>Constraints:</strong> Students can only book one interview per company and cannot have overlapping time slots.
            </li>
          </ul>
        </div>
      </main>
    </div>
  )
}
