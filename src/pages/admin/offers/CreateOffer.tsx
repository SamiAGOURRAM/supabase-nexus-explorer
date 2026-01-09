import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Save } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/contexts/ToastContext';
import LoadingScreen from '@/components/shared/LoadingScreen';

export default function AdminCreateOffer() {
  const { signOut } = useAuth('admin');
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
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
    company_ids: [] as string[],
  });
  const [selectAll, setSelectAll] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoadingData(true);
      
      // Load events
      const { data: eventsData, error: eventsError } = await supabase
        .from('events')
        .select('id, name, date')
        .eq('is_active', true)
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

      // Set default event if available
      if (eventsData && eventsData.length > 0) {
        setFormData(prev => ({ ...prev, event_id: eventsData[0].id }));
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      showError('Failed to load events and companies');
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (formData.company_ids.length === 0) {
        showError('Please select at least one company');
        setLoading(false);
        return;
      }

      // Create offers for all selected companies
      const offers = formData.company_ids.map(company_id => ({
        company_id,
        event_id: formData.event_id,
        title: formData.title,
        description: formData.description,
        interest_tag: formData.interest_tag,
        location: formData.location || null,
        duration_months: formData.duration_months ? parseInt(formData.duration_months) : null,
        salary_range: formData.salary_range || null,
        paid: formData.paid,
        remote_possible: formData.remote_possible,
        skills_required: formData.skills_required ? formData.skills_required.split(',').map(s => s.trim()) : null,
        is_active: true,
      }));

      const { error } = await supabase
        .from('offers')
        .insert(offers);

      if (error) {
        throw error;
      }

      showSuccess(`${formData.company_ids.length} offer(s) created successfully`);
      navigate('/admin/offers');
    } catch (error: any) {
      console.error('Error creating offer:', error);
      showError(error.message || 'Failed to create offer');
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <AdminLayout onSignOut={signOut}>
        <LoadingScreen message="Loading..." />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout onSignOut={signOut}>
      <div className="p-4 sm:p-6 md:p-8">
        <div className="max-w-4xl mx-auto">
          <header className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Link to="/admin/offers" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Create New Offer</h1>
                <p className="text-sm text-muted-foreground mt-1">Create a new internship opportunity</p>
              </div>
            </div>
          </header>

          <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border p-6 space-y-6">
            {/* Company Selection */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Companies <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                <div className="flex items-center gap-2 pb-2 border-b border-border">
                  <input
                    type="checkbox"
                    id="select-all"
                    checked={selectAll}
                    onChange={(e) => {
                      setSelectAll(e.target.checked);
                      if (e.target.checked) {
                        setFormData({ ...formData, company_ids: companies.map(c => c.id) });
                      } else {
                        setFormData({ ...formData, company_ids: [] });
                      }
                    }}
                    className="w-4 h-4 text-primary border-border rounded focus:ring-2 focus:ring-primary"
                  />
                  <label htmlFor="select-all" className="text-sm font-medium text-foreground cursor-pointer">
                    Select All ({companies.length} companies)
                  </label>
                </div>
                <div className="max-h-60 overflow-y-auto border border-border rounded-lg p-3 bg-background space-y-2">
                  {companies.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">No companies available</p>
                  ) : (
                    companies.map(company => (
                      <div key={company.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`company-${company.id}`}
                          checked={formData.company_ids.includes(company.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, company_ids: [...formData.company_ids, company.id] });
                            } else {
                              setFormData({ ...formData, company_ids: formData.company_ids.filter(id => id !== company.id) });
                              setSelectAll(false);
                            }
                          }}
                          className="w-4 h-4 text-primary border-border rounded focus:ring-2 focus:ring-primary"
                        />
                        <label htmlFor={`company-${company.id}`} className="text-sm text-foreground cursor-pointer flex-1">
                          {company.company_name}
                        </label>
                      </div>
                    ))
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.company_ids.length} company(ies) selected
                </p>
              </div>
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
                <option value="Other">Other</option>
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
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Creating...' : 'Create Offer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}

