import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { ArrowLeft, Building2, MapPin, Globe, Briefcase, Users, Mail, Phone, User } from 'lucide-react';
import LoadingScreen from '@/components/shared/LoadingScreen';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import NotFound from '@/components/shared/NotFound';
import StudentLayout from '@/components/student/StudentLayout';
import { useAuth } from '@/hooks/useAuth';

type Company = {
  id: string;
  company_name: string;
  description: string | null;
  industry: string | null;
  website: string | null;
  logo_url: string | null;
  company_size: string | null;
  address: string | null;
};

type Representative = {
  id: string;
  full_name: string;
  title: string;
  phone: string | null;
  email: string;
};

type Offer = {
  id: string;
  title: string;
  description: string;
  interest_tag: string;
  location: string | null;
  duration_months: number | null;
  paid: boolean | null;
  remote_possible: boolean | null;
};

export default function CompanyProfile() {
  const { companyId } = useParams<{ companyId: string }>();
  const navigate = useNavigate();
  const { signOut } = useAuth('student');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [representatives, setRepresentatives] = useState<Representative[]>([]);
  const { showError } = useToast();

  useEffect(() => {
    loadCompanyProfile();
  }, [companyId]);

  const loadCompanyProfile = async () => {
    if (!companyId) {
      setError(new Error('Company ID is required'));
      setLoading(false);
      return;
    }

    try {
      setError(null);
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      // Get company details
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('*')
        .eq('id', companyId)
        .eq('is_verified', true)
        .maybeSingle();

      if (companyError) {
        throw new Error(`Failed to load company: ${companyError.message}`);
      }

      if (!companyData) {
        setError(new Error('Company not found or not verified'));
        setLoading(false);
        return;
      }

      setCompany(companyData);

      // Load representatives
      const { data: repsData, error: repsError } = await supabase
        .from('company_representatives' as any)
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: true });

      if (repsError) {
        console.error('Error loading representatives:', repsError);
      } else {
        setRepresentatives((repsData as unknown as Representative[]) || []);
      }

      // Get upcoming event
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('id')
        .gte('date', new Date().toISOString())
        .order('date', { ascending: true })
        .limit(1);

      if (eventsError) {
        console.error('Error loading events:', eventsError);
      }

      if (eventsData && eventsData.length > 0) {
        // Get company's active offers
        const { data: offersData, error: offersError } = await supabase
          .from('offers')
          .select('id, title, description, interest_tag, location, duration_months, paid, remote_possible')
          .eq('company_id', companyId)
          .eq('event_id', eventsData[0].id)
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (offersError) {
          console.error('Error loading offers:', offersError);
        }

        if (offersData) {
          setOffers(offersData);
        } else {
          setOffers([]);
        }
      } else {
        setOffers([]);
      }
    } catch (err: any) {
      console.error('Error loading company profile:', err);
      const errorMessage = err instanceof Error ? err : new Error('Failed to load company profile');
      setError(errorMessage);
      showError('Failed to load company profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading company profile..." />;
  }

  if (error && !company) {
    return (
      <StudentLayout onSignOut={signOut}>
        <div className="p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <Link to="/student/offers" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
              <ArrowLeft className="w-5 h-5" />
              Back to Offers
            </Link>
            {error.message.includes('not found') ? (
              <NotFound resource="Company" backTo="/student/offers" backLabel="Back to Offers" />
            ) : (
              <ErrorDisplay error={error} onRetry={loadCompanyProfile} />
            )}
          </div>
        </div>
      </StudentLayout>
    );
  }

  if (!company) {
    return (
      <StudentLayout onSignOut={signOut}>
        <div className="p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <NotFound resource="Company" backTo="/student/offers" backLabel="Back to Offers" />
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout onSignOut={signOut}>
      <div className="min-h-screen bg-gray-50">
        {/* Hero Header */}
        <div className="bg-[#1a1f3a] border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8">
            <Link to="/student/companies" className="inline-flex items-center gap-2 text-white/70 hover:text-white mb-6 transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Companies</span>
            </Link>
            
            <div className="flex items-start gap-6">
              {company.logo_url ? (
                <img src={company.logo_url} alt={company.company_name} className="w-20 h-20 rounded-xl object-cover border-2 border-white/20" />
              ) : (
                <div className="w-20 h-20 bg-white/10 rounded-xl flex items-center justify-center border-2 border-white/20">
                  <Building2 className="w-10 h-10 text-white" />
                </div>
              )}
              <div className="flex-1">
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{company.company_name}</h1>
                {company.industry && (
                  <span className="inline-block text-sm text-white/80 bg-white/10 px-3 py-1 rounded-full">{company.industry}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8 space-y-6">
        {/* Company Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {company.address && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Location</p>
                  <p className="text-sm text-gray-900 font-medium">{company.address}</p>
                </div>
              </div>
            )}
            {company.company_size && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Company Size</p>
                  <p className="text-sm text-gray-900 font-medium">{company.company_size}</p>
                </div>
              </div>
            )}
            {company.website && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Globe className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Website</p>
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#007e40] font-medium hover:underline"
                  >
                    Visit Website →
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* About Section */}
        {company.description && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">About</h2>
            <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
              {company.description}
            </p>
          </div>
        )}

        {/* Representatives Section */}
        {representatives.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Representatives</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {representatives.map((rep) => (
                <div key={rep.id} className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-[#007e40] rounded-lg flex items-center justify-center flex-shrink-0">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 mb-0.5">{rep.full_name}</h3>
                      <p className="text-sm text-gray-500 mb-3">{rep.title}</p>
                      <div className="space-y-2">
                        <a href={`mailto:${rep.email}`} className="flex items-center gap-2 text-sm text-gray-700 hover:text-[#007e40] transition-colors">
                          <Mail className="w-4 h-4" />
                          <span className="truncate">{rep.email}</span>
                        </a>
                        {rep.phone && (
                          <a href={`tel:${rep.phone}`} className="flex items-center gap-2 text-sm text-gray-700 hover:text-[#007e40] transition-colors">
                            <Phone className="w-4 h-4" />
                            <span>{rep.phone}</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current Offers */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Available Positions</h2>
            <span className="text-sm text-gray-500">{offers.length} {offers.length === 1 ? 'position' : 'positions'}</span>
          </div>

          {offers.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-500">No active positions at the moment</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {offers.map((offer) => (
                <Link
                  key={offer.id}
                  to={`/student/offers/${offer.id}`}
                  className="group bg-gray-50 rounded-lg border border-gray-200 p-5 hover:border-[#007e40] hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-[#007e40] transition-colors">{offer.title}</h3>
                      <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                        {offer.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="px-2.5 py-1 bg-[#007e40] text-white text-xs font-medium rounded">
                      {offer.interest_tag}
                    </span>
                    {offer.paid && (
                      <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                        Paid
                      </span>
                    )}
                    {offer.remote_possible && (
                      <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                        Remote
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    {offer.location && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        {offer.location}
                      </div>
                    )}
                    {offer.duration_months && (
                      <span>{offer.duration_months} months</span>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <span className="text-sm text-[#007e40] font-medium group-hover:gap-2 flex items-center gap-1 transition-all">
                      View Details
                      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
        </div>
      </div>
    </StudentLayout>
  );
}
