import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { ArrowLeft, Plus, Search, Edit, Trash2, ToggleLeft, ToggleRight, Briefcase } from 'lucide-react';
import LoadingScreen from '@/components/shared/LoadingScreen';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import EmptyState from '@/components/shared/EmptyState';
import { useAuth } from '@/hooks/useAuth';

type Offer = {
  id: string;
  title: string;
  description: string;
  interest_tag: 'Opérationnel' | 'Administratif';
  location: string | null;
  duration_months: number | null;
  paid: boolean | null;
  remote_possible: boolean | null;
  is_active: boolean;
  skills_required: string[] | null;
  salary_range: string | null;
  bookings_count: number;
  created_at: string;
};

export default function CompanyOffers() {
  const { user, loading: authLoading } = useAuth('company');
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterTag, setFilterTag] = useState<'all' | 'Op?rationnel' | 'Administratif'>('all');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const loadOffers = useCallback(async () => {
    if (!user) return;
    try {
      setError(null);
      setLoading(true);

      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('id')
        .eq('profile_id', user.id)
        .maybeSingle();

      if (companyError) {
        throw new Error(`Failed to load company: ${companyError.message}`);
      }

      if (!company) {
        throw new Error('Company profile not found');
      }

      const { data: offersData, error: offersError } = await supabase
        .from('offers')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false });

      if (offersError) {
        throw new Error(`Failed to load offers: ${offersError.message}`);
      }

      if (offersData) {
        const offersWithBookings = await Promise.all(
          offersData.map(async (offer) => {
            const { data: slots, error: slotsError } = await supabase
              .from('event_slots')
              .select('id')
              .eq('offer_id', offer.id);

            if (slotsError) {
              console.error('Error fetching slots for offer:', offer.id, slotsError);
            }

            const slotIds = slots?.map((s) => s.id) || [];

            let count = 0;
            if (slotIds.length > 0) {
              const { count: bookingCount, error: countError } = await supabase
                .from('bookings')
                .select('*', { count: 'exact', head: true })
                .in('slot_id', slotIds)
                .eq('status', 'confirmed');

              if (countError) {
                console.error('Error counting bookings:', countError);
              }

              count = bookingCount || 0;
            }

            return {
              ...offer,
              bookings_count: count || 0,
            };
          })
        );

        setOffers(offersWithBookings);
      } else {
        setOffers([]);
      }
    } catch (err: any) {
      console.error('Error loading offers:', err);
      const errorMessage = err instanceof Error ? err : new Error('Failed to load offers');
      setError(errorMessage);
      showError('Failed to load offers. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [showError, user]);

  useEffect(() => {
    if (!authLoading) {
      loadOffers();
    }
  }, [authLoading, loadOffers]);

  const toggleOfferStatus = async (offerId: string, currentStatus: boolean) => {
    if (currentStatus) {
      if (!confirm('Are you sure you want to deactivate this offer? Students will no longer be able to view or apply to it.')) {
        return;
      }
    }
    try {
      setTogglingId(offerId);
      const { error } = await supabase
        .from('offers')
        .update({ is_active: !currentStatus })
        .eq('id', offerId);

      if (error) {
        throw new Error(error.message);
      }

      setOffers((prev) =>
        prev.map((offer) =>
          offer.id === offerId ? { ...offer, is_active: !currentStatus } : offer
        )
      );
      showSuccess(`Offer ${currentStatus ? 'deactivated' : 'activated'} successfully`);
    } catch (err: any) {
      console.error('Error toggling offer status:', err);
      showError(err.message || 'Failed to update offer status.');
    } finally {
      setTogglingId(null);
    }
  };

  const deleteOffer = async (offerId: string) => {
    if (!confirm('Are you sure you want to delete this offer? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('offers')
        .delete()
        .eq('id', offerId);

      if (error) {
        throw new Error(error.message);
      }

      setOffers((prev) => prev.filter((offer) => offer.id !== offerId));
      showSuccess('Offer deleted successfully');
    } catch (err: any) {
      console.error('Error deleting offer:', err);
      showError(err.message || 'Failed to delete offer.');
    }
  };

  const filteredOffers = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    return offers.filter((offer) => {
      const matchesSearch =
        query.length === 0 ||
        offer.title.toLowerCase().includes(query) ||
        offer.description.toLowerCase().includes(query);
      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'active' && offer.is_active) ||
        (filterStatus === 'inactive' && !offer.is_active);
      const matchesTag = filterTag === 'all' || offer.interest_tag === filterTag;
      return matchesSearch && matchesStatus && matchesTag;
    });
  }, [filterStatus, filterTag, offers, searchQuery]);

  const stats = useMemo(() => {
    return {
      total: offers.length,
      active: offers.filter((offer) => offer.is_active).length,
      inactive: offers.filter((offer) => !offer.is_active).length,
      totalBookings: offers.reduce((sum, offer) => sum + offer.bookings_count, 0),
    };
  }, [offers]);

  if (authLoading) {
    return <LoadingScreen message="Loading your workspace..." />;
  }

  if (loading) {
    return <LoadingScreen message="Loading offers..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-xl">
          <ErrorDisplay error={error} onRetry={loadOffers} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/company" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Manage Offers</h1>
                <p className="text-sm text-muted-foreground mt-1">Create and manage your job postings</p>
              </div>
            </div>
            <Link
              to="/company/offers/new"
              className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Create Offer
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Total Offers</p>
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Active</p>
            <p className="text-2xl font-bold text-green-600">{stats.active}</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Inactive</p>
            <p className="text-2xl font-bold text-muted-foreground">{stats.inactive}</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Total Bookings</p>
            <p className="text-2xl font-bold text-primary">{stats.totalBookings}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-card rounded-lg border border-border p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search offers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <select
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value as any)}
                className="px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All Tags</option>
                <option value="Opérationnel">Opérationnel</option>
                <option value="Administratif">Administratif</option>
              </select>
            </div>
          </div>
        </div>

        {/* Offers List */}
        {filteredOffers.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title={offers.length === 0 ? 'No offers yet' : 'No offers match your filters'}
            message={
              offers.length === 0
                ? 'Create your first offer to start recruiting.'
                : 'Try adjusting your search or filters to see more results.'
            }
            action={
              offers.length === 0 ? (
                <Link
                  to="/company/offers/new"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Create Your First Offer
                </Link>
              ) : undefined
            }
            className="bg-card rounded-xl border border-border"
          />
        ) : (
          <div className="space-y-4">
            {filteredOffers.map((offer) => (
              <div key={offer.id} className="bg-card rounded-lg border border-border p-6 hover:border-primary/50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-foreground">{offer.title}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        offer.interest_tag === 'Opérationnel'
                          ? 'bg-blue-500/20 text-blue-600'
                          : 'bg-purple-500/20 text-purple-600'
                      }`}>
                        {offer.interest_tag}
                      </span>
                      {offer.is_active ? (
                        <span className="px-2 py-1 bg-green-500/20 text-green-600 text-xs font-medium rounded">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-muted text-muted-foreground text-xs font-medium rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{offer.description}</p>
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                      {offer.location && <span>📍 {offer.location}</span>}
                      {offer.duration_months && <span>⏱️ {offer.duration_months} months</span>}
                      {offer.paid !== null && <span>{offer.paid ? '💰 Paid' : '🎓 Unpaid'}</span>}
                      {offer.remote_possible && <span>🏠 Remote</span>}
                      <span>📊 {offer.bookings_count} booking{offer.bookings_count !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleOfferStatus(offer.id, offer.is_active)}
                      disabled={togglingId === offer.id}
                      className={`p-2 text-muted-foreground hover:text-foreground hover:bg-background rounded-lg transition-colors ${
                        togglingId === offer.id ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      title={offer.is_active ? 'Deactivate' : 'Activate'}
                    >
                      {offer.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                    <Link
                      to={`/company/offers/${offer.id}/edit`}
                      className="p-2 text-muted-foreground hover:text-foreground hover:bg-background rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-5 h-5" />
                    </Link>
                    <button
                      onClick={() => deleteOffer(offer.id)}
                      className="p-2 text-muted-foreground hover:text-red-600 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

