import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { Briefcase, Building2, Search, Eye, EyeOff, Trash2 } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAuth } from '@/hooks/useAuth';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import EmptyState from '@/components/shared/EmptyState';
import LoadingTable from '@/components/shared/LoadingTable';

type Offer = {
  id: string;
  title: string;
  description: string;
  interest_tag: string;
  location: string | null;
  is_active: boolean;
  created_at: string;
  companies: {
    company_name: string;
    is_verified: boolean;
  };
};

export default function AdminOffers() {
  const { signOut } = useAuth('admin');
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    loadOffers();
  }, []);

  const loadOffers = async () => {
    try {
      setError(null);
      setLoading(true);
      
      const { data, error } = await supabase
        .from('offers')
        .select(`
          *,
          companies!inner (
            company_name,
            is_verified
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOffers(data || []);
    } catch (err: any) {
      console.error('Error loading offers:', err);
      const errorMessage = err instanceof Error ? err : new Error('Failed to load offers');
      setError(errorMessage);
      showError('Failed to load offers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (offerId: string, currentStatus: boolean) => {
    try {
      setTogglingId(offerId);
      const { error } = await supabase
        .from('offers')
        .update({ is_active: !currentStatus })
        .eq('id', offerId);

      if (error) throw error;
      showSuccess(`Offer ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
      await loadOffers();
    } catch (err: any) {
      console.error('Error updating offer:', err);
      showError(err.message || 'Failed to update offer status. Please try again.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteOffer = async (offerId: string) => {
    if (!confirm('Are you sure you want to delete this offer? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingId(offerId);
      const { error } = await supabase
        .from('offers')
        .delete()
        .eq('id', offerId);

      if (error) throw error;
      showSuccess('Offer deleted successfully');
      await loadOffers();
    } catch (err: any) {
      console.error('Error deleting offer:', err);
      showError(err.message || 'Failed to delete offer. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredOffers = offers.filter(offer => {
    const matchesSearch = 
      offer.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      offer.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      offer.companies.company_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = 
      filterActive === 'all' ||
      (filterActive === 'active' && offer.is_active) ||
      (filterActive === 'inactive' && !offer.is_active);

    return matchesSearch && matchesFilter;
  });

  return (
    <AdminLayout onSignOut={signOut}>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Offers Management</h1>
            <p className="text-muted-foreground">View and manage all internship offers</p>
          </div>

          {/* Filters */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search offers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterActive('all')}
                className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                  filterActive === 'all'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterActive('active')}
                className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                  filterActive === 'active'
                    ? 'bg-success text-success-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setFilterActive('inactive')}
                className={`px-4 py-3 rounded-lg font-medium transition-colors ${
                  filterActive === 'inactive'
                    ? 'bg-warning text-warning-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
              >
                Inactive
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Offers</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{offers.length}</p>
                </div>
                <Briefcase className="w-8 h-8 text-primary" />
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {offers.filter(o => o.is_active).length}
                  </p>
                </div>
                <Eye className="w-8 h-8 text-success" />
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Inactive</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {offers.filter(o => !o.is_active).length}
                  </p>
                </div>
                <EyeOff className="w-8 h-8 text-warning" />
              </div>
            </div>
          </div>

          {/* Offers List */}
          {error ? (
            <ErrorDisplay error={error} onRetry={loadOffers} />
          ) : loading ? (
            <LoadingTable columns={4} rows={10} />
          ) : filteredOffers.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title={searchQuery ? 'No offers match your search' : 'No offers created yet'}
              message={
                searchQuery 
                  ? 'Try a different search term or clear your filters to see all offers.' 
                  : 'Offers will appear here once companies create them for events.'
              }
              className="bg-card rounded-xl border border-border p-12"
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredOffers.map((offer) => (
                <div
                  key={offer.id}
                  className={`bg-card border rounded-xl p-6 ${
                    offer.is_active ? 'border-border' : 'border-warning/30 bg-muted/30'
                  }`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground mb-1">{offer.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building2 className="w-4 h-4" />
                        <span>{offer.companies.company_name}</span>
                        {!offer.companies.is_verified && (
                          <span className="text-xs bg-warning/10 text-warning px-2 py-0.5 rounded">
                            Unverified
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      offer.is_active
                        ? 'bg-success/10 text-success'
                        : 'bg-warning/10 text-warning'
                    }`}>
                      {offer.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {offer.description}
                  </p>

                  <div className="flex items-center gap-2 mb-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      offer.interest_tag === 'Opérationnel'
                        ? 'bg-success/10 text-success'
                        : 'bg-primary/10 text-primary'
                    }`}>
                      {offer.interest_tag}
                    </span>
                    {offer.location && (
                      <span className="text-xs text-muted-foreground">{offer.location}</span>
                    )}
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-border">
                    <button
                      onClick={() => handleToggleActive(offer.id, offer.is_active)}
                      disabled={togglingId === offer.id}
                      className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        offer.is_active
                          ? 'bg-warning/10 text-warning hover:bg-warning/20'
                          : 'bg-success/10 text-success hover:bg-success/20'
                      }`}
                    >
                      {togglingId === offer.id ? (
                        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin inline-block mr-1" />
                      ) : offer.is_active ? (
                        <><EyeOff className="w-3 h-3 inline mr-1" />Deactivate</>
                      ) : (
                        <><Eye className="w-3 h-3 inline mr-1" />Activate</>
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteOffer(offer.id)}
                      disabled={deletingId === offer.id}
                      className="px-3 py-2 bg-destructive/10 text-destructive rounded-lg text-xs font-medium hover:bg-destructive/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                    >
                      {deletingId === offer.id ? (
                        <div className="w-3 h-3 border-2 border-destructive border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

