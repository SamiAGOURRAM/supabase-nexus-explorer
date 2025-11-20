import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Save, Trash2 } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/contexts/ToastContext';
import LoadingScreen from '@/components/shared/LoadingScreen';

export default function AdminEditOffer() {
  const { signOut } = useAuth('admin');
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    interest_tag: 'Opérationnel' as 'Opérationnel' | 'Administratif',
    location: '',
    duration_months: '',
    salary_range: '',
    paid: true,
    remote_possible: false,
    skills_required: '',
    event_id: '',
    company_id: '',
  });
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    loadOffer();
  }, [id]);

  const loadOffer = async () => {
    try {
      setLoading(true);

      // Load events
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('id, name, date')
        .order('date', { ascending: false });
      
      if (eventsError) throw eventsError;
      setEvents(eventsData || []);

      // Load companies
      const { data: companiesData, error: companiesError } = await supabase
        .from('companies')
        .select('id, company_name')
        .order('company_name', { ascending: true });
      
      if (companiesError) throw companiesError;
      setCompanies(companiesData || []);

      if (!id) {
        showError('Offer ID is required');
        navigate('/admin/offers');
        return;
      }

      // Load offer
      const { data: offer, error: offerError } = await supabase
        .from('offers')
        .select('*')
        .eq('id', id)
        .single();

      if (offerError || !offer) {
        throw new Error('Offer not found');
      }

      setFormData({
        title: offer.title,
        description: offer.description,
        interest_tag: offer.interest_tag,
        location: offer.location || '',
        duration_months: offer.duration_months?.toString() || '',
        salary_range: offer.salary_range || '',
        paid: offer.paid ?? true,
        remote_possible: offer.remote_possible ?? false,
        skills_required: offer.skills_required?.join(', ') || '',
        event_id: offer.event_id || '',
        company_id: offer.company_id || '',
      });
    } catch (error: any) {
      console.error('Error loading offer:', error);
      showError(error.message || 'Failed to load offer');
      navigate('/admin/offers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) {
      showError('Offer ID is required');
      return;
    }
    setSaving(true);

    try {
      const { error } = await supabase
        .from('offers')
        .update({
          event_id: formData.event_id,
          company_id: formData.company_id,
          title: formData.title,
          description: formData.description,
          interest_tag: formData.interest_tag,
          location: formData.location || null,
          duration_months: formData.duration_months ? parseInt(formData.duration_months) : null,
          salary_range: formData.salary_range || null,
          paid: formData.paid,
          remote_possible: formData.remote_possible,
          skills_required: formData.skills_required ? formData.skills_required.split(',').map(s => s.trim()) : null,
        })
        .eq('id', id);

      if (error) {
        throw error;
      }

      showSuccess('Offer updated successfully');
      navigate('/admin/offers');
    } catch (error: any) {
      console.error('Error updating offer:', error);
      showError(error.message || 'Failed to update offer');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) {
      showError('Offer ID is required');
      return;
    }
    if (!confirm('Are you sure you want to delete this offer? This action cannot be undone.')) {
      return;
    }
  };

  if (loading) {
    return (
      <AdminLayout onSignOut={signOut}>
        <LoadingScreen message="Loading offer..." />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout onSignOut={signOut}>
      <div className="p-4 sm:p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <header className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <Link to="/admin/offers" className="text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                  <h1 className="text-2xl font-bold text-foreground">Edit Offer</h1>
                  <p className="text-sm text-muted-foreground mt-1">Update internship posting</p>
                </div>
              </div>
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-500/10 rounded-lg transition-colors text-sm font-medium"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </header>

          <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border p-6 space-y-6">
            {/* Company Selection */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Company <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.company_id}
                onChange={(e) => setFormData({ ...formData, company_id: e.target.value })}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select a company</option>
                {companies.map(company => (
                  <option key={company.id} value={company.id}>
                    {company.company_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Event Selection */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Event <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.event_id}
                onChange={(e) => setFormData({ ...formData, event_id: e.target.value })}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select an event</option>
                {events.map(event => (
                  <option key={event.id} value={event.id}>
                    {event.name} - {new Date(event.date).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Job Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g., Software Developer Intern"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={6}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Describe the internship, responsibilities, and what the student will learn..."
              />
            </div>

            {/* Interest Tag */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Interest Tag <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.interest_tag}
                onChange={(e) => setFormData({ ...formData, interest_tag: e.target.value as any })}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="Opérationnel">Opérationnel</option>
                <option value="Administratif">Administratif</option>
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g., Paris, France"
              />
            </div>

            {/* Duration & Salary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Duration (months)
                </label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={formData.duration_months}
                  onChange={(e) => setFormData({ ...formData, duration_months: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="6"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Salary Range
                </label>
                <input
                  type="text"
                  value={formData.salary_range}
                  onChange={(e) => setFormData({ ...formData, salary_range: e.target.value })}
                  className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., €1000-1500/month"
                />
              </div>
            </div>

            {/* Skills */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Required Skills (comma-separated)
              </label>
              <input
                type="text"
                value={formData.skills_required}
                onChange={(e) => setFormData({ ...formData, skills_required: e.target.value })}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="e.g., JavaScript, React, TypeScript"
              />
            </div>

            {/* Checkboxes */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.paid}
                  onChange={(e) => setFormData({ ...formData, paid: e.target.checked })}
                  className="w-4 h-4 text-primary border-border rounded focus:ring-2 focus:ring-primary"
                />
                <span className="text-sm text-foreground">This is a paid internship</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.remote_possible}
                  onChange={(e) => setFormData({ ...formData, remote_possible: e.target.checked })}
                  className="w-4 h-4 text-primary border-border rounded focus:ring-2 focus:ring-primary"
                />
                <span className="text-sm text-foreground">Remote work possible</span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <Link
                to="/admin/offers"
                className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}

