'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Company = {
  id: string
  company_name: string
  description: string | null
  website: string | null
  is_verified: boolean
  verification_status: 'pending' | 'verified' | 'rejected'
  created_at: string
  profile_id: string
  profiles: {
    email: string
    full_name: string
    phone: string | null
  }
}

export default function CompaniesManagement() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [companies, setCompanies] = useState<Company[]>([])
  const [allCompanies, setAllCompanies] = useState<Company[]>([]) // Store all companies for counts
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('pending')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    checkAdminAndLoadData()
  }, [filter])

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

      await loadCompanies()
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadCompanies = async () => {
    try {
      // First, load ALL companies for accurate counts
      const { data: allData, error: allError } = await supabase
        .from('companies')
        .select(`
          *,
          profiles!companies_profile_id_fkey (
            email,
            full_name,
            phone
          )
        `)
        .order('created_at', { ascending: false })

      if (allError) {
        console.error('Error loading all companies:', allError)
        throw allError
      }

      if (allData) {
        setAllCompanies(allData as any)
      }

      // Then load filtered companies
      let query = supabase
        .from('companies')
        .select(`
          *,
          profiles!companies_profile_id_fkey (
            email,
            full_name,
            phone
          )
        `)
        .order('created_at', { ascending: false })

      if (filter !== 'all') {
        query = query.eq('verification_status', filter)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error loading companies:', error)
        throw error
      }

      if (data) {
        setCompanies(data as any)
      }
    } catch (err) {
      console.error('Failed to load companies:', err)
    }
  }

  const handleVerify = async (companyId: string, status: 'verified' | 'rejected') => {
    const action = status === 'verified' ? 'verify' : 'reject'
    if (!confirm(`Are you sure you want to ${action} this company?`)) return

    try {
      const { error } = await supabase.rpc('fn_verify_company', {
        p_company_id: companyId,
        p_is_verified: status === 'verified'
      })

      if (error) throw error

      await loadCompanies()
      alert(`Company ${action === 'verify' ? 'verified' : 'rejected'} successfully!`)
    } catch (err: any) {
      alert('Error: ' + err.message)
    }
  }

  const filteredCompanies = companies.filter(company => {
    if (searchQuery === '') return true
    const search = searchQuery.toLowerCase()
    return (
      company.company_name.toLowerCase().includes(search) ||
      company.profiles.email.toLowerCase().includes(search) ||
      (company.website && company.website.toLowerCase().includes(search))
    )
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  const pendingCount = allCompanies.filter(c => c.verification_status === 'pending').length
  const verifiedCount = allCompanies.filter(c => c.verification_status === 'verified').length
  const rejectedCount = allCompanies.filter(c => c.verification_status === 'rejected').length

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Manage Companies</h1>
              <p className="text-gray-600 mt-1">Review and verify company registrations</p>
            </div>
            <Link href="/admin" className="text-gray-600 hover:text-gray-900">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-blue-600">{allCompanies.length}</div>
            <div className="text-sm text-gray-600">Total Companies</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-orange-600">{pendingCount}</div>
            <div className="text-sm text-gray-600">Pending Review</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-green-600">{verifiedCount}</div>
            <div className="text-sm text-gray-600">Verified</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-red-600">{rejectedCount}</div>
            <div className="text-sm text-gray-600">Rejected</div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by company name, email, or website..."
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
                All ({allCompanies.length})
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-4 py-2 rounded-md transition ${
                  filter === 'pending' 
                    ? 'bg-orange-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Pending ({pendingCount})
              </button>
              <button
                onClick={() => setFilter('verified')}
                className={`px-4 py-2 rounded-md transition ${
                  filter === 'verified' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Verified ({verifiedCount})
              </button>
              <button
                onClick={() => setFilter('rejected')}
                className={`px-4 py-2 rounded-md transition ${
                  filter === 'rejected' 
                    ? 'bg-red-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Rejected ({rejectedCount})
              </button>
            </div>
          </div>
        </div>

        {/* Companies List */}
        {filteredCompanies.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500">
              {searchQuery ? 'No companies match your search.' : `No ${filter} companies.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCompanies.map(company => (
              <div key={company.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">{company.company_name}</h3>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                        company.verification_status === 'verified' 
                          ? 'bg-green-100 text-green-800' 
                          : company.verification_status === 'pending'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {company.verification_status === 'verified' ? '✓ Verified' : 
                         company.verification_status === 'pending' ? '⏳ Pending' : 
                         '✕ Rejected'}
                      </span>
                    </div>

                    {company.description && (
                      <p className="text-gray-600 mb-3">{company.description}</p>
                    )}

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Contact Person:</span>
                        <p className="font-medium text-gray-900">{company.profiles.full_name}</p>
                      </div>
                      <div>
                        <span className="text-gray-500">Email:</span>
                        <p className="font-medium text-gray-900">{company.profiles.email}</p>
                      </div>
                      {company.profiles.phone && (
                        <div>
                          <span className="text-gray-500">Phone:</span>
                          <p className="font-medium text-gray-900">{company.profiles.phone}</p>
                        </div>
                      )}
                      {company.website && (
                        <div>
                          <span className="text-gray-500">Website:</span>
                          <a 
                            href={company.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="font-medium text-blue-600 hover:text-blue-800"
                          >
                            {company.website}
                          </a>
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-gray-400 mt-3">
                      Registered on {new Date(company.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {company.verification_status === 'pending' && (
                    <div className="flex flex-col gap-2 ml-4">
                      <button
                        onClick={() => handleVerify(company.id, 'verified')}
                        className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition font-medium"
                      >
                        ✓ Verify
                      </button>
                      <button
                        onClick={() => handleVerify(company.id, 'rejected')}
                        className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 transition font-medium"
                      >
                        ✕ Reject
                      </button>
                    </div>
                  )}

                  {company.verification_status === 'rejected' && (
                    <button
                      onClick={() => handleVerify(company.id, 'verified')}
                      className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition font-medium ml-4"
                    >
                      ✓ Verify
                    </button>
                  )}

                  {company.verification_status === 'verified' && (
                    <button
                      onClick={() => handleVerify(company.id, 'rejected')}
                      className="bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 transition font-medium ml-4"
                    >
                      ✕ Revoke
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
