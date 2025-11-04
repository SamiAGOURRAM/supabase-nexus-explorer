import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Search, Download, Building2 } from 'lucide-react';

export default function QuickInvitePage() {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'new' | 'existing'>('new');
  const [eventName, setEventName] = useState<string>('');
  
  // New company state
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('Technology');
  const [website, setWebsite] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);

  useEffect(() => {
    checkAdmin();
    loadEventName();
  }, [eventId]);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/login');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      navigate('/offers');
    }
  };

  const loadEventName = async () => {
    const { data } = await supabase
      .from('events')
      .select('name')
      .eq('id', eventId)
      .single();
    
    if (data) setEventName(data.name);
  };

  const handleQuickInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.rpc('quick_invite_company', {
        p_email: email.trim(),
        p_company_name: companyName.trim(),
        p_event_id: eventId,
        p_industry: industry || 'Other',
        p_website: website.trim() || null
      });

      if (error) throw error;
      setResult(data);

      if (data.success) {
        if (data.action === 'send_signup_email') {
          try {
            const array = new Uint8Array(24);
            crypto.getRandomValues(array);
            const hexPart = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
            const timestampPart = Date.now().toString(36);
            const tempPassword = hexPart + timestampPart;
            
            const { error: signUpError } = await supabase.auth.signUp({
              email: email.trim().toLowerCase(),
              password: tempPassword,
              options: {
                data: {
                  company_name: companyName.trim(),
                  company_code: data.company_code,
                  role: 'company',
                  event_name: eventName,
                  event_id: eventId
                },
                emailRedirectTo: `${window.location.origin}/company`
              }
            });

            if (signUpError) {
              setResult({
                ...data,
                message: data.message + '\n⚠️ Email error: ' + signUpError.message
              });
            } else {
              setResult({
                ...data,
                message: data.message + '\n\n📧 Invitation email sent!'
              });
            }
          } catch (emailError: any) {
            setResult({
              ...data,
              message: data.message + '\n\n⚠️ Email could not be sent.'
            });
          }
        } else if (data.action === 'send_notification_email') {
          setResult({
            ...data,
            message: data.message + '\n\n✅ Company added to event!'
          });
        }

        if (data.action !== 'use_resend_button') {
          setEmail('');
          setCompanyName('');
          setIndustry('Technology');
          setWebsite('');
        }
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || 'Failed to invite company'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase.rpc('search_companies_for_invitation', {
        query: searchQuery.trim(),
        event_id: eventId
      });

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setSearching(false);
    }
  };

  const handleReInvite = async (companyId: string, companyName: string) => {
    if (!confirm(`Re-invite ${companyName} to this event?`)) return;

    try {
      const { data, error } = await supabase
        .from('event_participants')
        .insert({
          event_id: eventId,
          company_id: companyId
        })
        .select()
        .single();

      if (error) throw error;

      alert(`✅ ${companyName} has been invited to the event!`);
      await handleSearch();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const handleExportCSV = async () => {
    setExportingCSV(true);
    try {
      const { data, error } = await supabase
        .from('event_participants')
        .select(`
          companies:company_id (
            company_name,
            company_code,
            email,
            industry,
            website
          )
        `)
        .eq('event_id', eventId);

      if (error) throw error;

      const csvContent = [
        ['Company Name', 'Code', 'Email', 'Industry', 'Website'].join(','),
        ...(data || []).map((p: any) => {
          const c = p.companies;
          return [
            c.company_name,
            c.company_code,
            c.email || '',
            c.industry || '',
            c.website || ''
          ].join(',');
        })
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `event-companies-${eventId}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setExportingCSV(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link to="/admin/events" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Quick Invite Companies</h1>
              <p className="text-sm text-muted-foreground mt-1">{eventName}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Export Button */}
        <div className="mb-6 flex justify-end">
          <button
            onClick={handleExportCSV}
            disabled={exportingCSV}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition"
          >
            <Download className="w-4 h-4" />
            {exportingCSV ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveTab('new')}
              className={`flex-1 px-6 py-4 font-medium transition-colors ${
                activeTab === 'new'
                  ? 'bg-primary/5 text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              Add New Company
            </button>
            <button
              onClick={() => setActiveTab('existing')}
              className={`flex-1 px-6 py-4 font-medium transition-colors ${
                activeTab === 'existing'
                  ? 'bg-primary/5 text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              Re-invite Existing
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'new' ? (
              <form onSubmit={handleQuickInvite} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Company Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-primary"
                    placeholder="company@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-primary"
                    placeholder="Acme Inc."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Industry
                    </label>
                    <select
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-primary"
                    >
                      <option value="Technology">Technology</option>
                      <option value="Finance">Finance</option>
                      <option value="Healthcare">Healthcare</option>
                      <option value="Retail">Retail</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Website
                    </label>
                    <input
                      type="url"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-primary"
                      placeholder="https://example.com"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition font-medium disabled:opacity-50"
                >
                  {loading ? 'Inviting...' : '⚡ Quick Invite'}
                </button>

                {result && (
                  <div className={`p-4 rounded-lg ${
                    result.success ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                  }`}>
                    <p className="whitespace-pre-line">{result.message}</p>
                  </div>
                )}
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    className="flex-1 px-3 py-2 bg-background border border-border rounded-md focus:ring-2 focus:ring-primary"
                    placeholder="Search by company name, code, or email..."
                  />
                  <button
                    onClick={handleSearch}
                    disabled={searching}
                    className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
                  >
                    <Search className="w-4 h-4" />
                    {searching ? 'Searching...' : 'Search'}
                  </button>
                </div>

                <div className="space-y-3">
                  {searchResults.map((company) => (
                    <div
                      key={company.company_id}
                      className="flex items-center justify-between p-4 bg-muted rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Building2 className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-foreground">{company.company_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {company.company_code} • {company.email}
                          </p>
                          {company.participation_history && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Previous events: {company.participation_history}
                            </p>
                          )}
                        </div>
                      </div>
                      {company.already_invited ? (
                        <span className="px-3 py-1 bg-success/10 text-success text-sm rounded-full">
                          Already Invited
                        </span>
                      ) : (
                        <button
                          onClick={() => handleReInvite(company.company_id, company.company_name)}
                          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition"
                        >
                          Re-invite
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
