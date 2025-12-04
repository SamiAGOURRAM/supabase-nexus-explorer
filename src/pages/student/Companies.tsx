import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { Building2, Search, MapPin, Globe, Briefcase } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import LoadingScreen from '@/components/shared/LoadingScreen';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import EmptyState from '@/components/shared/EmptyState';
import Pagination from '@/components/shared/Pagination';
import StudentLayout from '@/components/student/StudentLayout';

type Company = {
  id: string;
  company_name: string;
  industry: string | null;
  description: string | null;
  website: string | null;
  address: string | null;
  company_code: string | null;
  total_offers?: number;
};

export default function StudentCompanies() {
  const { user, loading: authLoading } = useAuth('student');
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { showError } = useToast();
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  useEffect(() => {
    if (!authLoading && user) {
      loadCompanies();
    }
  }, [authLoading, user]);

  const loadCompanies = async () => {
    try {
      setError(null);
      setLoading(true);

      // Get all companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, company_name, industry, description, website, address, company_code')
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

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredCompanies.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedCompanies = filteredCompanies.slice(startIndex, endIndex);

  if (authLoading || loading) {
    return <LoadingScreen message="Loading companies..." />;
  }

  if (error) {
    return (
      <StudentLayout onSignOut={handleSignOut}>
        <div className="p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <ErrorDisplay error={error} onRetry={loadCompanies} />
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout onSignOut={handleSignOut}>
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-[#1a1f3a]">
          <div className="absolute inset-0 opacity-[0.02]">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
                backgroundSize: "48px 48px",
              }}
            />
          </div>
          
          <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-12 md:py-16">
            <div>
              <div className="inline-block mb-4">
                <div className="flex items-center gap-2 px-4 py-1.5 bg-white/10 rounded-full border border-white/20">
                  <Building2 className="w-4 h-4 text-white" />
                  <span className="text-sm text-white">{companies.length} Companies</span>
                </div>
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold text-white mb-3">
                Companies
              </h1>
              <p className="text-lg text-white/70 max-w-2xl">
                Explore participating companies and available opportunities
              </p>
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </section>

        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8 space-y-6">
        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#007e40]/20 focus:border-[#007e40] transition-colors text-gray-900 placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#007e40] rounded-lg">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-0.5">Total Companies</p>
                <p className="text-3xl font-bold text-gray-900">{companies.length}</p>
              </div>
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
                : 'Companies will appear here once they register.'
            }
            className="bg-card rounded-xl border border-border p-12"
          />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedCompanies.map((company) => (
              <Link
                key={company.id}
                to={`/student/companies/${company.id}`}
                className="group bg-white border border-gray-200 rounded-lg p-6 hover:border-[#007e40] hover:shadow-lg transition-all"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-[#007e40]/10 transition-colors">
                    <Building2 className="w-6 h-6 text-gray-600 group-hover:text-[#007e40] transition-colors" />
                  </div>
                  {company.industry && (
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{company.industry}</span>
                  )}
                </div>

                <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1 group-hover:text-[#007e40] transition-colors">{company.company_name}</h3>

                {company.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {company.description}
                  </p>
                )}

                <div className="space-y-2 mb-4">
                {company.address && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{company.address}</span>
                  </div>
                )}
                  {company.website && (
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Globe className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{company.website}</span>
                    </div>
                  )}
                  {company.total_offers !== undefined && (
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Briefcase className="w-4 h-4 flex-shrink-0" />
                      <span>{company.total_offers} {company.total_offers === 1 ? 'offer' : 'offers'}</span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-200">
                  <span className="text-sm text-[#007e40] font-medium flex items-center gap-1">
                    View Profile
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </Link>
              ))}
            </div>
            
            {/* Pagination */}
            {filteredCompanies.length > 10 && (
              <div className="mt-6">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  itemsPerPage={itemsPerPage}
                  totalItems={filteredCompanies.length}
                />
              </div>
            )}
          </>
        )}
        </div>
      </div>
    </StudentLayout>
  );
}

