'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Offer = {
  id: string
  title: string
  description: string
  interest_tag: 'Opérationnel' | 'Administratif'
  location: string | null
  duration_months: number
  paid: boolean
  remote_possible: boolean
  is_active: boolean
  created_at: string
  skills_required: string[] | null
  salary_range: string | null
}

export default function OffersListPage() {
  const router = useRouter()
  const supabase = createClient()
  const [offers, setOffers] = useState<Offer[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadOffers()
  }, [])

  const loadOffers = async () => {
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
        .from('offers')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setOffers(data || [])
    } catch (err) {
      console.error('Error loading offers:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (offerId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('offers')
        .update({ is_active: !currentStatus })
        .eq('id', offerId)

      if (error) throw error
      
      // Reload offers
      await loadOffers()
    } catch (err) {
      console.error('Error toggling offer status:', err)
      alert('Failed to update offer status')
    }
  }

  const handleDelete = async (offerId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('offers')
        .delete()
        .eq('id', offerId)

      if (error) throw error
      
      await loadOffers()
    } catch (err) {
      console.error('Error deleting offer:', err)
      alert('Failed to delete offer')
    }
  }

  const filteredOffers = offers
    .filter(offer => {
      if (filter === 'active') return offer.is_active
      if (filter === 'inactive') return !offer.is_active
      return true
    })
    .filter(offer => 
      searchQuery === '' || 
      offer.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      offer.description.toLowerCase().includes(searchQuery.toLowerCase())
    )

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
              <h1 className="text-3xl font-bold">Manage Offers</h1>
              <p className="text-gray-600 mt-1">View and edit your internship opportunities</p>
            </div>
            <div className="flex gap-3">
              <Link href="/company" className="text-gray-600 hover:text-gray-900">
                ← Dashboard
              </Link>
              <Link 
                href="/company/offers/new" 
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
              >
                + Create New Offer
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search offers by title or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-md transition ${
                  filter === 'all' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All ({offers.length})
              </button>
              <button
                onClick={() => setFilter('active')}
                className={`px-4 py-2 rounded-md transition ${
                  filter === 'active' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Active ({offers.filter(o => o.is_active).length})
              </button>
              <button
                onClick={() => setFilter('inactive')}
                className={`px-4 py-2 rounded-md transition ${
                  filter === 'inactive' 
                    ? 'bg-gray-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Inactive ({offers.filter(o => !o.is_active).length})
              </button>
            </div>
          </div>
        </div>

        {/* Offers List */}
        {filteredOffers.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 mb-4">
              {searchQuery ? 'No offers match your search.' : 'You haven\'t created any offers yet.'}
            </p>
            <Link 
              href="/company/offers/new" 
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition"
            >
              Create Your First Offer
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOffers.map(offer => (
              <div key={offer.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold">{offer.title}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        offer.interest_tag === 'Opérationnel' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {offer.interest_tag}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        offer.is_active 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {offer.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 mb-3 line-clamp-2">{offer.description}</p>
                    
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      {offer.location && (
                        <span className="flex items-center gap-1">
                          📍 {offer.location}
                        </span>
                      )}
                      <span>⏱️ {offer.duration_months} months</span>
                      {offer.paid && (
                        <span className="text-green-600 font-medium">
                          💰 Paid{offer.salary_range ? ` (${offer.salary_range})` : ''}
                        </span>
                      )}
                      {offer.remote_possible && <span>💻 Remote possible</span>}
                    </div>

                    {offer.skills_required && offer.skills_required.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {offer.skills_required.map((skill, idx) => (
                          <span key={idx} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}

                    <p className="text-xs text-gray-400 mt-3">
                      Created {new Date(offer.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    <Link
                      href={`/company/offers/${offer.id}/edit`}
                      className="bg-blue-100 text-blue-700 px-4 py-2 rounded-md hover:bg-blue-200 transition text-center text-sm font-medium"
                    >
                      ✏️ Edit
                    </Link>
                    <button
                      onClick={() => handleToggleActive(offer.id, offer.is_active)}
                      className={`px-4 py-2 rounded-md transition text-sm font-medium ${
                        offer.is_active
                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {offer.is_active ? '⏸️ Deactivate' : '▶️ Activate'}
                    </button>
                    <button
                      onClick={() => handleDelete(offer.id, offer.title)}
                      className="bg-red-100 text-red-700 px-4 py-2 rounded-md hover:bg-red-200 transition text-sm font-medium"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
