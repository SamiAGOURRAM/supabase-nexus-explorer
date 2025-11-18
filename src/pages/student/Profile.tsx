/**
 * Student Profile Page
 * 
 * Allows students to view and edit their profile information.
 * Includes fields: full_name, phone, student_number, specialization, graduation_year, cv_url
 */
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, User, Save, GraduationCap, Phone, FileText, Mail } from 'lucide-react';
import { validatePhoneNumber } from '@/utils/securityUtils';
import { error as logError } from '@/utils/logger';
import LoadingScreen from '@/components/shared/LoadingScreen';

type StudentProfile = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  student_number: string | null;
  specialization: string | null;
  graduation_year: number | null;
  cv_url: string | null;
};

export default function StudentProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone, student_number, specialization, graduation_year, cv_url')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        logError('Error loading profile:', profileError);
        alert('Error loading profile. Please try again.');
        navigate('/student');
        return;
      }

      if (!profileData) {
        alert('Profile not found.');
        navigate('/student');
        return;
      }

      setProfile(profileData);
    } catch (err) {
      logError('Unexpected error loading profile:', err);
      alert('An unexpected error occurred. Please try again.');
      navigate('/student');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!profile) return false;

    // Full name is required
    if (!profile.full_name || profile.full_name.trim().length < 2) {
      newErrors.full_name = 'Full name must be at least 2 characters';
    }

    // Student number is required
    if (!profile.student_number || profile.student_number.trim().length === 0) {
      newErrors.student_number = 'Student number is required';
    }

    // Specialization is required
    if (!profile.specialization || profile.specialization.trim().length === 0) {
      newErrors.specialization = 'Specialization is required';
    }

    // Graduation year is required and must be valid
    if (!profile.graduation_year) {
      newErrors.graduation_year = 'Graduation year is required';
    } else if (profile.graduation_year < 2020 || profile.graduation_year > 2030) {
      newErrors.graduation_year = 'Graduation year must be between 2020 and 2030';
    }

    // Phone validation (optional but must be valid if provided)
    if (profile.phone && profile.phone.trim().length > 0) {
      const phoneValidation = validatePhoneNumber(profile.phone, 'MA');
      if (!phoneValidation.isValid) {
        newErrors.phone = phoneValidation.error || 'Invalid phone number format';
      }
    }

    // CV URL validation (optional but must be valid URL if provided)
    if (profile.cv_url && profile.cv_url.trim().length > 0) {
      try {
        new URL(profile.cv_url);
      } catch {
        newErrors.cv_url = 'Please enter a valid URL';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!profile) return;

    setErrors({});
    setSuccessMessage('');

    if (!validateForm()) {
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name.trim(),
          phone: profile.phone?.trim() || null,
          student_number: profile.student_number?.trim() || null,
          specialization: profile.specialization?.trim() || null,
          graduation_year: profile.graduation_year,
          cv_url: profile.cv_url?.trim() || null,
        })
        .eq('id', profile.id);

      if (error) {
        logError('Error updating profile:', error);
        alert('Error updating profile: ' + error.message);
      } else {
        setSuccessMessage('Profile updated successfully!');
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err) {
      logError('Unexpected error updating profile:', err);
      alert('An unexpected error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading profile..." />;
  }

  if (!profile) {
    return null;
  }

  const currentYear = new Date().getFullYear();
  const graduationYears = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link to="/student" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <User className="w-6 h-6 text-primary" />
              <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {successMessage && (
          <div className="mb-6 p-4 bg-success/10 border border-success/20 rounded-lg text-success">
            {successMessage}
          </div>
        )}

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="space-y-6">
            {/* Email (read-only) */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                <Mail className="w-4 h-4" />
                Email
              </label>
              <input
                type="email"
                value={profile.email}
                disabled
                className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-muted-foreground cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-muted-foreground">Email cannot be changed</p>
            </div>

            {/* Full Name */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                <User className="w-4 h-4" />
                Full Name *
              </label>
              <input
                type="text"
                value={profile.full_name}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                className={`w-full px-4 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground ${
                  errors.full_name ? 'border-destructive' : 'border-border'
                }`}
                required
              />
              {errors.full_name && (
                <p className="mt-1 text-xs text-destructive">{errors.full_name}</p>
              )}
            </div>

            {/* Student Number and Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                  <GraduationCap className="w-4 h-4" />
                  Student Number *
                </label>
                <input
                  type="text"
                  value={profile.student_number || ''}
                  onChange={(e) => setProfile({ ...profile, student_number: e.target.value })}
                  className={`w-full px-4 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground ${
                    errors.student_number ? 'border-destructive' : 'border-border'
                  }`}
                  placeholder="e.g., 12345"
                  required
                />
                {errors.student_number && (
                  <p className="mt-1 text-xs text-destructive">{errors.student_number}</p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                  <Phone className="w-4 h-4" />
                  Phone
                </label>
                <input
                  type="tel"
                  value={profile.phone || ''}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className={`w-full px-4 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground ${
                    errors.phone ? 'border-destructive' : 'border-border'
                  }`}
                  placeholder="+212 6XX XXX XXX or 06XX XXX XXX"
                />
                {errors.phone && (
                  <p className="mt-1 text-xs text-destructive">{errors.phone}</p>
                )}
              </div>
            </div>

            {/* Specialization and Graduation Year */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                  <GraduationCap className="w-4 h-4" />
                  Specialization *
                </label>
                <input
                  type="text"
                  value={profile.specialization || ''}
                  onChange={(e) => setProfile({ ...profile, specialization: e.target.value })}
                  className={`w-full px-4 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground ${
                    errors.specialization ? 'border-destructive' : 'border-border'
                  }`}
                  placeholder="e.g., Computer Science"
                  required
                />
                {errors.specialization && (
                  <p className="mt-1 text-xs text-destructive">{errors.specialization}</p>
                )}
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                  <GraduationCap className="w-4 h-4" />
                  Graduation Year *
                </label>
                <select
                  value={profile.graduation_year || ''}
                  onChange={(e) => setProfile({ ...profile, graduation_year: e.target.value ? parseInt(e.target.value) : null })}
                  className={`w-full px-4 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground ${
                    errors.graduation_year ? 'border-destructive' : 'border-border'
                  }`}
                  required
                >
                  <option value="">Select year</option>
                  {graduationYears.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
                {errors.graduation_year && (
                  <p className="mt-1 text-xs text-destructive">{errors.graduation_year}</p>
                )}
              </div>
            </div>

            {/* CV URL */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                <FileText className="w-4 h-4" />
                CV/Resume URL
              </label>
              <input
                type="url"
                value={profile.cv_url || ''}
                onChange={(e) => setProfile({ ...profile, cv_url: e.target.value })}
                className={`w-full px-4 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground ${
                  errors.cv_url ? 'border-destructive' : 'border-border'
                }`}
                placeholder="https://example.com/cv.pdf"
              />
              {errors.cv_url && (
                <p className="mt-1 text-xs text-destructive">{errors.cv_url}</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                Link to your CV or resume (Google Drive, Dropbox, etc.)
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Link
                to="/student"
                className="px-6 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </Link>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
