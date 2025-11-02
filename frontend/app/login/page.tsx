'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import { isEmailAllowed, EMAIL_NOT_ALLOWED_MESSAGE } from '@/lib/email-validation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [loginAs, setLoginAs] = useState<'student' | 'company'>('student')
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  useEffect(() => {
    // Check if user is already logged in
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile) {
        redirectUser(profile.role)
      }
    }
  }

  const redirectUser = (role: string) => {
    const redirect = searchParams.get('redirect')
    if (redirect) {
      router.push(redirect)
    } else if (role === 'admin') {
      router.push('/admin')
    } else if (role === 'company') {
      router.push('/company')
    } else {
      router.push('/student')
    }
  }

  const handleMicrosoftLogin = async () => {
    setError('')
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          scopes: 'email',
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // First, try to login to get the user's actual role
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()

      if (profile) {
        // Special case: Admin can login from anywhere
        if (profile.role === 'admin') {
          redirectUser(profile.role)
          return
        }

        // Validate email based on login type for non-admin users
        if (loginAs === 'student' && !isEmailAllowed(email)) {
          await supabase.auth.signOut()
          throw new Error(EMAIL_NOT_ALLOWED_MESSAGE)
        }

        // Verify the role matches the login type
        if (loginAs === 'student' && profile.role !== 'student') {
          await supabase.auth.signOut()
          throw new Error('This account is not a student account. Please use Company Login.')
        }
        if (loginAs === 'company' && profile.role !== 'company') {
          await supabase.auth.signOut()
          throw new Error('This account is not a company account. Please use Student Login.')
        }
        
        redirectUser(profile.role)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div>
          <h2 className="text-3xl font-bold text-center">INF Platform 2.0</h2>
          <p className="mt-2 text-center text-gray-600">Login</p>
        </div>

        {/* Login Type Selector */}
        <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
          <button
            type="button"
            onClick={() => setLoginAs('student')}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
              loginAs === 'student'
                ? 'bg-blue-600 text-white'
                : 'text-gray-700 hover:bg-gray-200'
            }`}
          >
            Student
          </button>
          <button
            type="button"
            onClick={() => setLoginAs('company')}
            className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
              loginAs === 'company'
                ? 'bg-gray-700 text-white'
                : 'text-gray-700 hover:bg-gray-200'
            }`}
          >
            Company
          </button>
        </div>

        <div className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Microsoft Login (Students only) */}
          {loginAs === 'student' && (
            <>
              <button
                onClick={handleMicrosoftLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 border-2 border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 23 23">
                  <path fill="#f3f3f3" d="M0 0h23v23H0z"/>
                  <path fill="#f35325" d="M1 1h10v10H1z"/>
                  <path fill="#81bc06" d="M12 1h10v10H12z"/>
                  <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                  <path fill="#ffba08" d="M12 12h10v10H12z"/>
                </svg>
                Sign in with UM6P Account
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with email</span>
                </div>
              </div>
            </>
          )}

          {/* Email/Password Login */}
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                {loginAs === 'student' ? 'Email UM6P (@um6p.ma)' : 'Company Email'}
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={loginAs === 'student' ? 'prenom.nom@um6p.ma' : 'contact@company.com'}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Sign In with Email'}
            </button>
          </form>

          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">Don't have an account?</p>
            <div className="flex gap-4 justify-center">
              <button
                type="button"
                onClick={() => router.push('/signup')}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Student Signup
              </button>
              <span className="text-gray-400">|</span>
              <button
                type="button"
                onClick={() => router.push('/signup/company')}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Company Signup
              </button>
            </div>
            <button
              onClick={() => router.push('/offers')}
              className="text-sm text-gray-600 hover:text-gray-800 block w-full mt-4"
            >
              ← Back to Offers
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
