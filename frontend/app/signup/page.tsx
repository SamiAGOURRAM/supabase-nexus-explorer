'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { UserRole } from '@/types/database'

export default function SignupPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    role: 'student' as UserRole,
    is_deprioritized: false,
    company_name: '',
    description: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Validate student email domain
      if (formData.role === 'student' && !formData.email.endsWith('@um6p.ma')) {
        throw new Error('Student email must be from UM6P domain (@um6p.ma)')
      }

      // Create auth user with all metadata
      // The database trigger will automatically create profile and company
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: formData.full_name,
            role: formData.role,
            phone: formData.phone || null,
            is_deprioritized: formData.role === 'student' ? formData.is_deprioritized : false,
            // Company fields (will be ignored if student)
            company_name: formData.company_name || null,
            description: formData.description || null,
          },
        },
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('User creation failed')

      alert('Account created successfully! Please check your email to verify.')
      router.push('/login')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="text-3xl font-bold text-center">Create Account</h2>
          <p className="mt-2 text-center text-gray-600">INF Platform 2.0</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">I am a:</label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="student"
                  checked={formData.role === 'student'}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="mr-2"
                />
                Student
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="company"
                  checked={formData.role === 'company'}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="mr-2"
                />
                Company
              </label>
            </div>
          </div>

          {/* Common Fields */}
          <div className="space-y-4">
            <div>
              <label htmlFor="full_name" className="block text-sm font-medium text-gray-700">
                Full Name {formData.role === 'company' && '(Contact Person)'}
              </label>
              <input
                id="full_name"
                type="text"
                required
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone (optional)
              </label>
              <input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>

          {/* Student-specific fields */}
          {formData.role === 'student' && (
            <div className="border-t pt-4">
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md">
                <label className="flex items-start cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_deprioritized}
                    onChange={(e) => setFormData({ ...formData, is_deprioritized: e.target.checked })}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <div className="font-medium text-gray-900">I already have an internship</div>
                    <div className="text-sm text-gray-600 mt-1">
                      ⚠️ IMPORTANT: If you check this box, you will NOT be able to book during Phase 1.
                      You can only book during Phase 2.
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* Company-specific fields */}
          {formData.role === 'company' && (
            <div className="space-y-4 border-t pt-4">
              <div>
                <label htmlFor="company_name" className="block text-sm font-medium text-gray-700">
                  Company Name *
                </label>
                <input
                  id="company_name"
                  type="text"
                  required
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="description"
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 p-3 rounded text-sm text-blue-800">
                Note: Your company will need to be verified by an admin before you can create offers.
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => router.push('/login')}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Already have an account? Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
