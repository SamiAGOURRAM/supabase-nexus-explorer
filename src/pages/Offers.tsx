import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Building2, MapPin, Calendar, Briefcase, Sparkles, Filter as FilterIcon, ArrowRight } from 'lucide-react';
import type { Offer, Company, Event } from '@/types/database';
import Navigation from './landingPage/components/Navigation';
import Footer from './landingPage/components/Footer';
import DecorativeShape from './landingPage/components/DecorativeShape';

type OfferWithDetails = Offer & {
  companies: Company;
  events: Event;
};

type FilterValue = 'all' | 'Opérationnel' | 'Administratif';

const FILTER_OPTIONS: Array<{ value: FilterValue; label: string; helper: string }> = [
  {
    value: 'all',
    label: 'All offers',
    helper: 'Everything currently recruiting',
  },
  {
    value: 'Opérationnel',
    label: 'Opérationnel',
    helper: 'Hands-on, on-site experiences',
  },
  {
    value: 'Administratif',
    label: 'Administratif',
    helper: 'Coordination & support tracks',
  },
];

export default function Offers() {
  const [offers, setOffers] = useState<OfferWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterValue>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  const checkUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUser(user);
  };

  const loadOffers = useCallback(async () => {
    try {
      setError(null);
      const { data, error } = await supabase
        .from('offers')
        .select(`
          *,
          companies(*),
          events(*)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOffers((data as OfferWithDetails[]) || []);
    } catch (error) {
      console.error('Error loading offers:', error);
      setError('Unable to load offers right now. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkUser();
    loadOffers();
  }, [loadOffers]);

  const companyOptions = useMemo(() => {
    const companies = new Set<string>();
    offers.forEach((offer) => {
      if (offer.companies?.company_name) {
        companies.add(offer.companies.company_name);
      }
    });
    return Array.from(companies).sort((a, b) => a.localeCompare(b));
  }, [offers]);

  const filteredOffers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return offers.filter((offer) => {
      const matchesType = filter === 'all' || offer.interest_tag === filter;
      const matchesCompany =
        companyFilter === 'all' ||
        offer.companies?.company_name === companyFilter;
      const matchesSearch =
        normalizedSearch.length === 0 ||
        [
          offer.title,
          offer.description,
          offer.companies?.company_name ?? '',
          offer.events?.location ?? '',
          offer.events?.name ?? '',
        ].some((field) =>
          field.toLowerCase().includes(normalizedSearch)
        );

      return matchesType && matchesCompany && matchesSearch;
    });
  }, [offers, filter, companyFilter, searchTerm]);

  const filtersActive =
    filter !== 'all' || companyFilter !== 'all' || searchTerm.trim().length > 0;

  const heroStats = useMemo(() => {
    const companyCount = new Set(offers.map((offer) => offer.company_id)).size;
    const eventCount = new Set(offers.map((offer) => offer.event_id)).size;

    return [
      { label: 'Active offers', value: offers.length },
      { label: 'Participating companies', value: companyCount },
      { label: 'Upcoming events', value: eventCount },
    ];
  }, [offers]);

  const handleClearFilters = () => {
    setFilter('all');
    setCompanyFilter('all');
    setSearchTerm('');
  };

  const dashboardRoute = useMemo(() => {
    if (!user) return '/student';
    const role = user?.app_metadata?.role || user?.user_metadata?.role;
    if (role === 'admin') return '/admin';
    if (role === 'company') return '/company';
    return '/student';
  }, [user]);

  const showEmptyState = !loading && filteredOffers.length === 0;

  const handleOfferClick = (offerId: string, event?: React.MouseEvent) => {
    // Prevent navigation if clicking on interactive elements inside
    if (event) {
      const target = event.target as HTMLElement;
      // Don't navigate if clicking on links or buttons
      if (target.closest('a') || target.closest('button')) {
        return;
      }
    }
    
    if (user) {
      navigate(`/student/offers/${offerId}`);
    } else {
      // For non-logged in users, redirect to login with redirect parameter
      navigate(`/login?redirect=/student/offers/${offerId}`);
    }
  };

  const scrollToOffers = () => {
    if (typeof document === 'undefined') return;
    const target = document.getElementById('offers-list');
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative py-24 bg-[#f5f5f0] overflow-hidden">
        <DecorativeShape
          position="top-left"
          size="md"
          opacity={0.08}
          rotation={0}
        />
        <DecorativeShape
          position="top-right"
          size="sm"
          opacity={0.06}
          rotation={90}
        />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid gap-8 lg:grid-cols-[1.6fr,1fr]">
            <div className="rounded-2xl bg-white p-8 shadow-lg">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#ffb300]/10 rounded-full border border-[#ffb300]/20 mb-6">
                <Sparkles size={16} className="text-[#ffb300]" />
                <span className="text-sm text-gray-700 font-medium">
                  2025 Edition
                </span>
              </div>
              <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
                Discover Curated Internship Offers
              </h2>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Compare openings from verified companies, understand their focus areas, and secure your interview slot for the next inf hiring sprint.
              </p>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={scrollToOffers}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-[#ffb300] text-white rounded-lg hover:bg-[#e6a200] transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
                >
                  Browse offers
                  <ArrowRight size={20} />
                </button>
                {!user && (
                  <Link
                    to="/signup"
                    className="inline-flex items-center gap-2 px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:border-[#007e40] hover:text-[#007e40] transition-all duration-200 font-semibold"
                  >
                    Not registered yet?
                  </Link>
                )}
                {user && (
                  <Link
                    to={dashboardRoute}
                    className="inline-flex items-center gap-2 px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:border-[#007e40] hover:text-[#007e40] transition-all duration-200 font-semibold"
                  >
                    Continue to portal
                  </Link>
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-lg">
              <p className="text-sm font-semibold text-gray-700 mb-1">Live stats</p>
              <p className="text-xs text-gray-500 mb-6">Updated in real-time</p>
              <div className="space-y-4">
                {heroStats.map((stat) => (
                  <div key={stat.label} className="rounded-xl bg-[#f5f5f0] px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-gray-500">{stat.label}</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{stat.value ?? '—'}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">

        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="mt-8 rounded-2xl border-2 border-red-300 bg-red-50 p-4 text-sm text-red-700"
          >
            <div className="flex items-center justify-between gap-4">
              <p>{error}</p>
              <button
                type="button"
                onClick={loadOffers}
                className="rounded-lg border-2 border-red-300 px-3 py-1 text-xs font-semibold text-red-700 hover:border-red-500 hover:bg-red-100 transition-colors"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <section className="mt-12 space-y-6 bg-white py-8 rounded-2xl px-6" aria-label="Filter offers">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="flex-1">
              <label htmlFor="offer-search" className="block text-sm font-semibold text-gray-700 mb-2">
                Search opportunities
              </label>
              <div className="relative">
                <input
                  id="offer-search"
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by role, company, or location"
                  className="w-full rounded-lg border-2 border-gray-300 bg-white px-4 py-3 pr-12 text-sm text-gray-900 transition focus:border-[#007e40] focus:outline-none focus:ring-2 focus:ring-[#007e40]/20"
                />
                <Sparkles className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#ffb300]" />
              </div>
            </div>

            <div className="w-full lg:w-64">
              <label htmlFor="company-filter" className="block text-sm font-semibold text-gray-700 mb-2">
                Partner company
              </label>
              <select
                id="company-filter"
                value={companyFilter}
                onChange={(event) => setCompanyFilter(event.target.value)}
                className="w-full rounded-lg border-2 border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 focus:border-[#007e40] focus:outline-none focus:ring-2 focus:ring-[#007e40]/20"
              >
                <option value="all">All partners</option>
                {companyOptions.map((company) => (
                  <option key={company} value={company}>
                    {company}
                  </option>
                ))}
              </select>
            </div>

            {filtersActive && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex h-12 items-center justify-center rounded-lg border-2 border-gray-300 px-4 text-sm font-semibold text-gray-700 transition hover:border-[#007e40] hover:text-[#007e40]"
              >
                Reset filters
              </button>
            )}
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
              <FilterIcon className="h-4 w-4" />
              Refine by focus area
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {FILTER_OPTIONS.map((option) => {
                const isActive = filter === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setFilter(option.value)}
                    className={`rounded-lg border-2 px-5 py-4 text-left transition-all ${
                      isActive
                        ? 'border-[#ffb300] bg-[#ffb300] text-white shadow-lg'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-[#007e40] hover:text-[#007e40]'
                    }`}
                  >
                    <p className="text-sm font-semibold">{option.label}</p>
                    <p className="mt-1 text-xs opacity-80">{option.helper}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Offers Grid */}
        <section id="offers-list" className="mt-10">
          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2, 3].map((index) => (
                <div key={index} className="rounded-2xl border-2 border-gray-200 bg-white p-6">
                  <div className="h-4 w-24 rounded bg-gray-200" />
                  <div className="mt-4 h-6 w-3/4 rounded bg-gray-200" />
                  <div className="mt-3 space-y-2">
                    <div className="h-4 w-full rounded bg-gray-200" />
                    <div className="h-4 w-2/3 rounded bg-gray-200" />
                  </div>
                  <div className="mt-6 h-9 w-full rounded bg-gray-200" />
                </div>
              ))}
            </div>
          ) : showEmptyState ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-[#f5f5f0] p-10 text-center">
              <Briefcase className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-xl font-semibold text-gray-900">No offers match that filter</h3>
              <p className="mt-2 text-sm text-gray-600">
                Adjust the filters or come back soon. New offers are added frequently during each event phase.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredOffers.map((offer) => {
                const eventDate = offer.events?.date ? new Date(offer.events.date).toLocaleDateString() : 'Date TBA';
                return (
                  <article
                    key={offer.id}
                    onClick={(e) => handleOfferClick(offer.id, e)}
                    className="group flex h-full flex-col rounded-2xl border-2 border-gray-200 bg-white p-6 transition-all hover:-translate-y-1 hover:border-[#007e40] hover:shadow-xl cursor-pointer"
                    role="button"
                    tabIndex={0}
                    aria-label={`View details for ${offer.title} at ${offer.companies?.company_name || 'company'}`}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleOfferClick(offer.id);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{eventDate}</p>
                        <h3 className="mt-2 text-lg font-semibold text-gray-900 transition-colors group-hover:text-[#007e40]">
                          {offer.title}
                        </h3>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          offer.interest_tag === 'Opérationnel'
                            ? 'bg-[#007e40]/10 text-[#007e40]'
                            : 'bg-[#ffb300]/10 text-[#ffb300]'
                        }`}
                      >
                        {offer.interest_tag}
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-gray-600 line-clamp-3">{offer.description}</p>

                    <div className="mt-5 space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{offer.companies?.company_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>{offer.events?.name || 'Recruiting event'}</span>
                      </div>
                      {offer.events?.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span>{offer.events.location}</span>
                        </div>
                      )}
                    </div>

                    <footer className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOfferClick(offer.id);
                        }}
                        className="flex items-center gap-2 text-sm font-semibold text-[#007e40] hover:text-[#005a2d] transition-colors cursor-pointer"
                        aria-label={`View details for ${offer.title}`}
                      >
                        View details
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </button>
                      <span className="text-xs text-gray-500 pointer-events-none">Tap to continue</span>
                    </footer>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
