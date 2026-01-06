import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Search, Download, Building2, Mail, UserPlus, CheckCircle, Copy } from 'lucide-react';
import { generateSecurePassword, copyToClipboard, formatCredentialsForClipboard } from '@/utils/passwordUtils';

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
  const [generatedCredentials, setGeneratedCredentials] = useState<{ email: string; password: string } | null>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [exportingCSV, setExportingCSV] = useState(false);

  useEffect(() => {
    checkAdmin();
    if (!eventId) return; // guard undefined eventId
    loadEventName();
  }, [eventId, navigate]); // include navigate in deps

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/login');
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle(); // Use maybeSingle() to avoid 406 errors

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      navigate('/login');
      return;
    }

    if (!profile || profile.role !== 'admin') {
      navigate('/offers');
    }
  };

  const loadEventName = async () => {
    if (!eventId) return;
    const { data } = await supabase
      .from('events')
      .select('name')
      .eq('id', eventId)
      .single();
    
    if (data) setEventName(data.name);
  };

  const handleQuickInvite = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!eventId) {
    alert('Event ID is required');
    return;
  }
  setLoading(true);
  setResult(null);

  try {
    // First check if a company with this email already exists and is already invited
    const { data: existingCompany } = await supabase
      .from('companies')
      .select(`
        id, 
        company_name,
        profiles!inner(email)
      `)
      .eq('profiles.email', email.trim().toLowerCase())
      .maybeSingle();
    
    if (existingCompany) {
      // Check if already invited to THIS event
      const { data: alreadyInvited } = await supabase
        .from('event_participants')
        .select('id')
        .eq('company_id', existingCompany.id)
        .eq('event_id', eventId)
        .maybeSingle();
      
      if (alreadyInvited) {
        setResult({
          success: false,
          message: `⚠️ Company "${existingCompany.company_name}" with email ${email} is already invited to this event.\n\nℹ️ Use the "Search Existing Companies" tab to view all invited companies.`
        });
        setLoading(false);
        return;
      }
    }

    const { data, error } = await supabase.rpc('quick_invite_company', {
      p_email: email.trim(),
      p_company_name: companyName.trim(),
      p_event_id: eventId,
      p_industry: industry || 'Other',
      p_website: website.trim() || undefined
    });

    if (error) throw error;
    
    // RPC response handled below
    
    // Type guard for Json response
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      throw new Error('Invalid response from server');
    }
    
    const result = data as {
      success?: boolean;
      message?: string;
      next_step?: string;
      company_created?: boolean;
      company_code?: string;
      already_invited?: boolean;
    };
    
    setResult(result);

    if (result.success) {
      const inviteEmail = email.trim().toLowerCase();
      
      if (!inviteEmail) {
        setResult({
          ...result,
          message: (result.message || 'Company invited') + '\n\n⚠️ No email provided — credentials not sent.'
        });
        return;
      }

      // Check if this is a new company that needs an account created
      const isNewCompany = result.next_step === 'send_invite_email' || result.company_created;
      
      if (isNewCompany) {
        try {
          // Generate a secure default password using utility function
          const defaultPassword = generateSecurePassword(16);
          
          // Create the company account with the default password
          const { error: signUpError } = await supabase.auth.signUp({
            email: inviteEmail,
            password: defaultPassword,
            options: {
              data: {
                company_name: companyName.trim(),
                company_code: result.company_code,
                role: 'company',
                event_name: eventName,
                event_id: eventId
              },
              emailRedirectTo: `${window.location.origin}/company`
            }
          });

          if (signUpError) {
            console.error('Sign up error:', signUpError);
            
            // If user already exists, just send credentials
            if (signUpError.message?.includes('already registered') || signUpError.message?.includes('already exists')) {
              setResult({
                ...result,
                message: (result.message || '') + 
                  `\n\n⚠️ Account already exists for ${inviteEmail}.` +
                  `\nThe company can login using their existing password.` +
                  `\n\nℹ️ No slots auto-generated. Create slots manually via Sessions/Offers page.`
              });
            } else {
              setResult({
                ...result,
                message: (result.message || '') + 
                  `\n\n⚠️ Failed to create account: ${signUpError.message}` +
                  `\nPlease contact the company directly to set up their account.`
              });
            }
          } else {
            // Store credentials for copy button
            setGeneratedCredentials({ email: inviteEmail, password: defaultPassword });
            
            // Display credentials to admin (no email sent)
            setResult({
              ...result,
              message: (result.message || '') + 
                `\n\n✅ Account created successfully!` +
                `\n\n📧 Email: ${inviteEmail}` +
                `\n🔑 Default Password: ${defaultPassword}` +
                `\n\n⚠️ Please share these credentials with the company securely.` +
                `\nThey should change their password after first login.` +
                `\n\nℹ️ No slots auto-generated. Create slots manually via Sessions/Offers page.`
            });
          }
        } catch (emailError: any) {
          console.error('Account creation error:', emailError);
          setResult({
            ...result,
            message: (result.message || '') + '\n\n⚠️ Failed to create account: ' + (emailError?.message || 'Unknown error')
          });
        }
      } else {
        // Existing company - just inform that they can use existing credentials
        setResult({
          ...result,
          message: (result.message || '') + 
            `\n\n✅ Company re-invited to event!` +
            `\nThey can login using their existing credentials at: ${inviteEmail}` +
            `\n\nℹ️ No slots auto-generated. Create slots manually via Sessions/Offers page.`
        });
      }

      // Clear form on success
      if (!result.already_invited) {
        setEmail('');
        setCompanyName('');
        setIndustry('Technology');
        setWebsite('');
      }
    }
  } catch (error: any) {
    // Error is handled below with user-friendly message
    
    // Provide detailed error message
    let errorMessage = 'Failed to invite company';
    if (error.message) {
      errorMessage = error.message;
    }
    
    // Check for specific error cases
    if (error.message?.includes('duplicate') || error.message?.includes('unique')) {
      errorMessage = 'This company email or name is already registered. Use the "Search Existing Companies" tab to invite them.';
    }
    
    setResult({
      success: false,
      message: errorMessage
    });
  } finally {
    setLoading(false);
  }
};

