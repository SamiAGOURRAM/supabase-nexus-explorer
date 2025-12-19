import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { Building2, Save, AlertTriangle, Download } from 'lucide-react';
import { validateEmail, validatePhoneNumber } from '@/utils/securityUtils';
import { error as logError } from '@/utils/logger';
import LoadingScreen from '@/components/shared/LoadingScreen';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import CompanyLayout from '@/components/company/CompanyLayout';
import { useAuth } from '@/hooks/useAuth';
import { exportUserData, downloadUserDataAsCsv } from '@/utils/dataExport';
import ImageUpload from '@/components/shared/ImageUpload';
import { uploadLogo } from '@/utils/fileUpload';

type CompanyProfile = {
  id: string;
  company_name: string;
  industry: string | null;
  description: string | null;
  website: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  address: string | null;
  logo_url: string | null;
  company_size: string | null;
};

type Representative = {
  id?: string;
  full_name: string;
  title: string;
  phone: string;
  email: string;
};

export default function CompanyProfile() {
  const { signOut } = useAuth('company');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const [newRep, setNewRep] = useState<Representative>({ full_name: '', title: '', phone: '', email: '' });
  const [repErrors, setRepErrors] = useState<Record<number, Record<string, string>>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [exportingData, setExportingData] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
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

      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('profile_id', user.id)
        .single();

      if (companyError) {
        logError('Error loading company profile:', companyError);
        throw new Error(`Failed to load profile: ${companyError.message}`);
      }

      if (company) {
        setProfile(company);
        setError(null);

        // Load representatives
        const { data: repsData, error: repsError } = await supabase
          .from('company_representatives')
          .select('*')
          .eq('company_id', company.id)
          .order('created_at', { ascending: true });

        if (repsError) {
          logError('Error loading representatives:', repsError);
        } else {
          // Map database results to Representative type
          const mappedReps: Representative[] = (repsData || []).map(rep => ({
            id: rep.id,
            full_name: rep.full_name,
            title: rep.title,
            phone: rep.phone || '',
            email: rep.email,
          }));
          setRepresentatives(mappedReps);
        }
      } else {
        throw new Error('Company profile not found.');
      }
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
    if (!profile) return false;

    const newErrors: Record<string, string> = {};

    // Company name is required
    if (!profile.company_name || profile.company_name.trim().length < 2) {
      newErrors.company_name = 'Company name must be at least 2 characters';
    }

    // Website validation (optional but must be valid URL if provided)
    if (profile.website && profile.website.trim().length > 0) {
      try {
        new URL(profile.website);
      } catch {
        newErrors.website = 'Please enter a valid URL (e.g., https://example.com)';
      }
    }

    // Contact email validation (optional but must be valid if provided)
    if (profile.contact_email && profile.contact_email.trim().length > 0) {
      const emailValidation = validateEmail(profile.contact_email);
      if (!emailValidation.isValid) {
        newErrors.contact_email = emailValidation.error || 'Invalid email format';
      }
    }

    // Validate representatives
    representatives.forEach((rep, index) => {
      const repErrors: Record<string, string> = {};
      if (!rep.full_name || rep.full_name.trim().length < 2) {
        repErrors.full_name = 'Full name is required';
      }
      if (!rep.title || rep.title.trim().length < 2) {
        repErrors.title = 'Title is required';
      }
      if (!rep.email || rep.email.trim().length === 0) {
        repErrors.email = 'Email is required';
      } else {
        const emailValidation = validateEmail(rep.email);
        if (!emailValidation.isValid) {
          repErrors.email = emailValidation.error || 'Invalid email format';
        }
      }
      if (rep.phone && rep.phone.trim().length > 0) {
        const phoneValidation = validatePhoneNumber(rep.phone, 'MA');
        if (!phoneValidation.isValid) {
          repErrors.phone = phoneValidation.error || 'Invalid phone number format';
        }
      }
      if (Object.keys(repErrors).length > 0) {
        setRepErrors(prev => ({ ...prev, [index]: repErrors }));
        newErrors.representatives = 'Please fix errors in representatives';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const addRepresentative = () => {
    const repErrors: Record<string, string> = {};
    if (!newRep.full_name || newRep.full_name.trim().length < 2) {
      repErrors.full_name = 'Full name is required';
    }
    if (!newRep.title || newRep.title.trim().length < 2) {
      repErrors.title = 'Title is required';
    }
    if (!newRep.email || newRep.email.trim().length === 0) {
      repErrors.email = 'Email is required';
    } else {
      const emailValidation = validateEmail(newRep.email);
      if (!emailValidation.isValid) {
        repErrors.email = emailValidation.error || 'Invalid email format';
      }
    }
    if (newRep.phone && newRep.phone.trim().length > 0) {
      const phoneValidation = validatePhoneNumber(newRep.phone, 'MA');
      if (!phoneValidation.isValid) {
        repErrors.phone = phoneValidation.error || 'Invalid phone number format';
      }
    }

    if (Object.keys(repErrors).length > 0) {
      setRepErrors({ ...repErrors, [-1]: repErrors });
      return;
    }

    setRepresentatives([...representatives, { ...newRep }]);
    setNewRep({ full_name: '', title: '', phone: '', email: '' });
    setRepErrors({});
  };

  const updateRepresentative = (index: number, field: keyof Representative, value: string) => {
    const updated = [...representatives];
    updated[index] = { ...updated[index], [field]: value };
    setRepresentatives(updated);
    // Clear errors for this rep
    const newRepErrors = { ...repErrors };
    delete newRepErrors[index];
    setRepErrors(newRepErrors);
  };

  const removeRepresentative = (index: number) => {
    const rep = representatives[index];
    if (rep.id) {
      // Will be deleted in handleSave
    }
    setRepresentatives(representatives.filter((_, i) => i !== index));
    const newRepErrors = { ...repErrors };
    delete newRepErrors[index];
    setRepErrors(newRepErrors);
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
      // Upload logo if a new file was selected
      let logoUrl = profile.logo_url;
      if (logoFile) {
        setUploadingLogo(true);
        const uploadResult = await uploadLogo(logoFile, profile.id);
        if (uploadResult.error) {
          throw new Error(uploadResult.error);
        }
        logoUrl = uploadResult.url;
        setUploadingLogo(false);
      }

      const updateData: any = {
        company_name: profile.company_name.trim(),
        industry: profile.industry?.trim() || null,
        description: profile.description?.trim() || null,
        website: profile.website?.trim() || null,
        contact_email: profile.contact_email?.trim() || null,
        contact_phone: profile.contact_phone?.trim() || null,
        address: profile.address?.trim() || null,
        company_size: profile.company_size || null,
      };

      // Only update logo_url if it changed
      if (logoUrl !== profile.logo_url) {
        updateData.logo_url = logoUrl;
      }

      const { error } = await supabase
        .from('companies')
        .update(updateData)
        .eq('id', profile.id);

      if (error) {
        logError('Error updating profile:', error);
        throw new Error(`Failed to update profile: ${error.message}`);
      }

      // Save representatives
      if (profile) {
        // Get current representatives from database
        const { data: existingReps } = await supabase
          .from('company_representatives')
          .select('id')
          .eq('company_id', profile.id);

        const existingIds = new Set((existingReps || []).map(r => r.id));
        const currentIds = new Set(representatives.filter(r => r.id).map(r => r.id!));

        // Delete removed representatives
        const toDelete = Array.from(existingIds).filter((id: string) => !currentIds.has(id));
        if (toDelete.length > 0) {
          const { error: deleteError } = await supabase
            .from('company_representatives')
            .delete()
            .in('id', toDelete);

          if (deleteError) {
            logError('Error deleting representatives:', deleteError);
          }
        }

        // Insert or update representatives
        for (const rep of representatives) {
          if (rep.id) {
            // Update existing
            const { error: updateError } = await supabase
              .from('company_representatives')
              .update({
                full_name: rep.full_name.trim(),
                title: rep.title.trim(),
                phone: rep.phone?.trim() || null,
                email: rep.email.trim(),
              })
              .eq('id', rep.id);

            if (updateError) {
              logError('Error updating representative:', updateError);
            }
          } else {
            // Insert new
            const { error: insertError } = await supabase
              .from('company_representatives')
              .insert({
                company_id: profile.id,
                full_name: rep.full_name.trim(),
                title: rep.title.trim(),
                phone: rep.phone?.trim() || null,
                email: rep.email.trim(),
              });

            if (insertError) {
              logError('Error inserting representative:', insertError);
            }
          }
        }
      }

      showSuccess('Profile updated successfully!');
      // Clear logo file after successful upload
      setLogoFile(null);
      // Reload to get updated data
      await loadProfile();
    } catch (err: any) {
      logError('Unexpected error updating profile:', err);
      const errorMessage = err instanceof Error ? err : new Error('An unexpected error occurred. Please try again.');
      setError(errorMessage);
      showError(errorMessage.message);
    } finally {
      setSaving(false);
      setUploadingLogo(false);
    }
  };

  const handleExportData = async () => {
    if (!profile) return;
    
    setExportingData(true);
    try {
      // Get the user's profile ID from auth (not the company ID)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showError('You must be logged in to export your data.');
        setExportingData(false);
        return;
      }

      const userData = await exportUserData(user.id);
      if (userData) {
        downloadUserDataAsCsv(userData);
        showSuccess('Your data has been exported successfully!');
      } else {
        showError('Failed to export data. Please try again.');
      }
    } catch (err: any) {
      logError('Error exporting data:', err);
      showError('Failed to export data. Please try again.');
    } finally {
      setExportingData(false);
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
      const logoUrl = profile.logo_url;

      // Step 1: Delete files from storage FIRST (before profile deletion)
      // This ensures we can still access the file paths
      if (logoUrl) {
        try {
          // Extract path from URL - handle both signed URLs and direct paths
          // Using profile-photos bucket with path structure: company/{companyId}/{filename}
          let logoPath: string | null = null;
          if (logoUrl.includes('/storage/v1/object/public/profile-photos/')) {
            logoPath = logoUrl.split('/storage/v1/object/public/profile-photos/')[1].split('?')[0];
          } else if (logoUrl.includes('/profile-photos/')) {
            logoPath = logoUrl.split('/profile-photos/')[1].split('?')[0];
          } else if (logoUrl.includes('/company-logos/')) {
            // Legacy support for old company-logos bucket
            logoPath = logoUrl.split('/company-logos/')[1].split('?')[0];
          } else {
            // Try to extract path - might be in format company/{companyId}/{filename}
            const parts = logoUrl.split('/');
            const profilePhotosIndex = parts.findIndex(p => p === 'profile-photos');
            if (profilePhotosIndex >= 0 && profilePhotosIndex < parts.length - 1) {
              logoPath = parts.slice(profilePhotosIndex + 1).join('/').split('?')[0];
            } else {
              logoPath = parts.slice(-3).join('/').split('?')[0]; // company/{id}/{file}
            }
          }
          
          if (logoPath) {
            // Try profile-photos first (current), fallback to company-logos (legacy)
            try {
              await supabase.storage.from('profile-photos').remove([logoPath]);
            } catch {
              // If it fails, try legacy bucket (in case old logos exist)
              await supabase.storage.from('company-logos').remove([logoPath]);
            }
          }
        } catch (err) {
          // Non-critical error - log but continue with deletion
          logError('Error deleting company logo:', err);
        }
      }

      // Step 2: Delete all user data from public schema (this will cascade)
      // This deletes: profile, company, bookings, booking_attempts, notifications
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
      <CompanyLayout onSignOut={signOut}>
        <div className="p-6 md:p-8">
          <div className="max-w-4xl mx-auto">
            <ErrorDisplay error={error} onRetry={loadProfile} />
          </div>
        </div>
      </CompanyLayout>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <CompanyLayout onSignOut={signOut}>
      <div className="p-6 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-3">
            <Building2 className="w-6 h-6 text-primary" />
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">Company Profile</h1>
          </div>

          {error && (
            <div className="mb-6">
              <ErrorDisplay error={error} onRetry={loadProfile} />
            </div>
          )}

          <div className="bg-card rounded-xl border border-border p-6">
          <div className="space-y-6">
            {/* Company Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Company Logo
              </label>
              <ImageUpload
                currentImageUrl={profile.logo_url || null}
                onImageSelect={(file) => setLogoFile(file)}
                onImageRemove={() => {
                  setLogoFile(null);
                  setProfile({ ...profile, logo_url: null });
                }}
                label="Upload company logo"
                maxSizeMB={5}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Upload your company logo. Supported formats: JPEG, PNG, WebP. Max size: 5MB.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Company Name *
              </label>
              <input
                type="text"
                value={profile.company_name}
                onChange={(e) => setProfile({ ...profile, company_name: e.target.value })}
                className={`w-full px-4 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground ${
                  errors.company_name ? 'border-destructive' : 'border-border'
                }`}
                required
              />
              {errors.company_name && (
                <p className="mt-1 text-xs text-destructive">{errors.company_name}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Industry
                </label>
                <input
                  type="text"
                value={profile.industry || ''}
                onChange={(e) => setProfile({ ...profile, industry: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Company Size
                </label>
                <select
                  value={profile.company_size || ''}
                  onChange={(e) => setProfile({ ...profile, company_size: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                >
                  <option value="">Select size</option>
                  <option value="1-10">1-10 employees</option>
                  <option value="11-50">11-50 employees</option>
                  <option value="51-200">51-200 employees</option>
                  <option value="201-500">201-500 employees</option>
                  <option value="501+">501+ employees</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Description
              </label>
              <textarea
                value={profile.description || ''}
                onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                placeholder="Tell students about your company..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Website
                </label>
                <input
                  type="url"
                  value={profile.website || ''}
                  onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                  className={`w-full px-4 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground ${
                    errors.website ? 'border-destructive' : 'border-border'
                  }`}
                  placeholder="https://example.com"
                />
                {errors.website && (
                  <p className="mt-1 text-xs text-destructive">{errors.website}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={profile.contact_email || ''}
                  onChange={(e) => setProfile({ ...profile, contact_email: e.target.value })}
                  className={`w-full px-4 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground ${
                    errors.contact_email ? 'border-destructive' : 'border-border'
                  }`}
                />
                {errors.contact_email && (
                  <p className="mt-1 text-xs text-destructive">{errors.contact_email}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={profile.contact_phone || ''}
                  onChange={(e) => setProfile({ ...profile, contact_phone: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Address
                </label>
                <input
                  type="text"
                  value={profile.address || ''}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                />
              </div>
            </div>

            {/* Representatives Section */}
            <div className="pt-6 border-t border-border">
              <div className="flex items-center justify-between mb-4">
                <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Users className="w-4 h-4" />
                  Company Representatives
                </label>
              </div>

              {/* Existing Representatives */}
              {representatives.map((rep, index) => (
                <div key={index} className="mb-4 p-4 bg-background rounded-lg border border-border">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={rep.full_name}
                        onChange={(e) => updateRepresentative(index, 'full_name', e.target.value)}
                        className={`w-full px-3 py-2 bg-background border rounded-lg text-sm ${
                          repErrors[index]?.full_name ? 'border-destructive' : 'border-border'
                        }`}
                      />
                      {repErrors[index]?.full_name && (
                        <p className="mt-1 text-xs text-destructive">{repErrors[index].full_name}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">
                        Title *
                      </label>
                      <input
                        type="text"
                        value={rep.title}
                        onChange={(e) => updateRepresentative(index, 'title', e.target.value)}
                        className={`w-full px-3 py-2 bg-background border rounded-lg text-sm ${
                          repErrors[index]?.title ? 'border-destructive' : 'border-border'
                        }`}
                      />
                      {repErrors[index]?.title && (
                        <p className="mt-1 text-xs text-destructive">{repErrors[index].title}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">
                        Email *
                      </label>
                      <input
                        type="email"
                        value={rep.email}
                        onChange={(e) => updateRepresentative(index, 'email', e.target.value)}
                        className={`w-full px-3 py-2 bg-background border rounded-lg text-sm ${
                          repErrors[index]?.email ? 'border-destructive' : 'border-border'
                        }`}
                      />
                      {repErrors[index]?.email && (
                        <p className="mt-1 text-xs text-destructive">{repErrors[index].email}</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-1">
                        Phone
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="tel"
                          value={rep.phone}
                          onChange={(e) => updateRepresentative(index, 'phone', e.target.value)}
                          className={`flex-1 px-3 py-2 bg-background border rounded-lg text-sm ${
                            repErrors[index]?.phone ? 'border-destructive' : 'border-border'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => removeRepresentative(index)}
                          className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                          aria-label="Remove representative"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {repErrors[index]?.phone && (
                        <p className="mt-1 text-xs text-destructive">{repErrors[index].phone}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Add New Representative */}
              <div className="p-4 bg-muted/30 rounded-lg border border-border">
                <h4 className="text-sm font-medium text-foreground mb-3">Add New Representative</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={newRep.full_name}
                      onChange={(e) => setNewRep({ ...newRep, full_name: e.target.value })}
                      className={`w-full px-3 py-2 bg-background border rounded-lg text-sm ${
                        repErrors[-1]?.full_name ? 'border-destructive' : 'border-border'
                      }`}
                      placeholder="John Doe"
                    />
                    {repErrors[-1]?.full_name && (
                      <p className="mt-1 text-xs text-destructive">{repErrors[-1].full_name}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Title *
                    </label>
                    <input
                      type="text"
                      value={newRep.title}
                      onChange={(e) => setNewRep({ ...newRep, title: e.target.value })}
                      className={`w-full px-3 py-2 bg-background border rounded-lg text-sm ${
                        repErrors[-1]?.title ? 'border-destructive' : 'border-border'
                      }`}
                      placeholder="HR Manager"
                    />
                    {repErrors[-1]?.title && (
                      <p className="mt-1 text-xs text-destructive">{repErrors[-1].title}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={newRep.email}
                      onChange={(e) => setNewRep({ ...newRep, email: e.target.value })}
                      className={`w-full px-3 py-2 bg-background border rounded-lg text-sm ${
                        repErrors[-1]?.email ? 'border-destructive' : 'border-border'
                      }`}
                      placeholder="john@company.com"
                    />
                    {repErrors[-1]?.email && (
                      <p className="mt-1 text-xs text-destructive">{repErrors[-1].email}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Phone
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="tel"
                        value={newRep.phone}
                        onChange={(e) => setNewRep({ ...newRep, phone: e.target.value })}
                        className={`flex-1 px-3 py-2 bg-background border rounded-lg text-sm ${
                          repErrors[-1]?.phone ? 'border-destructive' : 'border-border'
                        }`}
                        placeholder="+212 6XX XXX XXX"
                      />
                      <button
                        type="button"
                        onClick={addRepresentative}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                        aria-label="Add representative"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    {repErrors[-1]?.phone && (
                      <p className="mt-1 text-xs text-destructive">{repErrors[-1].phone}</p>
                    )}
                  </div>
                </div>
              </div>

              {errors.representatives && (
                <p className="mt-2 text-sm text-destructive">{errors.representatives}</p>
              )}
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-border">
              <button
                onClick={handleExportData}
                disabled={exportingData}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                {exportingData ? 'Exporting...' : 'Download My Data (GDPR)'}
              </button>
              <div className="flex gap-3">
                <Link
                  to="/company"
                  className="px-6 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Cancel
                </Link>
                <button
                  onClick={handleSave}
                  disabled={saving || uploadingLogo}
                  className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving || uploadingLogo ? (uploadingLogo ? 'Uploading logo...' : 'Saving...') : 'Save Changes'}
                </button>
              </div>
            </div>

            {/* Account Deletion Section - GDPR Compliance */}
            <div className="mt-8 pt-8 border-t border-border">
              <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-6">
                <div className="flex items-start gap-3 mb-4">
                  <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-2">Delete Account</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Permanently delete your company account and all associated data. This action cannot be undone.
                      <br />
                      <span className="font-medium text-foreground">This will delete:</span>
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1 mb-4 list-disc list-inside">
                      <li>Your company profile and information</li>
                      <li>All your offers and job postings</li>
                      <li>All your event slots and bookings</li>
                      <li>Company representatives and contact information</li>
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
        </div>
      </div>
    </CompanyLayout>
  );
}

