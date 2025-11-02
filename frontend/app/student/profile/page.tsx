'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Profile = {
  full_name: string
  email: string
  phone: string | null
  student_number: string | null
  specialization: string | null
  graduation_year: number | null
  cv_url: string | null
}

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [profile, setProfile] = useState<Profile>({
    full_name: '',
    email: '',
    phone: null,
    student_number: null,
    specialization: null,
    graduation_year: null,
    cv_url: null
  })

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!error && data) {
        setProfile(data)
      }
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
          student_number: profile.student_number,
          specialization: profile.specialization,
          graduation_year: profile.graduation_year
        })
        .eq('id', user.id)

      if (error) throw error

      alert('Profile updated successfully!')
    } catch (err: any) {
      alert('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB')
      return
    }

    setUploading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}_${Date.now()}.${fileExt}`
      const filePath = `cvs/${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('student-cvs')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('student-cvs')
        .getPublicUrl(filePath)

      // Update profile with CV URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ cv_url: urlData.publicUrl })
        .eq('id', user.id)

      if (updateError) throw updateError

      setProfile(prev => ({ ...prev, cv_url: urlData.publicUrl }))
      alert('CV uploaded successfully!')
    } catch (err: any) {
      alert('Error uploading CV: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteCV = async () => {
    if (!confirm('Are you sure you want to delete your CV?')) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Delete from database
      const { error } = await supabase
        .from('profiles')
        .update({ cv_url: null })
        .eq('id', user.id)

      if (error) throw error

      setProfile(prev => ({ ...prev, cv_url: null }))
      alert('CV deleted successfully!')
    } catch (err: any) {
      alert('Error: ' + err.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading profile...</div>
      </div>
    )
  }

  const completionPercentage = Math.round(
    (Object.values(profile).filter(v => v !== null && v !== '').length / Object.keys(profile).length) * 100
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">My Profile</h1>
              <p className="text-gray-600 mt-1">Manage your personal information</p>
            </div>
            <Link href="/student" className="text-gray-600 hover:text-gray-900">
              ← Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Profile Completion */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold">Profile Completion</h2>
            <span className="text-2xl font-bold text-blue-600">{completionPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          {completionPercentage < 100 && (
            <p className="text-sm text-gray-600 mt-2">
              Complete your profile to increase your chances!
            </p>
          )}
        </div>

        {/* Personal Information */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">Personal Information</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={profile.email}
                disabled
                className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={profile.phone || ''}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="+212 6XX XXX XXX"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Student Number
              </label>
              <input
                type="text"
                value={profile.student_number || ''}
                onChange={(e) => setProfile({ ...profile, student_number: e.target.value })}
                placeholder="e.g., 2023001"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Specialization
              </label>
              <select
                value={profile.specialization || ''}
                onChange={(e) => setProfile({ ...profile, specialization: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select specialization</option>
                <option value="Hotel Management">Hotel Management</option>
                <option value="Restaurant Management">Restaurant Management</option>
                <option value="Tourism Management">Tourism Management</option>
                <option value="Event Management">Event Management</option>
                <option value="Culinary Arts">Culinary Arts</option>
                <option value="Hospitality Marketing">Hospitality Marketing</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Graduation Year
              </label>
              <select
                value={profile.graduation_year || ''}
                onChange={(e) => setProfile({ ...profile, graduation_year: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select year</option>
                {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition font-medium disabled:bg-gray-400"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* CV Upload */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">CV / Resume</h2>
          
          {profile.cv_url ? (
            <div className="border-2 border-green-200 bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-4xl">📄</div>
                  <div>
                    <p className="font-medium text-gray-900">CV Uploaded</p>
                    <p className="text-sm text-gray-600">Your CV is ready to be viewed by companies</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a
                    href={profile.cv_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition text-sm"
                  >
                    View CV
                  </a>
                  <button
                    onClick={handleDeleteCV}
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <div className="text-6xl mb-4">📤</div>
              <h3 className="text-lg font-semibold mb-2">Upload your CV</h3>
              <p className="text-gray-600 mb-4">PDF format, max 5MB</p>
              
              <label className="inline-block cursor-pointer">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <span className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 transition font-medium inline-block">
                  {uploading ? 'Uploading...' : 'Choose File'}
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Security Note */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🔒</span>
            <div>
              <h3 className="font-semibold text-yellow-900">Privacy & Security</h3>
              <p className="text-sm text-yellow-800 mt-1">
                Your information is only shared with verified companies when you book an interview with them.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
