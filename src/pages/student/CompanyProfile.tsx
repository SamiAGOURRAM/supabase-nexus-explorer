import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { ArrowLeft, Building2, MapPin, Globe, Briefcase, Users, Mail, Phone, User } from 'lucide-react';
import LoadingScreen from '@/components/shared/LoadingScreen';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import NotFound from '@/components/shared/NotFound';

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
      <div className="min-h-screen bg-background">
        <header className="bg-card border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <Link to="/student/offers" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {error.message.includes('not found') ? (
            <NotFound resource="Company" backTo="/student/offers" backLabel="Back to Offers" />
          ) : (
            <ErrorDisplay error={error} onRetry={loadCompanyProfile} />
          )}
        </main>
      </div>
    );
  }

  if (!company) {
    return (
      <NotFound resource="Company" backTo="/student/offers" backLabel="Back to Offers" />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link to="/student/offers" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{company.company_name}</h1>
              <p className="text-sm text-muted-foreground mt-1">Company Profile</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Company Header */}
        <div className="bg-card rounded-xl border border-border p-8 mb-6">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
              <Building2 className="w-12 h-12 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-foreground mb-2">{company.company_name}</h2>
              {company.industry && (
                <p className="text-lg text-muted-foreground mb-4">{company.industry}</p>
              )}
              
              <div className="flex flex-wrap gap-4 text-sm">
                {company.address && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    {company.address}
                  </div>
                )}
                {company.company_size && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="w-4 h-4" />
                    {company.company_size}
                  </div>
                )}
                {company.website && (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-primary hover:underline"
                  >
                    <Globe className="w-4 h-4" />
                    Visit Website
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* About Section */}
        {company.description && (
          <div className="bg-card rounded-xl border border-border p-6 mb-6">
            <h3 className="text-xl font-bold text-foreground mb-4">About {company.company_name}</h3>
            <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {company.description}
            </p>
          </div>
        )}

        {/* Representatives Section */}
        {representatives.length > 0 && (
          <div className="bg-card rounded-xl border border-border p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-6 h-6 text-primary" />
              <h3 className="text-xl font-bold text-foreground">Company Representatives</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {representatives.map((rep) => (
                <div key={rep.id} className="bg-background rounded-lg border border-border p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-foreground mb-1">{rep.full_name}</h4>
                      <p className="text-sm text-muted-foreground mb-2">{rep.title}</p>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-foreground">
                          <Mail className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                          <a href={`mailto:${rep.email}`} className="hover:text-primary hover:underline truncate">
                            {rep.email}
                          </a>
                        </div>
                        {rep.phone && (
                          <div className="flex items-center gap-2 text-sm text-foreground">
                            <Phone className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                            <a href={`tel:${rep.phone}`} className="hover:text-primary hover:underline">
                              {rep.phone}
                            </a>
                          </div>
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
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-6">
            <Briefcase className="w-6 h-6 text-primary" />
            <h3 className="text-xl font-bold text-foreground">
              Current Internship Offers ({offers.length})
            </h3>
          </div>

          {offers.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Briefcase className="w-8 h-8 text-muted-foreground opacity-50" />
              </div>
              <p className="text-muted-foreground">This company has no active offers at the moment</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {offers.map((offer) => (
                <Link
                  key={offer.id}
                  to={`/student/offers/${offer.id}`}
                  className="block bg-background rounded-lg border border-border p-5 hover:border-primary hover:shadow-elegant transition-all"
                >
                  <h4 className="font-bold text-foreground mb-2">{offer.title}</h4>
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {offer.description}
                  </p>

                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="px-2 py-1 bg-primary/10 text-primary text-xs font-medium rounded-full">
                      {offer.interest_tag}
                    </span>
                    {offer.paid && (
                      <span className="px-2 py-1 bg-green-500/10 text-green-600 text-xs font-medium rounded-full">
                        💰 Paid
                      </span>
                    )}
                    {offer.remote_possible && (
                      <span className="px-2 py-1 bg-blue-500/10 text-blue-600 text-xs font-medium rounded-full">
                        🏠 Remote
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {offer.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {offer.location}
                      </div>
                    )}
                    {offer.duration_months && (
                      <span>{offer.duration_months} months</span>
                    )}
                  </div>

                  <div className="mt-3 text-xs text-primary font-medium">
                    View Details →
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
