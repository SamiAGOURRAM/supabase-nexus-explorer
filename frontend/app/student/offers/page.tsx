'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Offer = {
  id: string
  title: string
  description: string
  department: string | null
  location: string | null
  duration_months: number | null
  paid: boolean
  company: {
    company_name: string
    description: string | null
    website: string | null
  }
}

export default function OffersPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [offers, setOffers] = useState<Offer[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [paidFilter, setPaidFilter] = useState<'all' | 'paid' | 'unpaid'>('all')

  useEffect(() => {
    checkStudentAndLoadOffers()
  }, [])

  const checkStudentAndLoadOffers = async () => {
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

      if (!profile || profile.role !== 'student') {
        router.push('/offers')
        return
      }

      await loadOffers()
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadOffers = async () => {
    const { data, error } = await supabase
      .from('offers')
      .select(`
        id,
        title,
        description,
        department,
        location,
        duration_months,
        paid,
        companies!inner (
          company_name,
          description,
          website,
          is_verified
        )
      `)
      .eq('is_active', true)
      .eq('companies.is_verified', true)
      .order('created_at', { ascending: false })

    if (!error && data) {
      setOffers(data as any)
    }
  }

  const departments = Array.from(new Set(offers.map(o => o.department).filter(Boolean)))

  const filteredOffers = offers.filter(offer => {
    const matchesSearch = searchQuery === '' ||
      offer.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      offer.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      offer.company.company_name.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesDepartment = !departmentFilter || offer.department === departmentFilter
    
    const matchesPaid = paidFilter === 'all' || 
      (paidFilter === 'paid' && offer.paid) ||
      (paidFilter === 'unpaid' && !offer.paid)

    return matchesSearch && matchesDepartment && matchesPaid
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading offers...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Available Offers</h1>
              <p className="text-gray-600 mt-1">Browse internship opportunities</p>
            </div>
            <Link href="/student" className="text-gray-600 hover:text-gray-900">
              ← Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search offers, companies..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept as string}>{dept}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Compensation
              </label>
              <select
                value={paidFilter}
                onChange={(e) => setPaidFilter(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All</option>
                <option value="paid">Paid Only</option>
                <option value="unpaid">Unpaid Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-4 text-sm text-gray-600">
          Showing {filteredOffers.length} of {offers.length} offers
        </div>

        {/* Offers List */}
        {filteredOffers.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-gray-500 mb-2">No offers found</p>
            <p className="text-sm text-gray-400">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredOffers.map(offer => (
              <div key={offer.id} className="bg-white rounded-lg shadow hover:shadow-lg transition p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{offer.title}</h3>
                    <p className="text-lg text-gray-600">{offer.company.company_name}</p>
                  </div>
                  <Link
                    href={`/student/offers/${offer.id}`}
                    className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition font-medium"
                  >
                    View Details
                  </Link>
                </div>

                <p className="text-gray-700 mb-4 line-clamp-2">{offer.description}</p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {offer.department && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                      {offer.department}
                    </span>
                  )}
                  {offer.location && (
                    <span className="px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full">
                      📍 {offer.location}
                    </span>
                  )}
                  {offer.duration_months && (
                    <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full">
                      ⏱️ {offer.duration_months} months
                    </span>
                  )}
                  <span className={`px-3 py-1 text-sm rounded-full ${
                    offer.paid 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-orange-100 text-orange-800'
                  }`}>
                    {offer.paid ? '💰 Paid' : 'Unpaid'}
                  </span>
                </div>

                {offer.company.description && (
                  <p className="text-sm text-gray-600 mb-2">
                    <strong>About the company:</strong> {offer.company.description.substring(0, 150)}...
                  </p>
                )}

                {offer.company.website && (
                  <a
                    href={offer.company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    🌐 Visit website
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
