import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Building2, MapPin, Calendar, Briefcase, LogIn, UserPlus, Sparkles, Filter as FilterIcon, ArrowRight } from 'lucide-react';
import type { Offer, Company, Event } from '@/types/database';

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

  const handleOfferClick = (offerId: string) => {
    if (user) {
      navigate(`/student/offers/${offerId}`);
    } else {
      navigate('/login');
    }
  };

  const scrollToOffers = () => {
    if (typeof document === 'undefined') return;
    const target = document.getElementById('offers-list');
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="relative min-h-screen bg-background">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-primary/10 via-background/90 to-transparent"
        aria-hidden="true"
      />

      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary">
              INF
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Speed Recruiting</p>
              <h1 className="text-xl font-semibold text-foreground">Nexus Explorer</h1>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm">
            {user ? (
              <>
                <Link
                  to={dashboardRoute}
                  className="rounded-lg border border-border px-4 py-2 font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
                >
                  Go to dashboard
                </Link>
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();
                    setUser(null);
                  }}
                  className="rounded-lg px-4 py-2 text-muted-foreground transition-colors hover:text-foreground"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="flex items-center gap-2 rounded-lg px-4 py-2 text-foreground transition-colors hover:text-primary"
                >
                  <LogIn className="h-4 w-4" />
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground shadow-soft transition-all hover:shadow-elegant"
                >
                  <UserPlus className="h-4 w-4" />
                  Create account
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="grid gap-8 lg:grid-cols-[1.6fr,1fr]">
          <div className="rounded-2xl border border-border/60 bg-card/90 p-8 shadow-elegant">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              <Sparkles className="h-4 w-4" /> 2025 Edition
            </p>
            <h2 className="mt-4 text-3xl font-bold text-foreground sm:text-4xl">
              Discover curated internship offers in minutes.
            </h2>
            <p className="mt-4 text-base text-muted-foreground">
              Compare openings from verified companies, understand their focus areas, and secure your interview slot for the next Nexus hiring sprint.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={scrollToOffers}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition hover:shadow-hover"
              >
                Browse offers
                <ArrowRight className="h-4 w-4" />
              </button>
              {!user && (
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary"
                >
                  Not registered yet?
                </Link>
              )}
              {user && (
                <Link
                  to={dashboardRoute}
                  className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary"
                >
                  Continue to portal
                </Link>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border/60 bg-secondary/40 p-6">
            <p className="text-sm font-semibold text-secondary-foreground">Live stats</p>
            <p className="text-xs text-muted-foreground">Updated in real-time from Supabase</p>
            <div className="mt-6 grid gap-4">
              {heroStats.map((stat) => (
                <div key={stat.label} className="rounded-xl bg-card/80 px-4 py-3 shadow-soft">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 text-2xl font-semibold text-foreground">{stat.value ?? '—'}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="mt-8 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
          >
            <div className="flex items-center justify-between gap-4">
              <p>{error}</p>
              <button
                type="button"
                onClick={loadOffers}
                className="rounded-lg border border-destructive/30 px-3 py-1 text-xs font-semibold text-destructive hover:border-destructive/60"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Filters */}
        <section className="mt-12 space-y-6" aria-label="Filter offers">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="flex-1">
              <label htmlFor="offer-search" className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Search opportunities
              </label>
              <div className="relative mt-2">
                <input
                  id="offer-search"
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search by role, company, or location"
                  className="w-full rounded-2xl border border-border bg-card/70 px-4 py-3 pr-12 text-sm text-foreground shadow-soft transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <Sparkles className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
              </div>
            </div>

            <div className="w-full lg:w-64">
              <label htmlFor="company-filter" className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Partner company
              </label>
              <select
                id="company-filter"
                value={companyFilter}
                onChange={(event) => setCompanyFilter(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-border bg-card/70 px-4 py-3 text-sm text-foreground shadow-soft focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
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
                className="inline-flex h-12 items-center justify-center rounded-2xl border border-border px-4 text-sm font-semibold text-muted-foreground transition hover:border-primary hover:text-primary"
              >
                Reset filters
              </button>
            )}
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
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
                    className={`rounded-2xl border px-5 py-4 text-left transition-all ${
                      isActive
                        ? 'border-primary bg-primary text-primary-foreground shadow-soft'
                        : 'border-border bg-card/80 text-muted-foreground hover:border-primary/70 hover:text-foreground'
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
                <div key={index} className="rounded-2xl border border-border/70 bg-card/80 p-6">
                  <div className="h-4 w-24 rounded bg-muted/50" />
                  <div className="mt-4 h-6 w-3/4 rounded bg-muted/60" />
                  <div className="mt-3 space-y-2">
                    <div className="h-4 w-full rounded bg-muted/40" />
                    <div className="h-4 w-2/3 rounded bg-muted/30" />
                  </div>
                  <div className="mt-6 h-9 w-full rounded bg-muted/40" />
                </div>
              ))}
            </div>
          ) : showEmptyState ? (
            <div className="rounded-2xl border border-dashed border-border/80 bg-card/70 p-10 text-center">
              <Briefcase className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-xl font-semibold text-foreground">No offers match that filter</h3>
              <p className="mt-2 text-sm text-muted-foreground">
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
                    onClick={() => handleOfferClick(offer.id)}
                    className="group flex h-full flex-col rounded-2xl border border-border bg-card/90 p-6 transition-all hover:-translate-y-1 hover:border-primary hover:shadow-elegant"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleOfferClick(offer.id);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{eventDate}</p>
                        <h3 className="mt-2 text-lg font-semibold text-foreground transition-colors group-hover:text-primary">
                          {offer.title}
                        </h3>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          offer.interest_tag === 'Opérationnel'
                            ? 'bg-success/10 text-success'
                            : 'bg-primary/10 text-primary'
                        }`}
                      >
                        {offer.interest_tag}
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-muted-foreground line-clamp-3">{offer.description}</p>

                    <div className="mt-5 space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        <span className="font-medium text-foreground">{offer.companies?.company_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{offer.events?.name || 'Recruiting event'}</span>
                      </div>
                      {offer.events?.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          <span>{offer.events.location}</span>
                        </div>
                      )}
                    </div>

                    <footer className="mt-6 flex items-center justify-between border-t border-border pt-4 text-sm font-semibold text-primary">
                      <span className="flex items-center gap-2">
                        View details
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </span>
                      <span className="text-xs text-muted-foreground">Tap to continue</span>
                    </footer>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
