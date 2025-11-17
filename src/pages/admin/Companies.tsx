import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Building2, CheckCircle, Clock, X } from 'lucide-react';
import type { Company } from '@/types/database';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAuth } from '@/hooks/useAuth';

export default function AdminCompanies() {
  const { signOut } = useAuth('admin');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);
  const navigate = useNavigate();

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
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading companies:', error);
    } else {
      setCompanies(data || []);
    }
    setLoading(false);
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
        console.error('Error verifying company:', error);
        alert('Error: ' + error.message);
        return;
      }

      // Reload companies to reflect changes
      await loadCompanies();
    } catch (err: any) {
      console.error('Error:', err);
      alert('Error: ' + (err.message || 'Failed to verify company'));
    } finally {
      setVerifying(null);
    }
  };

  return (
    <AdminLayout onSignOut={signOut}>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Companies Management</h1>
            <p className="text-muted-foreground">View and verify all companies</p>
          </div>
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : companies.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border border-border">
            <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Companies Yet</h3>
            <p className="text-muted-foreground">Invite companies to events to see them here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in">
            {companies.map((company) => (
              <div
                key={company.id}
                className="bg-card border border-border rounded-xl p-6 hover:border-primary hover:shadow-elegant transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <Building2 className="w-8 h-8 text-primary" />
                  {company.is_verified ? (
                    <CheckCircle className="w-5 h-5 text-success" />
                  ) : (
                    <Clock className="w-5 h-5 text-warning" />
                  )}
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{company.company_name}</h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {company.description || 'No description provided'}
                </p>
                <div className="flex items-center justify-between gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    company.is_verified
                      ? 'bg-success/10 text-success'
                      : 'bg-warning/10 text-warning'
                  }`}>
                    {company.is_verified ? 'Verified' : 'Pending'}
                  </span>
                  {!company.is_verified && (
                    <button
                      onClick={() => handleVerifyCompany(company.id, true)}
                      disabled={verifying === company.id}
                      className="px-3 py-1.5 bg-success text-success-foreground rounded-lg text-xs font-medium hover:bg-success/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      {verifying === company.id ? (
                        <>
                          <div className="w-3 h-3 border-2 border-success-foreground border-t-transparent rounded-full animate-spin"></div>
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
                      className="px-3 py-1.5 bg-destructive/10 text-destructive rounded-lg text-xs font-medium hover:bg-destructive/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      {verifying === company.id ? (
                        <>
                          <div className="w-3 h-3 border-2 border-destructive border-t-transparent rounded-full animate-spin"></div>
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
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
    </AdminLayout>
  );
}