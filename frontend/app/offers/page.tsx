'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Company } from '@/types/database'

type Offer = {
  id: string
  company_id: string
  title: string
  description: string
  interest_tag: 'Opérationnel' | 'Administratif'
  requirements: string | null
  duration_months: number
  location: string | null
  remote_possible: boolean
  paid: boolean
  salary_range: string | null
  skills_required: string[] | null
  benefits: string | null
  is_active: boolean
  created_at: string
  department: string | null
}

interface OfferWithCompany extends Offer {
  companies: Company
}

export default function OffersPage() {
  const [offers, setOffers] = useState<OfferWithCompany[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'Opérationnel' | 'Administratif'>('all')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadOffers()
  }, [filter])

  const loadOffers = async () => {
    setLoading(true)
    let query = supabase
      .from('offers')
      .select(`
        *,
        companies (*)
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (filter !== 'all') {
      query = query.eq('interest_tag', filter)
    }

    const { data, error } = await query

    if (!error && data) {
      setOffers(data as OfferWithCompany[])
    }
    setLoading(false)
  }

  const handleBookSlot = (offerId: string) => {
    router.push(`/login?redirect=/student?offer=${offerId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading offers...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">INF Platform 2.0</h1>
              <p className="text-gray-600 mt-1">Speed Recruiting Event - Internship Offers</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/login')}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Student Login
              </button>
              <button
                onClick={() => router.push('/signup/company')}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Company Signup
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-3">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-md ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            All Offers ({offers.length})
          </button>
          <button
            onClick={() => setFilter('Opérationnel')}
            className={`px-4 py-2 rounded-md ${
              filter === 'Opérationnel'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            Opérationnel
          </button>
          <button
            onClick={() => setFilter('Administratif')}
            className={`px-4 py-2 rounded-md ${
              filter === 'Administratif'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            Administratif
          </button>
        </div>
      </div>

      {/* Offers Grid */}
      <div className="max-w-7xl mx-auto px-4 pb-12">
        {offers.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No offers available yet</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {offers.map((offer) => (
              <div key={offer.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-semibold">{offer.title}</h3>
                    <p className="text-gray-600 mt-1">{offer.companies.company_name}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      offer.interest_tag === 'Opérationnel'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {offer.interest_tag}
                  </span>
                </div>

                <p className="text-gray-700 mb-4 line-clamp-3">{offer.description}</p>

                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  {offer.duration_months && (
                    <div>📅 Duration: {offer.duration_months} months</div>
                  )}
                  {offer.location && <div>📍 {offer.location}</div>}
                  {offer.paid !== null && (
                    <div>{offer.paid ? '💰 Paid' : 'Unpaid'}</div>
                  )}
                  {offer.remote_possible && <div>🏠 Remote possible</div>}
                </div>

                <button
                  onClick={() => handleBookSlot(offer.id)}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                >
                  View Slots & Book
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
