import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Building2, MapPin, Globe, Briefcase, Users } from 'lucide-react';

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
  const [company, setCompany] = useState<Company | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);

  useEffect(() => {
    loadCompanyProfile();
  }, [companyId]);

  const loadCompanyProfile = async () => {
    if (!companyId) return;

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
      .single();

    if (companyError || !companyData) {
      setLoading(false);
      return;
    }

    setCompany(companyData);

    // Get upcoming event
    const { data: eventsData } = await supabase
      .from('events')
      .select('id')
      .gte('date', new Date().toISOString())
      .order('date', { ascending: true })
      .limit(1);

    if (eventsData && eventsData.length > 0) {
      // Get company's active offers
      const { data: offersData } = await supabase
        .from('offers')
        .select('id, title, description, interest_tag, location, duration_months, paid, remote_possible')
        .eq('company_id', companyId)
        .eq('event_id', eventsData[0].id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (offersData) {
        setOffers(offersData);
      }
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground animate-pulse">Loading company...</p>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-foreground mb-2">Company Not Found</h2>
          <p className="text-muted-foreground mb-4">This company profile is not available.</p>
          <Link to="/student/offers" className="text-primary hover:underline">
            Back to Offers
          </Link>
        </div>
      </div>
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
