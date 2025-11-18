/**
 * Student Profile Page
 * 
 * Allows students to view and edit their profile information.
 * Includes fields: profile photo, email, phone, languages, program, year of study,
 * biography, LinkedIn, resume, student_number, specialization, graduation_year
 */
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { ArrowLeft, User, Save, GraduationCap, Phone, FileText, Mail, Languages, Briefcase, Linkedin, BookOpen, Calendar, X, Trash2, AlertTriangle } from 'lucide-react';
import { validatePhoneNumber } from '@/utils/securityUtils';
import { error as logError } from '@/utils/logger';
import LoadingScreen from '@/components/shared/LoadingScreen';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import ImageUpload from '@/components/shared/ImageUpload';
import FileUpload from '@/components/shared/FileUpload';
import { uploadProfilePhoto, uploadResume } from '@/utils/fileUpload';

type StudentProfile = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  student_number: string | null;
  specialization: string | null;
  graduation_year: number | null;
  cv_url: string | null;
  profile_photo_url: string | null;
  languages_spoken: string[];
  program: string | null;
  biography: string | null;
  linkedin_url: string | null;
  resume_url: string | null;
  year_of_study: number | null;
};

export default function StudentProfile() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [languageInput, setLanguageInput] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

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
        .select('id, email, full_name, phone, student_number, specialization, graduation_year, cv_url, profile_photo_url, languages_spoken, program, biography, linkedin_url, resume_url, year_of_study')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        logError('Error loading profile:', profileError);
        throw new Error('Failed to load profile. Please try again.');
      }

      if (!profileData) {
        throw new Error('Profile not found.');
      }

      // Ensure languages_spoken is an array and handle new fields
      const profileDataAny = profileData as any;
      const profileWithDefaults: StudentProfile = {
        id: profileDataAny.id,
        email: profileDataAny.email,
        full_name: profileDataAny.full_name,
        phone: profileDataAny.phone,
        student_number: profileDataAny.student_number,
        specialization: profileDataAny.specialization,
        graduation_year: profileDataAny.graduation_year,
        cv_url: profileDataAny.cv_url,
        languages_spoken: profileDataAny.languages_spoken || [],
        program: profileDataAny.program || null,
        biography: profileDataAny.biography || null,
        linkedin_url: profileDataAny.linkedin_url || null,
        resume_url: profileDataAny.resume_url || null,
        year_of_study: profileDataAny.year_of_study || null,
        profile_photo_url: profileDataAny.profile_photo_url || null,
      };

      setProfile(profileWithDefaults);
      setError(null);
    } catch (err: any) {
      logError('Unexpected error loading profile:', err);
      const errorMessage = err instanceof Error ? err : new Error('An unexpected error occurred. Please try again.');
      setError(errorMessage);
      showError('Failed to load profile. Please try again.');
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

    // LinkedIn URL validation (optional but must be valid LinkedIn URL if provided)
    if (profile.linkedin_url && profile.linkedin_url.trim().length > 0) {
      try {
        const url = new URL(profile.linkedin_url);
        if (!url.hostname.includes('linkedin.com')) {
          newErrors.linkedin_url = 'Please enter a valid LinkedIn profile URL';
        }
      } catch {
        newErrors.linkedin_url = 'Please enter a valid LinkedIn profile URL';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePhotoSelect = (file: File) => {
    setPhotoFile(file);
    const newErrors = { ...errors };
    delete newErrors.profile_photo;
    setErrors(newErrors);
  };

  const handleResumeSelect = (file: File) => {
    setResumeFile(file);
    const newErrors = { ...errors };
    delete newErrors.resume;
    setErrors(newErrors);
  };

  const addLanguage = () => {
    if (!profile) return;
    const lang = languageInput.trim();
    if (lang && !profile.languages_spoken.includes(lang)) {
      setProfile({
        ...profile,
        languages_spoken: [...profile.languages_spoken, lang]
      });
      setLanguageInput('');
    }
  };

  const removeLanguage = (lang: string) => {
    if (!profile) return;
    setProfile({
      ...profile,
      languages_spoken: profile.languages_spoken.filter(l => l !== lang)
    });
  };

  const handleSave = async () => {
    if (!profile) return;

    setErrors({});
    setError(null);

    if (!validateForm()) {
      showError('Please fix the errors in the form before saving.');
      return;
    }

    setSaving(true);

    try {
      let profilePhotoUrl = profile.profile_photo_url;
      let resumeUrl = profile.resume_url;

      // Upload profile photo if a new one was selected
      if (photoFile) {
        setUploadingPhoto(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const uploadResult = await uploadProfilePhoto(photoFile, user.id);
          if (uploadResult.error) {
            throw new Error(uploadResult.error);
          }
          profilePhotoUrl = uploadResult.url;
        }
        setUploadingPhoto(false);
      }

      // Upload resume if a new one was selected
      if (resumeFile) {
        setUploadingResume(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const uploadResult = await uploadResume(resumeFile, user.id);
          if (uploadResult.error) {
            throw new Error(uploadResult.error);
          }
          resumeUrl = uploadResult.url;
        }
        setUploadingResume(false);
      }

      // Ensure empty strings are converted to null for optional URL fields
      const linkedinUrl = profile.linkedin_url?.trim();
      const finalLinkedinUrl = linkedinUrl && linkedinUrl.length > 0 ? linkedinUrl : null;

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name.trim(),
          phone: profile.phone?.trim() || null,
          student_number: profile.student_number?.trim() || null,
          specialization: profile.specialization?.trim() || null,
          graduation_year: profile.graduation_year,
          cv_url: profile.cv_url?.trim() || null,
          profile_photo_url: profilePhotoUrl,
          languages_spoken: profile.languages_spoken,
          program: profile.program || null,
          biography: profile.biography?.trim() || null,
          linkedin_url: finalLinkedinUrl,
          resume_url: resumeUrl,
          year_of_study: profile.year_of_study || null,
        })
        .eq('id', profile.id);

      if (error) {
        logError('Error updating profile:', error);
        throw new Error(`Failed to update profile: ${error.message}`);
      } else {
        showSuccess('Profile updated successfully!');
        // Clear uploaded files
        setPhotoFile(null);
        setResumeFile(null);
        // Reload profile to get updated URLs
        await loadProfile();
      }
    } catch (err: any) {
      logError('Unexpected error updating profile:', err);
      const errorMessage = err instanceof Error ? err : new Error('An unexpected error occurred. Please try again.');
      setError(errorMessage);
      showError(errorMessage.message);
    } finally {
      setSaving(false);
      setUploadingPhoto(false);
      setUploadingResume(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      showError('Please type DELETE to confirm account deletion');
      return;
    }

    if (!profile) return;

    setDeleting(true);
    try {
      // Store profile data before deletion (we'll need it for file cleanup)
      const profilePhotoUrl = profile.profile_photo_url;
      const resumeUrl = profile.resume_url;

      // Step 1: Delete files from storage FIRST (before profile deletion)
      // This ensures we can still access the file paths
      if (profilePhotoUrl) {
        try {
          // Extract path from URL - handle both signed URLs and direct paths
          const photoPath = profilePhotoUrl.includes('/storage/v1/object/public/')
            ? profilePhotoUrl.split('/storage/v1/object/public/')[1]
            : profilePhotoUrl.split('/').slice(-2).join('/');
          await supabase.storage.from('profile-photos').remove([photoPath]);
        } catch (err) {
          // Non-critical error - log but continue with deletion
          logError('Error deleting profile photo:', err);
        }
      }

      if (resumeUrl) {
        try {
          // Extract path from signed URL or use stored path
          let resumePath: string | null = null;
          if (resumeUrl.includes('/storage/v1/object/public/resumes/')) {
            resumePath = resumeUrl.split('/storage/v1/object/public/resumes/')[1].split('?')[0];
          } else if (resumeUrl.includes('/resumes/')) {
            resumePath = resumeUrl.split('/resumes/')[1].split('?')[0];
          }
          
          if (resumePath) {
            await supabase.storage.from('resumes').remove([resumePath]);
          }
        } catch (err) {
          // Non-critical error - log but continue with deletion
          logError('Error deleting resume:', err);
        }
      }

      // Step 2: Delete all user data from public schema (this will cascade)
      const { error: deleteError } = await supabase.rpc('delete_user_account');

      if (deleteError) {
        throw new Error(`Failed to delete account data: ${deleteError.message}`);
      }

      // Step 3: Sign out the user (this invalidates the session)
      await supabase.auth.signOut();
      
      // Step 4: Show success message and redirect
      showSuccess('Your account has been deleted successfully. You have been signed out.');
      navigate('/login', { 
        state: { 
          message: 'Your account has been deleted successfully. All your data has been removed in compliance with GDPR.' 
        } 
      });
    } catch (err: any) {
      logError('Error deleting account:', err);
      showError(err.message || 'Failed to delete account. Please try again or contact support.');
      setDeleting(false);
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading profile..." />;
  }

  if (error && !profile) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-border">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-4">
              <Link to="/student" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
            </div>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ErrorDisplay error={error} onRetry={loadProfile} />
        </main>
      </div>
    );
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
        {error && (
          <div className="mb-6">
            <ErrorDisplay error={error} onRetry={loadProfile} />
          </div>
        )}

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="space-y-6">
            {/* Profile Photo */}
            <ImageUpload
              currentImageUrl={profile.profile_photo_url}
              onImageSelect={handlePhotoSelect}
              onImageRemove={() => {
                setPhotoFile(null);
                setProfile({ ...profile, profile_photo_url: null });
              }}
              label="Profile Photo"
              error={errors.profile_photo}
            />

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

            {/* Languages Spoken */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                <Languages className="w-4 h-4" />
                Languages Spoken
              </label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={languageInput}
                    onChange={(e) => setLanguageInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addLanguage();
                      }
                    }}
                    placeholder="Add a language (e.g., English, French, Arabic)"
                    className="flex-1 px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                  />
                  <button
                    type="button"
                    onClick={addLanguage}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    Add
                  </button>
                </div>
                {profile.languages_spoken.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {profile.languages_spoken.map((lang) => (
                      <span
                        key={lang}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                      >
                        {lang}
                        <button
                          type="button"
                          onClick={() => removeLanguage(lang)}
                          className="hover:text-destructive"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Program and Year of Study */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                  <Briefcase className="w-4 h-4" />
                  Program
                </label>
                <select
                  value={profile.program || ''}
                  onChange={(e) => setProfile({ ...profile, program: e.target.value || null })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                >
                  <option value="">Select program</option>
                  <option value="Bachelor's">Bachelor's</option>
                  <option value="IVET">IVET</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                  <Calendar className="w-4 h-4" />
                  Year of Study
                </label>
                <select
                  value={profile.year_of_study || ''}
                  onChange={(e) => setProfile({ ...profile, year_of_study: e.target.value ? parseInt(e.target.value) : null })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                >
                  <option value="">Select year</option>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((year) => (
                    <option key={year} value={year}>
                      Year {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Biography */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                <BookOpen className="w-4 h-4" />
                Biography
              </label>
              <textarea
                value={profile.biography || ''}
                onChange={(e) => setProfile({ ...profile, biography: e.target.value })}
                rows={5}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                placeholder="Tell us about yourself, your interests, and career goals..."
              />
            </div>

            {/* LinkedIn URL */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                <Linkedin className="w-4 h-4" />
                LinkedIn Profile
              </label>
              <input
                type="url"
                value={profile.linkedin_url || ''}
                onChange={(e) => setProfile({ ...profile, linkedin_url: e.target.value })}
                className={`w-full px-4 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground ${
                  errors.linkedin_url ? 'border-destructive' : 'border-border'
                }`}
                placeholder="https://linkedin.com/in/yourprofile"
              />
              {errors.linkedin_url && (
                <p className="mt-1 text-xs text-destructive">{errors.linkedin_url}</p>
              )}
            </div>

            {/* Resume Upload */}
            <FileUpload
              currentFileUrl={profile.resume_url}
              currentFileName={profile.resume_url ? 'Resume uploaded' : null}
              onFileSelect={handleResumeSelect}
              onFileRemove={() => {
                setResumeFile(null);
                setProfile({ ...profile, resume_url: null });
              }}
              label="Resume/CV"
              error={errors.resume}
            />

            {/* CV URL (legacy - keeping for backward compatibility) */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                <FileText className="w-4 h-4" />
                CV/Resume URL (Alternative)
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
                Alternative: Link to your CV or resume (Google Drive, Dropbox, etc.)
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
                disabled={saving || uploadingPhoto || uploadingResume}
                className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving || uploadingPhoto || uploadingResume ? 'Saving...' : 'Save Changes'}
              </button>
            </div>

            {/* Account Deletion Section - GDPR Compliance */}
            <div className="mt-8 pt-8 border-t border-border">
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6">
                <div className="flex items-start gap-3 mb-4">
                  <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-2">Delete Account</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Permanently delete your account and all associated data. This action cannot be undone.
                      <br />
                      <span className="font-medium text-foreground">This will delete:</span>
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1 mb-4 list-disc list-inside">
                      <li>Your profile and personal information</li>
                      <li>All your bookings and interview history</li>
                      <li>Your uploaded CV/resume and profile photo</li>
                      <li>All other account-related data</li>
                    </ul>
                  </div>
                </div>

                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors text-sm font-medium"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete My Account
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Type <span className="font-mono text-destructive">DELETE</span> to confirm:
                      </label>
                      <input
                        type="text"
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder="DELETE"
                        className="w-full px-4 py-2 bg-background border border-destructive/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-destructive text-foreground"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeleteConfirmText('');
                        }}
                        className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDeleteAccount}
                        disabled={deleting || deleteConfirmText !== 'DELETE'}
                        className="flex items-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4" />
                        {deleting ? 'Deleting...' : 'Permanently Delete Account'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

