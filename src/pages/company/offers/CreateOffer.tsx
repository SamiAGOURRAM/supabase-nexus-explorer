import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Save } from 'lucide-react';
import CompanyLayout from '@/components/company/CompanyLayout';
import { useAuth } from '@/hooks/useAuth';

export default function CreateOffer() {
  const { user } = useAuth('company');
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
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
  });
  const navigate = useNavigate();
  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    const { data } = await supabase
      .from('events')
      .select('id, name, date')
      .eq('is_active', true)
      .order('date', { ascending: false });
    
    if (data) {
      setEvents(data);
      if (data.length > 0) {
        setFormData(prev => ({ ...prev, event_id: data[0].id }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/login');
      return;
    }

    const { data: company } = await supabase
      .from('companies')
      .select('id')
      .eq('profile_id', user.id)
      .single();

    if (!company) {
      alert('Company not found');
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('offers')
      .insert({
        company_id: company.id,
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
      });

    if (error) {
      alert('Error creating offer: ' + error.message);
      setLoading(false);
      return;
    }

    navigate('/company/offers');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <CompanyLayout onSignOut={handleSignOut}>
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-6">
            <Link to="/company/offers" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors">
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Offers</span>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Create New Offer</h1>
              <p className="text-sm text-gray-600 mt-2">Post a new internship opportunity</p>
            </div>
          </div>
        </div>

        <main className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-12 py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 space-y-6">
          {/* Event Selection */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Event <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.event_id}
              onChange={(e) => setFormData({ ...formData, event_id: e.target.value })}
              className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#007e40] focus:border-[#007e40] transition-colors"
            >
              <option value="">Select an event</option>
              {events.map(event => (
                <option key={event.id} value={event.id}>
                  {event.name} - {new Date(event.date).toLocaleDateString()}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1.5">
              Select which recruiting event this offer is for
            </p>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Job Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#007e40] focus:border-[#007e40] transition-colors"
              placeholder="e.g., Software Developer Intern"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={6}
              className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#007e40] focus:border-[#007e40] transition-colors"
              placeholder="Describe the internship, responsibilities, and what the student will learn..."
            />
          </div>

          {/* Interest Tag */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Interest Tag <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={formData.interest_tag}
              onChange={(e) => setFormData({ ...formData, interest_tag: e.target.value as any })}
              className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#007e40] focus:border-[#007e40] transition-colors"
            >
              <option value="Opérationnel">Opérationnel</option>
              <option value="Administratif">Administratif</option>
            </select>
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#007e40] focus:border-[#007e40] transition-colors"
              placeholder="e.g., Paris, France"
            />
          </div>

          {/* Duration & Salary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Duration (months) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="1"
                max="24"
                value={formData.duration_months}
                onChange={(e) => setFormData({ ...formData, duration_months: e.target.value })}
                className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#007e40] focus:border-[#007e40] transition-colors"
                placeholder="6"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Salary Range
              </label>
              <input
                type="text"
                value={formData.salary_range}
                onChange={(e) => setFormData({ ...formData, salary_range: e.target.value })}
                className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#007e40] focus:border-[#007e40] transition-colors"
                placeholder="e.g., €1000-1500/month"
              />
            </div>
          </div>

          {/* Skills */}
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Required Skills (comma-separated)
            </label>
            <input
              type="text"
              value={formData.skills_required}
              onChange={(e) => setFormData({ ...formData, skills_required: e.target.value })}
              className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#007e40] focus:border-[#007e40] transition-colors"
              placeholder="e.g., JavaScript, React, TypeScript"
            />
          </div>

          {/* Checkboxes */}
          <div className="space-y-3 pt-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.paid}
                onChange={(e) => setFormData({ ...formData, paid: e.target.checked })}
                className="w-4 h-4 text-[#007e40] border-gray-300 rounded focus:ring-2 focus:ring-[#007e40]"
              />
              <span className="text-sm font-medium text-gray-900">This is a paid internship</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.remote_possible}
                onChange={(e) => setFormData({ ...formData, remote_possible: e.target.checked })}
                className="w-4 h-4 text-[#007e40] border-gray-300 rounded focus:ring-2 focus:ring-[#007e40]"
              />
              <span className="text-sm font-medium text-gray-900">Remote work possible</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
            <Link
              to="/company/offers"
              className="px-6 py-2.5 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#007e40] text-white rounded-lg hover:bg-[#006835] transition-colors text-sm font-semibold shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Creating...' : 'Create Offer'}
            </button>
          </div>
        </form>
        </main>
      </div>
    </CompanyLayout>
  );
}
