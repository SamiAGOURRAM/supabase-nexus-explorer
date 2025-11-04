import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Building2, CheckCircle, Clock, ArrowLeft } from 'lucide-react';
import type { Company } from '@/types/database';

export default function AdminCompanies() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
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

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

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

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/admin" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Companies</h1>
                <p className="text-sm text-muted-foreground mt-1">View all invited companies</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    company.is_verified
                      ? 'bg-success/10 text-success'
                      : 'bg-warning/10 text-warning'
                  }`}>
                    {company.is_verified ? 'Verified' : 'Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}