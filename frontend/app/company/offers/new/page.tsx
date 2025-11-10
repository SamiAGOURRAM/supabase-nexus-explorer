'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const DEPARTMENTS = [
  'Rooms Division',
  'Food & Beverage (F&B)',
  'Front Office',
  'Housekeeping',
  'Human Resources (HR)',
  'Finance & Accounting',
  'Sales & Marketing',
  'IT & Technology',
  'Operations Management',
  'Procurement & Supply Chain',
  'Quality Assurance',
  'Guest Relations',
  'Events & Conferences',
  'Engineering & Maintenance',
  'Revenue Management',
  'Other'
]

const INTEREST_TAGS = ['Opérationnel', 'Administratif']

interface ApprovedEvent {
  id: string
  name: string
  date: string
  location: string
}

export default function NewOfferPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [approvedEvents, setApprovedEvents] = useState<ApprovedEvent[]>([])
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    interest_tag: 'Opérationnel' as 'Opérationnel' | 'Administratif',
    department: '',
    requirements: '',
    duration_months: 3,
    location: '',
    remote_possible: false,
    paid: true,
    salary_range: '',
    skills_required: '',
    benefits: '',
    event_id: '' as string | null,
  })

  useEffect(() => {
    fetchApprovedEvents()
  }, [])

  const fetchApprovedEvents = async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('profile_id', user.id)
        .single()

      if (!company) return

      // Fetch events where company is invited (via event_participants)
      const { data: participations, error: partError } = await supabase
        .from('event_participants')
        .select(`
          events (
            id,
            name,
            date,
            location
          )
        `)
        .eq('company_id', company.id)

      if (partError) throw partError

      const events = participations
        ?.map((p: any) => p.events)
        .filter((e: any) => e !== null)
        .flat() as ApprovedEvent[]

      setApprovedEvents(events || [])
    } catch (err) {
      console.error('Error fetching approved events:', err)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Get company ID
      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('profile_id', user.id)
        .single()

      if (!company) throw new Error('Company not found')

      // Parse skills
      const skillsArray = formData.skills_required
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0)

      // Create offer
      const { error: insertError } = await supabase.from('offers').insert({
        company_id: company.id,
        title: formData.title,
        description: formData.description,
        interest_tag: formData.interest_tag,
        requirements: formData.requirements || null,
        duration_months: formData.duration_months,
        location: formData.location || null,
        remote_possible: formData.remote_possible,
        paid: formData.paid,
        salary_range: formData.salary_range || null,
        skills_required: skillsArray.length > 0 ? skillsArray : null,
        benefits: formData.benefits || null,
        event_id: formData.event_id || null,
        is_active: true,
      })

      if (insertError) throw insertError

      router.push('/company/offers')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Create New Offer</h1>
              <p className="text-gray-600 mt-1">Add a new internship opportunity</p>
            </div>
            <Link href="/company/offers" className="text-gray-600 hover:text-gray-900">
              ← Back to Offers
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold border-b pb-2">Basic Information</h2>
            
            {/* Event Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Event (Optional)
              </label>
              <select
                value={formData.event_id || ''}
                onChange={(e) => setFormData({ ...formData, event_id: e.target.value || null })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">General offer (not linked to an event)</option>
                {approvedEvents.map(event => (
                  <option key={event.id} value={event.id}>
                    {event.name} - {new Date(event.date).toLocaleDateString('fr-FR')} ({event.location})
                  </option>
                ))}
              </select>
              {approvedEvents.length === 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  ⚠️ You haven't been approved for any events yet. <Link href="/company/events" className="underline">Browse events</Link>
                </p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Link this offer to a specific event or leave as general offer
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Job Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Marketing Intern, Software Developer Intern"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <select
                  required
                  value={formData.interest_tag}
                  onChange={(e) => setFormData({ ...formData, interest_tag: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  {INTEREST_TAGS.map(tag => (
                    <option key={tag} value={tag}>{tag}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department/Division *
                </label>
                <select
                  required
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select department...</option>
                  {DEPARTMENTS.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                required
                rows={6}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the internship role, responsibilities, and what the intern will learn..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Be specific about day-to-day tasks and learning opportunities</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Requirements
              </label>
              <textarea
                rows={4}
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                placeholder="Educational level, previous experience, specific qualifications..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Skills Required
              </label>
              <input
                type="text"
                value={formData.skills_required}
                onChange={(e) => setFormData({ ...formData, skills_required: e.target.value })}
                placeholder="e.g., Excel, Communication, Project Management (comma-separated)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">Separate skills with commas</p>
            </div>
          </div>

          {/* Logistics */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold border-b pb-2">Logistics</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (months)
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={formData.duration_months}
                  onChange={(e) => setFormData({ ...formData, duration_months: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Rabat, Casablanca, Remote"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.remote_possible}
                  onChange={(e) => setFormData({ ...formData, remote_possible: e.target.checked })}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Remote work possible</span>
              </label>

              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.paid}
                  onChange={(e) => setFormData({ ...formData, paid: e.target.checked })}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Paid internship</span>
              </label>
            </div>

            {formData.paid && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Salary Range (optional)
                </label>
                <input
                  type="text"
                  value={formData.salary_range}
                  onChange={(e) => setFormData({ ...formData, salary_range: e.target.value })}
                  placeholder="e.g., 3000-5000 MAD/month"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Benefits & Perks
              </label>
              <textarea
                rows={3}
                value={formData.benefits}
                onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                placeholder="e.g., Flexible hours, mentorship program, career development opportunities..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> Interview schedule and time slots are managed by the event admin. 
              You'll be able to view your assigned time slots and student bookings after your company is verified.
            </p>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium transition"
            >
              {loading ? 'Creating...' : 'Create Offer'}
            </button>
            <Link
              href="/company/offers"
              className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-md hover:bg-gray-200 font-medium text-center transition"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  )
}