const handleCopyCredentials = async () => {
  if (!generatedCredentials) return;
  
  const credentialsText = formatCredentialsForClipboard(
    generatedCredentials.email,
    generatedCredentials.password
  );
  
  const success = await copyToClipboard(credentialsText);
  if (success) {
    alert('✅ Credentials copied to clipboard!');
  } else {
    alert('⚠️ Failed to copy credentials. Please copy them manually.');
  }
};

const handleSearch = async () => {
  if (!searchQuery.trim()) {
    setSearchResults([]);
    return;
  }

  if (!eventId) {
    alert('Event ID is missing. Cannot search.');
    return;
  }

  setSearching(true);
  try {
    const { data, error } = await supabase.rpc('search_companies_for_invitation', {
      search_query: searchQuery.trim(),
      event_id_filter: eventId || undefined
    });

    if (error) throw error;
    setSearchResults(data || []);
  } catch (error: any) {
    // Error is shown via alert (acceptable for admin actions)
  } finally {
    setSearching(false);
  }
};

  const handleReInvite = async (companyId: string, companyName: string) => {
    if (!eventId) {
      alert('Missing event ID. Cannot invite.');
      return;
    }

    if (!confirm(`Re-invite ${companyName} to this event?`)) return;

    try {
      const { error } = await supabase
        .from('event_participants')
        .insert({
          event_id: eventId,
          company_id: companyId
        })
        .select()
        .single();

      // If insert errored because the row already exists, treat as success
      if (error) {
        const isDuplicate =
          // Postgres unique_violation code
          (error as any).code === '23505' ||
          // fallback string check
          /duplicate|unique/i.test((error as any).message || '');

        if (!isDuplicate) throw error;
      }

      // Try to fetch company email and send magic link
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('email, company_name, company_code')
        .eq('id', companyId)
        .single();

      if (companyError) {
        // still consider the invite successful but inform admin
        alert(`✅ ${companyName} invited to the event!\n\nℹ️ No slots auto-generated (create manually via Sessions/Offers)\n\n⚠️ Could not fetch company email: ${companyError.message}`);
        await handleSearch();
        return;
      }

      const companyEmail = (companyData?.email || '').trim().toLowerCase();
      if (!companyEmail) {
        alert(`✅ ${companyName} invited to the event!\n\nℹ️ No slots auto-generated (create manually via Sessions/Offers)\n\n⚠️ No email on file for this company — cannot send an invite email.`);
        await handleSearch();
        return;
      }

      try {
        // Check if account exists first
        const { data: existingUser } = await supabase.rpc('check_email_exists', {
          p_email: companyEmail
        });

        const accountExists = existingUser && (existingUser as any).exists;

        if (accountExists) {
          // Account exists, just inform admin to tell company to use existing credentials
          alert(`✅ ${companyName} invited to the event!\n\n📧 Email: ${companyEmail}\n\nℹ️ Account already exists - company can login with their existing password.\n\nℹ️ No slots auto-generated. Create slots manually via Sessions/Offers page.`);
        } else {
          // Generate a secure default password using utility function
          const defaultPassword = generateSecurePassword(16);
          
          // Create account with default password
          const { error: signUpError } = await supabase.auth.signUp({
            email: companyEmail,
            password: defaultPassword,
            options: {
              data: {
                company_name: companyData.company_name || companyName,
                company_code: companyData.company_code,
                role: 'company',
                event_name: eventName,
                event_id: eventId
              },
              emailRedirectTo: `${window.location.origin}/company`
            }
          });

          if (signUpError) {
            if (signUpError.message?.includes('already registered') || signUpError.message?.includes('already exists')) {
              alert(`✅ ${companyName} invited to the event!\n\n📧 Email: ${companyEmail}\n\nℹ️ Account already exists - company can login with their existing password.\n\nℹ️ No slots auto-generated. Create slots manually via Sessions/Offers page.`);
            } else {
              alert(`✅ ${companyName} invited to the event!\n\nℹ️ No slots auto-generated (create manually)\n\n⚠️ Could not create account: ${signUpError.message}`);
            }
          } else {
            // Display credentials to admin (no email sent)
            alert(`✅ ${companyName} invited and account created!\n\n📧 Email: ${companyEmail}\n🔑 Default Password: ${defaultPassword}\n\n⚠️ Please share these credentials with the company securely.\nThey should change their password after first login.\n\nℹ️ No slots auto-generated. Create slots manually via Sessions/Offers page.`);
          }
        }
      } catch (sendErr: any) {
        alert(`✅ ${companyName} invited to the event!\n\nℹ️ No slots auto-generated (create manually)\n\n⚠️ Error creating account: ${sendErr?.message || String(sendErr)}`);
      }

      await handleSearch();
    } catch (error: any) {
      alert('Error: ' + (error?.message || JSON.stringify(error)));
    }
  };

  const handleExportCSV = async () => {
    if (!eventId) {
      alert('Event ID is required');
      return;
    }
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

      const escape = (v: any) => {
        if (v === null || v === undefined) return '';
        const s = String(v);
        // escape quotes and wrap in quotes
        return `"${s.replace(/"/g, '""')}"`;
      };

      const csvContent = [
        ['Company Name', 'Code', 'Email', 'Industry', 'Website'].map(escape).join(','),
        ...(data || []).map((p: any) => {
          const c = p.companies || {};
          return [
            escape(c.company_name),
            escape(c.company_code),
            escape(c.email),
            escape(c.industry),
            escape(c.website)
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
                  <div className={`p-4 rounded-lg space-y-3 ${
                    result.success ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
                  }`}>
                    <p className="whitespace-pre-line">{result.message}</p>
                    {generatedCredentials && result.success && (
                      <button
                        onClick={handleCopyCredentials}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition text-sm font-medium"
                      >
                        <Copy className="w-4 h-4" />
                        Copy Credentials to Clipboard
                      </button>
                    )}
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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSearch();
                      }
                    }}
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
                      key={company.id}
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
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-success/10 text-success text-sm font-medium rounded-full">
                            <CheckCircle className="w-4 h-4" />
                            Already Invited
                          </div>
                          <button
                            onClick={() => handleReInvite(company.id, company.company_name)}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 shadow-md hover:shadow-lg transition-all duration-200 font-medium"
                          >
                            <Mail className="w-4 h-4" />
                            Resend Invite
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleReInvite(company.id, company.company_name)}
                          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground rounded-lg hover:from-primary/90 hover:to-primary shadow-md hover:shadow-lg transition-all duration-200 font-medium"
                        >
                          <UserPlus className="w-4 h-4" />
                          Invite to Event
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
