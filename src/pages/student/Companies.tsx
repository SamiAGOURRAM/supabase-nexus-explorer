import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { Building2, Search, CheckCircle, MapPin, Globe, Briefcase } from 'lucide-react';
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
  is_verified: boolean;
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
        <section className="relative overflow-hidden bg-gradient-to-br from-[#1a1f3a] via-[#2a3f5f] to-[#1a1f3a]">
          <div className="absolute inset-0 opacity-[0.03]">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
                backgroundSize: "32px 32px",
              }}
            />
          </div>
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#007e40] rounded-full mix-blend-screen filter blur-3xl opacity-5" />
          <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-[#ffb300] rounded-full mix-blend-screen filter blur-3xl opacity-5" />
          
          <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-12 md:py-16">
            <div className="mb-6">
              <div className="inline-block mb-3">
                <div className="flex items-center gap-2 px-4 py-1.5 bg-white/5 backdrop-blur-sm rounded-full border border-white/10">
                  <Building2 className="w-4 h-4 text-[#007e40]" />
                  <span className="text-sm text-white/80 font-medium">{companies.length} Companies</span>
                </div>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 leading-tight">
                Browse Companies
              </h1>
              <p className="text-lg text-white/70 max-w-2xl">
                Explore verified companies participating in events
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
              placeholder="Search companies by name, industry, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#007e40]/20 focus:border-[#007e40] transition-all shadow-sm hover:shadow-md text-gray-900 placeholder:text-gray-400"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
          <div className="group bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-xl hover:border-[#007e40]/30 transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-[#007e40] to-[#006633] rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                <Building2 className="w-6 h-6 text-white" strokeWidth={2} />
              </div>
              <div className="w-2 h-2 rounded-full bg-[#007e40] animate-pulse" />
            </div>
            <p className="text-sm text-gray-600 font-medium mb-1">Total Companies</p>
            <p className="text-3xl font-bold text-gray-900">{companies.length}</p>
          </div>
          <div className="group bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-xl hover:border-green-200 transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                <CheckCircle className="w-6 h-6 text-white" strokeWidth={2} />
              </div>
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            </div>
            <p className="text-sm text-gray-600 font-medium mb-1">Verified</p>
            <p className="text-3xl font-bold text-gray-900">
              {companies.filter(c => c.is_verified).length}
            </p>
          </div>
          <div className="group bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-xl hover:border-[#ffb300]/30 transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-[#ffb300] to-[#e6a200] rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300">
                <Briefcase className="w-6 h-6 text-white" strokeWidth={2} />
              </div>
              <div className="w-2 h-2 rounded-full bg-[#ffb300] animate-pulse" />
            </div>
            <p className="text-sm text-gray-600 font-medium mb-1">Total Offers</p>
            <p className="text-3xl font-bold text-gray-900">
              {companies.reduce((sum, c) => sum + (c.total_offers || 0), 0)}
            </p>
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
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedCompanies.map((company) => (
              <Link
                key={company.id}
                to={`/student/companies/${company.id}`}
                className="group bg-white border border-gray-100 rounded-2xl p-6 hover:border-[#007e40]/30 hover:shadow-2xl transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-14 h-14 bg-[#007e40]/10 rounded-xl flex items-center justify-center group-hover:bg-[#007e40]/20 group-hover:scale-110 transition-all duration-300 shadow-sm">
                    <Building2 className="w-7 h-7 text-[#007e40]" strokeWidth={2} />
                  </div>
                  {company.is_verified && (
                    <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center border border-green-200">
                      <CheckCircle className="w-5 h-5 text-green-600" strokeWidth={2.5} />
                    </div>
                  )}
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-1 group-hover:text-[#007e40] transition-colors">{company.company_name}</h3>

                {company.industry && (
                  <p className="text-sm text-gray-500 mb-2 font-medium">{company.industry}</p>
                )}

                {company.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2 min-h-[2.5rem] leading-relaxed">
                    {company.description}
                  </p>
                )}

                <div className="space-y-2.5 mb-5 bg-gray-50/50 rounded-lg p-3">
                {company.address && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <MapPin className="w-3.5 h-3.5 text-red-500 flex-shrink-0" strokeWidth={2.5} />
                    <span className="truncate font-medium">{company.address}</span>
                  </div>
                )}
                  {company.website && (
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Globe className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" strokeWidth={2.5} />
                      <span className="truncate font-medium">{company.website}</span>
                    </div>
                  )}
                  {company.total_offers !== undefined && (
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Briefcase className="w-3.5 h-3.5 text-[#ffb300] flex-shrink-0" strokeWidth={2.5} />
                      <span className="font-medium">{company.total_offers} {company.total_offers === 1 ? 'offer' : 'offers'}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <span className="text-sm text-[#007e40] font-semibold group-hover:gap-2 flex items-center gap-1 transition-all">
                    View Profile
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                  {company.is_verified && (
                    <span className="px-2.5 py-1 bg-green-50 text-green-700 text-xs font-bold rounded-full border border-green-200">
                      ✓ Verified
                    </span>
                  )}
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

