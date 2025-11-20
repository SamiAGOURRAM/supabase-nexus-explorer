import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { Clock, Calendar, User, Building2, Search, X } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAuth } from '@/hooks/useAuth';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import EmptyState from '@/components/shared/EmptyState';
import LoadingTable from '@/components/shared/LoadingTable';

type Booking = {
  id: string;
  student_id: string;
  slot_id: string;
  status: string;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
  };
  event_slots: {
    start_time: string;
    end_time: string;
    companies: {
      company_name: string;
    };
  };
};

export default function AdminBookings() {
  const { signOut } = useAuth('admin');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { showError, showSuccess } = useToast();

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      setError(null);
      setLoading(true);
      // First get all bookings with student info
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select(`
          *,
          profiles!inner (
            full_name,
            email
          ),
          event_slots!inner (
            start_time,
            end_time,
            company_id
          )
        `)
        .eq('status', 'confirmed')
        .order('created_at', { ascending: false });

      if (bookingsError) throw bookingsError;

      if (!bookingsData || bookingsData.length === 0) {
        setBookings([]);
        return;
      }

      // Get unique company IDs
      const companyIds = [...new Set(
        bookingsData
          .map((b: any) => b.event_slots?.company_id)
          .filter(Boolean)
      )];

      // Fetch company names separately
      const { data: companiesData } = await supabase
        .from('companies')
        .select('id, company_name')
        .in('id', companyIds);

      const companiesMap = new Map(companiesData?.map(c => [c.id, c]) || []);

      // Combine the data
      const formattedBookings: Booking[] = bookingsData.map((booking: any) => ({
        id: booking.id,
        student_id: booking.student_id,
        slot_id: booking.slot_id,
        status: booking.status,
        created_at: booking.created_at,
        profiles: booking.profiles,
        event_slots: {
          start_time: booking.event_slots?.start_time || '',
          end_time: booking.event_slots?.end_time || '',
          companies: {
            company_name: companiesMap.get(booking.event_slots?.company_id)?.company_name || 'Unknown Company'
          }
        }
      }));

      setBookings(formattedBookings);
    } catch (err: any) {
      console.error('Error loading bookings:', err);
      const errorMessage = err instanceof Error ? err : new Error('Failed to load bookings');
      setError(errorMessage);
      showError('Failed to load bookings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking?')) {
      return;
    }

    try {
      const { error, data } = await supabase
        .from('bookings')
        .update({ 
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        })
        .eq('id', bookingId)
        .select();

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error('Cancellation failed: You may not have permission to update this booking.');
      }

      showSuccess('Booking cancelled successfully');
      await loadBookings();
    } catch (err: any) {
      console.error('Error cancelling booking:', err);
      showError(err.message || 'Failed to cancel booking');
    }
  };

  const filteredBookings = bookings.filter(booking =>
    booking.profiles.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    booking.profiles.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    booking.event_slots.companies.company_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout onSignOut={signOut}>
      <div className="p-4 sm:p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Bookings Management</h1>
            <p className="text-muted-foreground">View and manage all interview bookings</p>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by student name, email, or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Bookings</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{bookings.length}</p>
                </div>
                <Clock className="w-8 h-8 text-primary" />
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Confirmed</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {bookings.filter(b => b.status === 'confirmed').length}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-success" />
              </div>
            </div>
          </div>

          {/* Bookings List */}
          {error ? (
            <ErrorDisplay error={error} onRetry={loadBookings} />
          ) : loading ? (
            <LoadingTable columns={5} rows={10} />
          ) : filteredBookings.length === 0 ? (
            <EmptyState
              icon={Clock}
              title={searchQuery ? 'No bookings match your search' : 'No bookings yet'}
              message={
                searchQuery 
                  ? 'Try a different search term or clear your filters to see all bookings.' 
                  : 'Bookings will appear here once students start booking interview slots.'
              }
              className="bg-card rounded-xl border border-border p-12"
            />
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto -mx-4 sm:mx-0">
                <table className="w-full min-w-[700px]">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Company
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Time Slot
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredBookings.map((booking) => (
                      <tr key={booking.id} className="hover:bg-muted/50">
                        <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mr-3">
                              <User className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-foreground">{booking.profiles.full_name}</div>
                              <div className="text-xs text-muted-foreground">{booking.profiles.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-foreground">
                            <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
                            {booking.event_slots.companies.company_name}
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          <div className="text-sm text-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(booking.event_slots.start_time).toLocaleDateString()}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {new Date(booking.event_slots.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(booking.event_slots.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            booking.status === 'confirmed'
                              ? 'bg-success/10 text-success'
                              : 'bg-warning/10 text-warning'
                          }`}>
                            {booking.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => handleCancelBooking(booking.id)}
                            className="px-3 py-1.5 bg-destructive/10 text-destructive rounded-lg text-xs font-medium hover:bg-destructive/20 transition-colors flex items-center gap-1"
                          >
                            <X className="w-3 h-3" />
                            Cancel
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-border">
                {filteredBookings.map((booking) => (
                  <div key={booking.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mr-3">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-foreground">{booking.profiles.full_name}</div>
                          <div className="text-xs text-muted-foreground">{booking.profiles.email}</div>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        booking.status === 'confirmed'
                          ? 'bg-success/10 text-success'
                          : 'bg-warning/10 text-warning'
                      }`}>
                        {booking.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center text-foreground">
                        <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
                        <span className="truncate">{booking.event_slots.companies.company_name}</span>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1 text-foreground">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          {new Date(booking.event_slots.start_time).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-muted-foreground ml-4">
                          {new Date(booking.event_slots.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        onClick={() => handleCancelBooking(booking.id)}
                        className="px-3 py-1.5 bg-destructive/10 text-destructive rounded-lg text-xs font-medium hover:bg-destructive/20 transition-colors flex items-center gap-1"
                      >
                        <X className="w-3 h-3" />
                        Cancel Booking
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

