import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { Building2, CheckCircle, X, Edit2, Save, Mail, Phone, Globe, MapPin, Users, Search } from 'lucide-react';
import type { Company } from '@/types/database';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAuth } from '@/hooks/useAuth';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import EmptyState from '@/components/shared/EmptyState';
import LoadingTable from '@/components/shared/LoadingTable';
import ImageUpload from '@/components/shared/ImageUpload';
import Pagination from '@/components/shared/Pagination';
import { uploadLogo } from '@/utils/fileUpload';

export default function AdminCompanies() {
  const { signOut } = useAuth('admin');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('eventId');
  const [eventName, setEventName] = useState<string | null>(null);
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  
  // Inline editing state
  const [editingCompanyId, setEditingCompanyId] = useState<string | null>(null);
  const [editedCompany, setEditedCompany] = useState<Partial<Company> | null>(null);
  const [savingCompanyId, setSavingCompanyId] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    checkAdminAndLoadCompanies();
  }, [eventId]);

  const checkAdminAndLoadCompanies = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/login');
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle(); // Use maybeSingle() to avoid 406 errors

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      navigate('/login');
      return;
    }

    if (!profile || profile.role !== 'admin') {
      navigate('/offers');
      return;
    }

    await loadCompanies();
  };

  const loadCompanies = async () => {
    try {
      setError(null);
      setLoading(true);

      // If eventId is present, load event details first
      if (eventId) {
        const { data: event, error: eventError } = await supabase
          .from('events')
          .select('name')
          .eq('id', eventId)
          .single();
        
        if (eventError) {
          console.error('Error loading event:', eventError);
        } else {
          setEventName(event.name);
        }
      } else {
        setEventName(null);
      }
      
      let query = supabase
        .from('companies')
        .select(`
          *,
          company_representatives (
            id,
            full_name,
            title,
            email,
            phone
          )
        `)
        .order('created_at', { ascending: false });

      // If eventId is present, filter by participation
      if (eventId) {
        // We need to get company IDs from event_participants first
        const { data: participants, error: partError } = await supabase
          .from('event_participants')
          .select('company_id')
          .eq('event_id', eventId);
        
        if (partError) throw partError;
        
        const companyIds = participants?.map(p => p.company_id) || [];
        
        if (companyIds.length > 0) {
          query = query.in('id', companyIds);
        } else {
          setCompanies([]);
          setLoading(false);
          return;
        }
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to load companies: ${error.message}`);
      }

      setCompanies(data || []);
    } catch (err: any) {
      console.error('Error loading companies:', err);
      const errorMessage = err instanceof Error ? err : new Error('Failed to load companies');
      setError(errorMessage);
      showError('Failed to load companies. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCompany = async (companyId: string, verify: boolean) => {
    setVerifying(companyId);
    try {
      // Directly update the company status instead of using RPC
      // This ensures we only update the status and don't trigger any deletion logic
      const { error } = await supabase
        .from('companies')
        .update({ is_verified: verify })
        .eq('id', companyId);

      if (error) {
        throw new Error(`Failed to verify company: ${error.message}`);
      }

      showSuccess(`Company ${verify ? 'verified' : 'unverified'} successfully`);
      // Reload companies to reflect changes
      await loadCompanies();
    } catch (err: any) {
      console.error('Error:', err);
      const errorMsg = err.message || 'Failed to verify company';
      showError(errorMsg);
    } finally {
      setVerifying(null);
    }
  };

  const startEditing = (company: Company) => {
    setEditingCompanyId(company.id);
    setEditedCompany({ ...company });
  };

  const cancelEditing = () => {
    setEditingCompanyId(null);
    setEditedCompany(null);
    setLogoFile(null);
  };

  const handleLogoSelect = (file: File) => {
    setLogoFile(file);
  };

  const saveCompany = async (companyId: string) => {
    if (!editedCompany) return;

    try {
      setSavingCompanyId(companyId);
      
      // Upload logo if selected
      let logoUrl = editedCompany.logo_url;
      if (logoFile) {
        setUploadingLogo(companyId);
        const uploadResult = await uploadLogo(logoFile, companyId);
        if (uploadResult.error) {
          throw new Error(uploadResult.error);
        }
        logoUrl = uploadResult.url;
        setUploadingLogo(null);
      }

      // Prepare update data
      const updateData: any = {
        company_name: editedCompany.company_name?.trim() || '',
        industry: editedCompany.industry?.trim() || null,
        description: editedCompany.description?.trim() || null,
        website: editedCompany.website?.trim() || null,
        contact_email: editedCompany.contact_email?.trim() || null,
        contact_phone: editedCompany.contact_phone?.trim() || null,
        address: editedCompany.address?.trim() || null,
        company_size: editedCompany.company_size || null,
      };

      if (logoUrl !== undefined) {
        updateData.logo_url = logoUrl;
      }

      const { error } = await supabase
        .from('companies')
        .update(updateData)
        .eq('id', companyId);

      if (error) throw error;

      showSuccess('Company profile updated successfully');
      cancelEditing();
      await loadCompanies();
    } catch (err: any) {
      console.error('Error saving company:', err);
      showError(err.message || 'Failed to update company profile');
    } finally {
      setSavingCompanyId(null);
      setUploadingLogo(null);
    }
  };

  const filteredCompanies = companies.filter(company => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      company.company_name.toLowerCase().includes(query) ||
      company.industry?.toLowerCase().includes(query) ||
      company.description?.toLowerCase().includes(query) ||
      company.contact_email?.toLowerCase().includes(query)
    );
  });

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCompanies = filteredCompanies.slice(startIndex, endIndex);

  return (
    <AdminLayout onSignOut={signOut}>
      <div className="p-4 sm:p-6 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              {eventName ? `${eventName} - Companies` : 'Companies Management'}
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              {eventName ? 'View and manage companies participating in this event' : 'View and verify all companies'}
            </p>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search companies by name, industry, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-soft"
            />
          </div>

          {error ? (
            <ErrorDisplay error={error} onRetry={loadCompanies} />
          ) : loading ? (
            <LoadingTable columns={6} rows={10} />
          ) : filteredCompanies.length === 0 ? (
            <EmptyState
              icon={Building2}
              title={searchQuery ? 'No companies match your search' : 'No companies yet'}
              message={
                searchQuery
                  ? 'Try a different search term to find companies.'
                  : 'Companies will appear here once they register and create their profiles.'
              }
              className="bg-card rounded-xl border border-border p-12"
            />
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-elegant">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto -mx-4 sm:mx-0">
                <table className="w-full min-w-[640px]">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Company
                      </th>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Details
                      </th>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {paginatedCompanies.map((company) => {
                      const isEditing = editingCompanyId === company.id;
                      const currentCompany = isEditing && editedCompany ? editedCompany : company;
                      
                      return (
                        <tr
                          key={company.id}
                          className={`transition-colors duration-150 ${
                            isEditing
                              ? 'bg-primary/5 border-l-4 border-l-primary'
                              : 'hover:bg-muted/30'
                          }`}
                        >
                          {/* Company Info Column */}
                          <td className="px-4 sm:px-6 py-3 sm:py-4">
                            {isEditing ? (
                              <div className="space-y-3">
                                <div>
                                  <label className="text-xs text-muted-foreground mb-1 block">Logo</label>
                                  <ImageUpload
                                    currentImageUrl={currentCompany.logo_url || null}
                                    onImageSelect={handleLogoSelect}
                                    onImageRemove={() => {
                                      setLogoFile(null);
                                      if (editedCompany) {
                                        setEditedCompany({ ...editedCompany, logo_url: null });
                                      }
                                    }}
                                    label=""
                                    maxSizeMB={5}
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground mb-1 block">Company Name</label>
                                  <input
                                    type="text"
                                    value={currentCompany.company_name || ''}
                                    onChange={(e) => editedCompany && setEditedCompany({ ...editedCompany, company_name: e.target.value })}
                                    className="w-full px-2 py-1 text-sm bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-primary"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground mb-1 block">Industry</label>
                                  <input
                                    type="text"
                                    value={currentCompany.industry || ''}
                                    onChange={(e) => editedCompany && setEditedCompany({ ...editedCompany, industry: e.target.value || null })}
                                    className="w-full px-2 py-1 text-sm bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-primary"
                                    placeholder="e.g., Hospitality, Technology"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground mb-1 block">Description</label>
                                  <textarea
                                    value={currentCompany.description || ''}
                                    onChange={(e) => editedCompany && setEditedCompany({ ...editedCompany, description: e.target.value || null })}
                                    rows={3}
                                    className="w-full px-2 py-1 text-xs bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                                    placeholder="Company description..."
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3">
                                {company.logo_url ? (
                                  <img
                                    src={company.logo_url}
                                    alt={company.company_name}
                                    className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-border"
                                  />
                                ) : (
                                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <Building2 className="w-6 h-6 text-primary" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-foreground truncate">{company.company_name}</div>
                                  {company.industry && (
                                    <div className="text-xs text-muted-foreground truncate">{company.industry}</div>
                                  )}
                                </div>
                              </div>
                            )}
                          </td>
                          
                          {/* Contact Column */}
                          <td className="px-4 sm:px-6 py-3 sm:py-4">
                            {isEditing ? (
                              <div className="space-y-2">
                                <div>
                                  <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                                  <input
                                    type="email"
                                    value={currentCompany.contact_email || ''}
                                    onChange={(e) => editedCompany && setEditedCompany({ ...editedCompany, contact_email: e.target.value || null })}
                                    className="w-full px-2 py-1 text-sm bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-primary"
                                    placeholder="contact@company.com"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground mb-1 block">Phone</label>
                                  <input
                                    type="tel"
                                    value={currentCompany.contact_phone || ''}
                                    onChange={(e) => editedCompany && setEditedCompany({ ...editedCompany, contact_phone: e.target.value || null })}
                                    className="w-full px-2 py-1 text-sm bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-primary"
                                    placeholder="+212 6XX XXX XXX"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground mb-1 block">Website</label>
                                  <input
                                    type="url"
                                    value={currentCompany.website || ''}
                                    onChange={(e) => editedCompany && setEditedCompany({ ...editedCompany, website: e.target.value || null })}
                                    className="w-full px-2 py-1 text-sm bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-primary"
                                    placeholder="https://company.com"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground mb-1 block">Address</label>
                                  <input
                                    type="text"
                                    value={currentCompany.address || ''}
                                    onChange={(e) => editedCompany && setEditedCompany({ ...editedCompany, address: e.target.value || null })}
                                    className="w-full px-2 py-1 text-sm bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-primary"
                                    placeholder="Company address"
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm space-y-1">
                                {company.contact_email && (
                                  <div className="flex items-center gap-2">
                                    <Mail className="w-3 h-3 text-muted-foreground" />
                                    <span className="text-foreground truncate">{company.contact_email}</span>
                                  </div>
                                )}
                                {company.contact_phone && (
                                  <div className="flex items-center gap-2">
                                    <Phone className="w-3 h-3 text-muted-foreground" />
                                    <span className="text-foreground">{company.contact_phone}</span>
                                  </div>
                                )}
                                {company.website && (
                                  <div className="flex items-center gap-2">
                                    <Globe className="w-3 h-3 text-muted-foreground" />
                                    <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate">
                                      Website
                                    </a>
                                  </div>
                                )}
                                {company.address && (
                                  <div className="flex items-center gap-2">
                                    <MapPin className="w-3 h-3 text-muted-foreground" />
                                    <span className="text-xs text-muted-foreground truncate">{company.address}</span>
                                  </div>
                                )}
                                {!company.contact_email && !company.contact_phone && (
                                  <span className="text-xs text-muted-foreground italic">No contact info</span>
                                )}
                              </div>
                            )}
                          </td>
                          
                          {/* Details Column */}
                          <td className="px-4 sm:px-6 py-3 sm:py-4">
                            {isEditing ? (
                              <div className="space-y-2">
                                <div>
                                  <label className="text-xs text-muted-foreground mb-1 block">Company Size</label>
                                  <select
                                    value={currentCompany.company_size || ''}
                                    onChange={(e) => editedCompany && setEditedCompany({ ...editedCompany, company_size: e.target.value || null })}
                                    className="w-full px-2 py-1 text-sm bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-primary"
                                  >
                                    <option value="">Select size</option>
                                    <option value="1-10">1-10 employees</option>
                                    <option value="11-50">11-50 employees</option>
                                    <option value="51-200">51-200 employees</option>
                                    <option value="201-500">201-500 employees</option>
                                    <option value="501-1000">501-1000 employees</option>
                                    <option value="1000+">1000+ employees</option>
                                  </select>
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm space-y-1">
                                {company.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-2">{company.description}</p>
                                )}
                                {company.company_size && (
                                  <div className="flex items-center gap-2 mt-1">
                                    <Users className="w-3 h-3 text-muted-foreground" />
                                    <span className="text-xs text-foreground">{company.company_size}</span>
                                  </div>
                                )}
                                {!company.description && !company.company_size && (
                                  <span className="text-xs text-muted-foreground italic">No details</span>
                                )}
                              </div>
                            )}
                          </td>
                          
                          {/* Status Column */}
                          <td className="px-4 sm:px-6 py-3 sm:py-4">
                            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
                              company.is_verified
                                ? 'bg-success/10 text-success border border-success/20'
                                : 'bg-warning/10 text-warning border border-warning/20'
                            }`}>
                              {company.is_verified ? 'Verified' : 'Pending'}
                            </span>
                          </td>
                          
                          {/* Actions Column */}
                          <td className="px-4 sm:px-6 py-3 sm:py-4">
                            {isEditing ? (
                              <div className="flex flex-col gap-2">
                                <button
                                  onClick={() => saveCompany(company.id)}
                                  disabled={savingCompanyId === company.id || uploadingLogo === company.id}
                                  className="flex items-center justify-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {savingCompanyId === company.id || uploadingLogo === company.id ? (
                                    <>
                                      <div className="w-3 h-3 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                                      Saving...
                                    </>
                                  ) : (
                                    <>
                                      <Save className="w-3 h-3" />
                                      Save
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  disabled={savingCompanyId === company.id}
                                  className="flex items-center justify-center gap-1 px-3 py-1.5 bg-muted text-foreground rounded text-xs font-medium hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <X className="w-3 h-3" />
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-2">
                                <button
                                  onClick={() => startEditing(company)}
                                  className="flex items-center justify-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded text-xs font-medium hover:bg-primary/20"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  Edit
                                </button>
                                {!company.is_verified && (
                                  <button
                                    onClick={() => handleVerifyCompany(company.id, true)}
                                    disabled={verifying === company.id}
                                    className="px-3 py-1.5 bg-success text-success-foreground rounded text-xs font-semibold hover:bg-success/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                                  >
                                    {verifying === company.id ? (
                                      <>
                                        <div className="w-3 h-3 border-2 border-success-foreground border-t-transparent rounded-full animate-spin" />
                                        Verifying...
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle className="w-3 h-3" />
                                        Verify
                                      </>
                                    )}
                                  </button>
                                )}
                                {company.is_verified && (
                                  <button
                                    onClick={() => {
                                      if (confirm('Are you sure you want to unverify this company? Their offers will no longer be visible to students.')) {
                                        handleVerifyCompany(company.id, false);
                                      }
                                    }}
                                    disabled={verifying === company.id}
                                    className="px-3 py-1.5 bg-destructive/10 text-destructive rounded text-xs font-semibold hover:bg-destructive/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1 border border-destructive/20"
                                  >
                                    {verifying === company.id ? (
                                      <>
                                        <div className="w-3 h-3 border-2 border-destructive border-t-transparent rounded-full animate-spin" />
                                        Updating...
                                      </>
                                    ) : (
                                      <>
                                        <X className="w-3 h-3" />
                                        Unverify
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-border">
                {paginatedCompanies.map((company) => {
                  const isEditing = editingCompanyId === company.id;
                  const currentCompany = isEditing && editedCompany ? editedCompany : company;
                  
                  return (
                    <div
                      key={company.id}
                      className={`p-4 space-y-4 ${isEditing ? 'bg-primary/5 border-l-4 border-l-primary' : ''}`}
                    >
                      {/* Company Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {currentCompany.logo_url ? (
                            <img
                              src={currentCompany.logo_url}
                              alt={currentCompany.company_name || 'Company'}
                              className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-border"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                              <Building2 className="w-6 h-6 text-primary" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            {isEditing ? (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  value={currentCompany.company_name || ''}
                                  onChange={(e) => editedCompany && setEditedCompany({ ...editedCompany, company_name: e.target.value })}
                                  className="w-full px-2 py-1.5 text-sm font-semibold bg-background border border-input rounded focus:outline-none focus:ring-2 focus:ring-primary"
                                  placeholder="Company Name"
                                />
                                <input
                                  type="text"
                                  value={currentCompany.industry || ''}
                                  onChange={(e) => editedCompany && setEditedCompany({ ...editedCompany, industry: e.target.value || null })}
                                  className="w-full px-2 py-1 text-xs bg-background border border-input rounded focus:outline-none focus:ring-2 focus:ring-primary"
                                  placeholder="Industry"
                                />
                              </div>
                            ) : (
                              <>
                                <div className="text-sm font-semibold text-foreground truncate">{company.company_name}</div>
                                {company.industry && (
                                  <div className="text-xs text-muted-foreground truncate">{company.industry}</div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                        {!isEditing && (
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${
                            company.is_verified
                              ? 'bg-success/10 text-success border border-success/20'
                              : 'bg-warning/10 text-warning border border-warning/20'
                          }`}>
                            {company.is_verified ? 'Verified' : 'Pending'}
                          </span>
                        )}
                      </div>

                      {/* Contact Information */}
                      {isEditing ? (
                        <div className="space-y-2">
                          <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Email</label>
                            <input
                              type="email"
                              value={currentCompany.contact_email || ''}
                              onChange={(e) => editedCompany && setEditedCompany({ ...editedCompany, contact_email: e.target.value || null })}
                              className="w-full px-2 py-1.5 text-sm bg-background border border-input rounded focus:outline-none focus:ring-2 focus:ring-primary"
                              placeholder="contact@company.com"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Phone</label>
                            <input
                              type="tel"
                              value={currentCompany.contact_phone || ''}
                              onChange={(e) => editedCompany && setEditedCompany({ ...editedCompany, contact_phone: e.target.value || null })}
                              className="w-full px-2 py-1.5 text-sm bg-background border border-input rounded focus:outline-none focus:ring-2 focus:ring-primary"
                              placeholder="+212 6XX XXX XXX"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Website</label>
                            <input
                              type="url"
                              value={currentCompany.website || ''}
                              onChange={(e) => editedCompany && setEditedCompany({ ...editedCompany, website: e.target.value || null })}
                              className="w-full px-2 py-1.5 text-sm bg-background border border-input rounded focus:outline-none focus:ring-2 focus:ring-primary"
                              placeholder="https://company.com"
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Address</label>
                            <input
                              type="text"
                              value={currentCompany.address || ''}
                              onChange={(e) => editedCompany && setEditedCompany({ ...editedCompany, address: e.target.value || null })}
                              className="w-full px-2 py-1.5 text-sm bg-background border border-input rounded focus:outline-none focus:ring-2 focus:ring-primary"
                              placeholder="Company address"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {(company.contact_email || company.contact_phone) && (
                            <div className="space-y-1.5">
                              {company.contact_email && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                  <span className="text-foreground truncate">{company.contact_email}</span>
                                </div>
                              )}
                              {company.contact_phone && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                  <span className="text-foreground">{company.contact_phone}</span>
                                </div>
                              )}
                            </div>
                          )}
                          {(company.website || company.address) && (
                            <div className="space-y-1.5">
                              {company.website && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                                  <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate text-sm">
                                    {company.website.replace(/^https?:\/\//, '')}
                                  </a>
                                </div>
                              )}
                              {company.address && (
                                <div className="flex items-start gap-2 text-sm">
                                  <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                                  <span className="text-muted-foreground text-xs leading-relaxed">{company.address}</span>
                                </div>
                              )}
                            </div>
                          )}
                          {!company.contact_email && !company.contact_phone && !company.website && !company.address && (
                            <span className="text-xs text-muted-foreground italic">No contact information</span>
                          )}
                        </div>
                      )}

                      {/* Details */}
                      {isEditing ? (
                        <div className="space-y-2">
                          <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Description</label>
                            <textarea
                              value={currentCompany.description || ''}
                              onChange={(e) => editedCompany && setEditedCompany({ ...editedCompany, description: e.target.value || null })}
                              rows={3}
                              className="w-full px-2 py-1.5 text-sm bg-background border border-input rounded focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                              placeholder="Company description..."
                            />
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Company Size</label>
                            <select
                              value={currentCompany.company_size || ''}
                              onChange={(e) => editedCompany && setEditedCompany({ ...editedCompany, company_size: e.target.value || null })}
                              className="w-full px-2 py-1.5 text-sm bg-background border border-input rounded focus:outline-none focus:ring-2 focus:ring-primary"
                            >
                              <option value="">Select size</option>
                              <option value="1-10">1-10 employees</option>
                              <option value="11-50">11-50 employees</option>
                              <option value="51-200">51-200 employees</option>
                              <option value="201-500">201-500 employees</option>
                              <option value="501-1000">501-1000 employees</option>
                              <option value="1000+">1000+ employees</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">Logo</label>
                            <ImageUpload
                              currentImageUrl={currentCompany.logo_url || null}
                              onImageSelect={handleLogoSelect}
                              onImageRemove={() => {
                                setLogoFile(null);
                                if (editedCompany) {
                                  setEditedCompany({ ...editedCompany, logo_url: null });
                                }
                              }}
                              label=""
                              maxSizeMB={5}
                            />
                          </div>
                        </div>
                      ) : (
                        (company.description || company.company_size) && (
                          <div className="space-y-1.5 pt-2 border-t border-border/50">
                            {company.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2">{company.description}</p>
                            )}
                            {company.company_size && (
                              <div className="flex items-center gap-2">
                                <Users className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                                <span className="text-xs text-foreground">{company.company_size} employees</span>
                              </div>
                            )}
                          </div>
                        )
                      )}

                      {/* Actions */}
                      <div className="flex flex-col gap-2 pt-2 border-t border-border/50">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => saveCompany(company.id)}
                              disabled={savingCompanyId === company.id || uploadingLogo === company.id}
                              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {savingCompanyId === company.id || uploadingLogo === company.id ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <Save className="w-4 h-4" />
                                  Save Changes
                                </>
                              )}
                            </button>
                            <button
                              onClick={cancelEditing}
                              disabled={savingCompanyId === company.id}
                              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-muted text-foreground rounded-lg text-sm font-medium hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <X className="w-4 h-4" />
                              Cancel
                            </button>
                          </>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => startEditing(company)}
                              className="flex items-center justify-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20"
                            >
                              <Edit2 className="w-4 h-4" />
                              Edit
                            </button>
                            {!company.is_verified ? (
                              <button
                                onClick={() => handleVerifyCompany(company.id, true)}
                                disabled={verifying === company.id}
                                className="px-3 py-2 bg-success text-success-foreground rounded-lg text-sm font-semibold hover:bg-success/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                              >
                                {verifying === company.id ? (
                                  <>
                                    <div className="w-4 h-4 border-2 border-success-foreground border-t-transparent rounded-full animate-spin" />
                                    Verifying...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="w-4 h-4" />
                                    Verify
                                  </>
                                )}
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  if (confirm('Are you sure you want to unverify this company? Their offers will no longer be visible to students.')) {
                                    handleVerifyCompany(company.id, false);
                                  }
                                }}
                                disabled={verifying === company.id}
                                className="px-3 py-2 bg-destructive/10 text-destructive rounded-lg text-sm font-semibold hover:bg-destructive/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 border border-destructive/20"
                              >
                                {verifying === company.id ? (
                                  <>
                                    <div className="w-4 h-4 border-2 border-destructive border-t-transparent rounded-full animate-spin" />
                                    Updating...
                                  </>
                                ) : (
                                  <>
                                    <X className="w-4 h-4" />
                                    Unverify
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Pagination */}
              {filteredCompanies.length > 10 && (
                <div className="px-4 sm:px-6 py-4 border-t border-border">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    itemsPerPage={itemsPerPage}
                    totalItems={filteredCompanies.length}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}