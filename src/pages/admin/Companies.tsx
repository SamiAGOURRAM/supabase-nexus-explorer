import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { Building2, CheckCircle, Clock, X } from 'lucide-react';
import type { Company } from '@/types/database';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAuth } from '@/hooks/useAuth';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import EmptyState from '@/components/shared/EmptyState';
import LoadingTable from '@/components/shared/LoadingTable';

export default function AdminCompanies() {
  const { signOut } = useAuth('admin');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null);
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    checkAdminAndLoadCompanies();
  }, []);

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
      
      const { data, error } = await supabase
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
      // Use the database function to verify/reject company
      const { error } = await supabase.rpc('fn_verify_company', {
        p_company_id: companyId,
        p_is_verified: verify
      });

      if (error) {
        throw new Error(`Failed to verify company: ${error.message}`);
      }

      showSuccess(`Company ${verify ? 'verified' : 'rejected'} successfully`);
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

  return (
    <AdminLayout onSignOut={signOut}>
      <div className="p-6 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">Companies Management</h1>
            <p className="text-muted-foreground text-sm md:text-base">View and verify all companies</p>
          </div>

          {error ? (
            <ErrorDisplay error={error} onRetry={loadCompanies} />
          ) : loading ? (
            <LoadingTable columns={5} rows={10} />
          ) : companies.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No companies yet"
              message="Companies will appear here once they register and create their profiles."
              className="bg-card rounded-xl border border-border p-12"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {companies.map((company) => (
                <div
                  key={company.id}
                  className="bg-card border border-border rounded-xl p-6 shadow-soft hover:shadow-elegant hover:border-primary/50 transition-all duration-200 group"
                >
                  <div className="flex items-start justify-between mb-5">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Building2 className="w-6 h-6 text-primary" />
                    </div>
                    {company.is_verified ? (
                      <div className="w-8 h-8 bg-success/10 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-success" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-warning/10 rounded-full flex items-center justify-center">
                        <Clock className="w-5 h-5 text-warning" />
                      </div>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2 line-clamp-1">{company.company_name}</h3>
                  {company.industry && (
                    <p className="text-xs text-muted-foreground mb-2">{company.industry}</p>
                  )}
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2 min-h-[2.5rem]">
                    {company.description || 'No description provided'}
                  </p>
                  {(company as any).company_representatives && Array.isArray((company as any).company_representatives) && (company as any).company_representatives.length > 0 && (
                    <div className="mb-3 pt-3 border-t border-border">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Representatives:</p>
                      <div className="space-y-1">
                        {(company as any).company_representatives.slice(0, 2).map((rep: any) => (
                          <p key={rep.id} className="text-xs text-foreground">
                            {rep.full_name} - {rep.title}
                          </p>
                        ))}
                        {(company as any).company_representatives.length > 2 && (
                          <p className="text-xs text-muted-foreground">+{(company as any).company_representatives.length - 2} more</p>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-3 pt-4 border-t border-border">
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
                      company.is_verified
                        ? 'bg-success/10 text-success border border-success/20'
                        : 'bg-warning/10 text-warning border border-warning/20'
                    }`}>
                      {company.is_verified ? 'Verified' : 'Pending'}
                    </span>
                    {!company.is_verified && (
                      <button
                        onClick={() => handleVerifyCompany(company.id, true)}
                        disabled={verifying === company.id}
                        className="px-4 py-2 bg-success text-success-foreground rounded-lg text-xs font-semibold hover:bg-success/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-soft hover:shadow-elegant"
                      >
                        {verifying === company.id ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-success-foreground border-t-transparent rounded-full animate-spin"></div>
                            Verifying...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-3.5 h-3.5" />
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
                        className="px-4 py-2 bg-destructive/10 text-destructive rounded-lg text-xs font-semibold hover:bg-destructive/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 border border-destructive/20"
                      >
                        {verifying === company.id ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-destructive border-t-transparent rounded-full animate-spin"></div>
                            Updating...
                          </>
                        ) : (
                          <>
                            <X className="w-3.5 h-3.5" />
                            Unverify
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}