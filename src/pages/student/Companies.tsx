import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { Building2, Search, CheckCircle, MapPin, Globe, Briefcase } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import LoadingScreen from '@/components/shared/LoadingScreen';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import EmptyState from '@/components/shared/EmptyState';

type Company = {
  id: string;
  company_name: string;
  industry: string | null;
  description: string | null;
  website: string | null;
  address: string | null;
  is_verified: boolean;
  company_code: string | null;
  total_offers?: number;
};

export default function StudentCompanies() {
  const { user, loading: authLoading } = useAuth('student');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { showError } = useToast();

  useEffect(() => {
    if (!authLoading && user) {
      loadCompanies();
    }
  }, [authLoading, user]);

  const loadCompanies = async () => {
    try {
      setError(null);
      setLoading(true);

      // Get all verified companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, company_name, industry, description, website, address, is_verified, company_code')
        .eq('is_verified', true)
        .order('company_name', { ascending: true });

      if (companiesError) {
        throw new Error(`Failed to load companies: ${companiesError.message}`);
      }

      if (!companiesData) {
        setCompanies([]);
        return;
      }

      // Get offer counts for each company
      const companyIds = companiesData.map(c => c.id);
      let offerCounts: Record<string, number> = {};

      if (companyIds.length > 0) {
        const { data: offersData } = await supabase
          .from('offers')
          .select('company_id')
          .in('company_id', companyIds)
          .eq('is_active', true);

        if (offersData) {
          offerCounts = offersData.reduce((acc: Record<string, number>, offer) => {
            acc[offer.company_id] = (acc[offer.company_id] || 0) + 1;
            return acc;
          }, {});
        }
      }

      const companiesWithOffers: Company[] = companiesData.map(company => ({
        id: company.id,
        company_name: company.company_name,
        industry: company.industry,
        description: company.description,
        website: company.website,
        address: company.address,
        is_verified: company.is_verified,
        company_code: company.company_code,
        total_offers: offerCounts[company.id] || 0
      }));

      setCompanies(companiesWithOffers);
    } catch (err: any) {
      console.error('Error loading companies:', err);
      const errorMessage = err instanceof Error ? err : new Error('Failed to load companies');
      setError(errorMessage);
      showError('Failed to load companies. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredCompanies = companies.filter(company => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      company.company_name.toLowerCase().includes(query) ||
      company.industry?.toLowerCase().includes(query) ||
      company.description?.toLowerCase().includes(query) ||
      company.address?.toLowerCase().includes(query)
    );
  });

  if (authLoading || loading) {
    return <LoadingScreen message="Loading companies..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <h1 className="text-2xl font-bold text-foreground">Browse Companies</h1>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ErrorDisplay error={error} onRetry={loadCompanies} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Browse Companies</h1>
              <p className="text-sm text-muted-foreground mt-1">Explore verified companies participating in the event</p>
            </div>
            <Link
              to="/student"
              className="text-sm text-primary hover:text-primary/80 transition-colors"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search companies by name, industry, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Companies</p>
                <p className="text-2xl font-bold text-foreground mt-1">{companies.length}</p>
              </div>
              <Building2 className="w-8 h-8 text-primary" />
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Verified</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {companies.filter(c => c.is_verified).length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Offers</p>
                <p className="text-2xl font-bold text-foreground mt-1">
                  {companies.reduce((sum, c) => sum + (c.total_offers || 0), 0)}
                </p>
              </div>
              <Briefcase className="w-8 h-8 text-warning" />
            </div>
          </div>
        </div>

        {/* Companies Grid */}
        {filteredCompanies.length === 0 ? (
          <EmptyState
            icon={Building2}
            title={searchQuery ? 'No companies match your search' : 'No companies available'}
            message={
              searchQuery
                ? 'Try a different search term to find companies.'
                : 'Companies will appear here once they register and get verified.'
            }
            className="bg-card rounded-xl border border-border p-12"
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCompanies.map((company) => (
              <Link
                key={company.id}
                to={`/student/companies/${company.id}`}
                className="bg-card border border-border rounded-xl p-6 hover:border-primary hover:shadow-elegant transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Building2 className="w-6 h-6 text-primary" />
                  </div>
                  {company.is_verified && (
                    <div className="w-8 h-8 bg-success/10 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-success" />
                    </div>
                  )}
                </div>

                <h3 className="text-lg font-semibold text-foreground mb-2 line-clamp-1">{company.company_name}</h3>

                {company.industry && (
                  <p className="text-sm text-muted-foreground mb-2">{company.industry}</p>
                )}

                {company.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2 min-h-[2.5rem]">
                    {company.description}
                  </p>
                )}

                <div className="space-y-2 mb-4">
                {company.address && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate">{company.address}</span>
                  </div>
                )}
                  {company.website && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Globe className="w-3 h-3" />
                      <span className="truncate">{company.website}</span>
                    </div>
                  )}
                  {company.total_offers !== undefined && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Briefcase className="w-3 h-3" />
                      <span>{company.total_offers} {company.total_offers === 1 ? 'offer' : 'offers'}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <span className="text-xs text-primary font-medium group-hover:underline">
                    View Profile →
                  </span>
                  {company.is_verified && (
                    <span className="px-2 py-1 bg-success/10 text-success text-xs font-medium rounded-full">
                      Verified
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

