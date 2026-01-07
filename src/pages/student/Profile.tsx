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
import { User, Save, GraduationCap, Phone, Mail, Languages, Briefcase, Linkedin, BookOpen, Calendar, X, AlertTriangle, Building2, Clock, MapPin } from 'lucide-react';
import { validatePhoneNumber } from '@/utils/securityUtils';
import { error as logError } from '@/utils/logger';
import LoadingScreen from '@/components/shared/LoadingScreen';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import ImageUpload from '@/components/shared/ImageUpload';
import FileUpload from '@/components/shared/FileUpload';
import { uploadProfilePhoto, uploadResume } from '@/utils/fileUpload';
import StudentLayout from '@/components/student/StudentLayout';

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
  is_deprioritized: boolean;
};

export default function StudentProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };
  const [languageInput, setLanguageInput] = useState('');
  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (profile?.id) {
      loadBookings();
    }
  }, [profile?.id]);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone, student_number, specialization, graduation_year, cv_url, profile_photo_url, languages_spoken, program, biography, linkedin_url, resume_url, year_of_study, is_deprioritized')
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
        is_deprioritized: profileDataAny.is_deprioritized || false,
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

    // Full name is immutable - no validation needed as it cannot be changed

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
          // full_name is immutable - only admin can change it
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
          is_deprioritized: profile.is_deprioritized,
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

  const loadBookings = async () => {
    if (!profile?.id) return;
    
    setLoadingBookings(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('fn_get_student_bookings', {
        p_student_id: profile.id,
      });

      if (rpcError) {
        logError('Error loading bookings:', rpcError);
        return;
      }

      if (data && data.length > 0) {
        // Fetch slot details to get location information
        const slotIds = data.map((b: any) => b.slot_id).filter(Boolean);
        let slotMap = new Map();
        
        if (slotIds.length > 0) {
          const { data: slots } = await supabase
            .from('event_slots')
            .select('id, location')
            .in('id', slotIds);
          
          if (slots) {
            slotMap = new Map(slots.map((s: any) => [s.id, s.location]));
          }
        }

        const formattedBookings = data.map((booking: any) => ({
          id: booking.booking_id,
          status: booking.status,
          slot_time: booking.slot_time,
          slot_location: booking.slot_location || slotMap.get(booking.slot_id) || null,
          company_name: booking.company_name,
          offer_title: booking.offer_title,
          notes: booking.notes || null,
        }));
        setBookings(formattedBookings);
      } else {
        setBookings([]);
      }
    } catch (err: any) {
      logError('Error loading bookings:', err);
    } finally {
      setLoadingBookings(false);
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading profile..." />;
  }

  if (error && !profile) {
    return (
      <StudentLayout onSignOut={handleSignOut}>
        <div className="p-6 md:p-8">
          <div className="max-w-4xl mx-auto">
            <ErrorDisplay error={error} onRetry={loadProfile} />
          </div>
        </div>
      </StudentLayout>
    );
  }

  if (!profile) {
    return null;
  }

  const currentYear = new Date().getFullYear();
  const graduationYears = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  return (
    <StudentLayout onSignOut={handleSignOut}>
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <section className="bg-[#1a1f3a] border-b border-gray-200">
          <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-12 py-12">
            <h1 className="text-3xl font-bold text-white mb-2">
              My Profile
            </h1>
            <p className="text-white/70">
              Manage your personal information and preferences
            </p>
          </div>
        </section>

        <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-12 py-8 space-y-6">
          
          {error && (
            <div className="mb-6">
              <ErrorDisplay error={error} onRetry={loadProfile} />
            </div>
          )}

          <div className="bg-white rounded-lg border border-gray-200 p-6">
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
                readOnly
                disabled
                className="w-full px-4 py-2 bg-gray-100 border border-border rounded-lg text-foreground cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Full name cannot be modified. Contact the administrator at inf.shbm@um6p.ma for corrections.
              </p>
            </div>

            {/* Student Number and Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

            {/* Internship Status */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-5">
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-gray-900 mb-3">Internship Status</h3>
                  <div className="flex items-start gap-3">
                    <div className="flex items-center h-5 mt-0.5">
                      <input
                        id="is_deprioritized"
                        type="checkbox"
                        checked={profile.is_deprioritized}
                        onChange={(e) => setProfile({ ...profile, is_deprioritized: e.target.checked })}
                        className="w-4 h-4 text-[#007e40] border-gray-300 rounded focus:ring-[#007e40]"
                      />
                    </div>
                    <div>
                      <label htmlFor="is_deprioritized" className="font-medium text-gray-900 cursor-pointer">
                        I have already secured an internship
                      </label>
                      <p className="text-sm text-gray-600 mt-1">
                        Check this box if you have already found an internship. This will mark your profile as "Secured Internship" to recruiters, 
                        indicating that you are not actively looking. You can still participate in the event.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Interview History Section */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Interview History
              </h3>

              {loadingBookings ? (
                <div className="text-center py-8">
                  <div className="w-8 h-8 border-4 border-[#007e40] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Loading interview history...</p>
                </div>
              ) : bookings.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">No interviews scheduled yet</p>
                  <Link
                    to="/student/offers"
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#007e40] hover:text-[#005f30] transition-colors"
                  >
                    Browse Offers
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {bookings.map((booking) => {
                    const slotDate = booking.slot_time ? new Date(booking.slot_time) : null;
                    const isPast = slotDate ? slotDate < new Date() : false;
                    const isCancelled = booking.status === 'cancelled';

                    return (
                      <div
                        key={booking.id}
                        className={`p-4 rounded-lg border ${
                          isCancelled
                            ? 'bg-gray-50 border-gray-200 opacity-60'
                            : isPast
                            ? 'bg-gray-50 border-gray-200'
                            : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Building2 className="w-4 h-4 text-gray-600" />
                              <h4 className="font-semibold text-gray-900">{booking.company_name}</h4>
                              {isCancelled && (
                                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">
                                  Cancelled
                                </span>
                              )}
                              {!isCancelled && isPast && (
                                <span className="px-2 py-1 bg-gray-200 text-gray-700 text-xs font-medium rounded">
                                  Completed
                                </span>
                              )}
                              {!isCancelled && !isPast && (
                                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                                  Upcoming
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-900 mb-2">{booking.offer_title}</p>
                            {slotDate && (
                              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {slotDate.toLocaleDateString('en-US', {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  {slotDate.toLocaleTimeString('en-US', {
                                    hour: 'numeric',
                                    minute: '2-digit',
                                  })}
                                </div>
                                {booking.slot_location && (
                                  <div className="flex items-center gap-1">
                                    <MapPin className="w-4 h-4" />
                                    {booking.slot_location}
                                  </div>
                                )}
                              </div>
                            )}
                            {booking.notes && (
                              <p className="text-xs text-gray-600 mt-2 italic">
                                Note: {booking.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-end items-center pt-4 border-t border-gray-200">
              <div className="flex gap-3">
                <Link
                  to="/student"
                  className="px-6 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Cancel
                </Link>
                <button
                  onClick={handleSave}
                  disabled={saving || uploadingPhoto || uploadingResume}
                  className="flex items-center gap-2 px-6 py-2 bg-[#007e40] text-white rounded-lg hover:bg-[#006633] transition-colors text-sm font-medium disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving || uploadingPhoto || uploadingResume ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>

            {/* Account Deletion Section - GDPR Compliance */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-gray-900 mb-2">Delete Account or Download Your Data</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      To request account deletion or download your personal data (GDPR), please contact us via email:
                    </p>
                    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
                      <p className="text-sm font-medium text-gray-900 mb-2">Email us at:</p>
                      <a 
                        href="mailto:inf.shbm@um6p.ma?subject=Account%20Deletion%20Request"
                        className="text-[#007e40] hover:text-[#005f30] font-semibold"
                      >
                        inf.shbm@um6p.ma
                      </a>
                      <p className="text-xs text-gray-600 mt-3">
                        Please include "Account Deletion Request" or "Data Download Request" in the subject line.
                      </p>
                    </div>
                    <p className="text-xs text-gray-600">
                      <span className="font-medium text-gray-900">Account deletion will permanently remove:</span>
                      <br />• Your profile and personal information
                      <br />• All your bookings and interview history
                      <br />• Your uploaded CV/resume and profile photo
                      <br />• All other account-related data
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}