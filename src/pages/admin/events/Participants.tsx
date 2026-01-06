import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Users } from 'lucide-react';
import { generateSecurePassword } from '@/utils/passwordUtils';

interface Participant {
  id: string;
  company_id: string;
  invited_at: string;
  companies: {
    id: string;
    company_name: string;
    company_code: string;
    email?: string;
    industry: string;
    website?: string;
    profile_id?: string | null;
    hasLoggedIn?: boolean;
  };
}

export default function EventParticipantsPage() {
  const { id: eventId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [event, setEvent] = useState<any>(null);
  const [eventName, setEventName] = useState<string>('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    checkAdmin();
    loadData();
  }, [eventId]);

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

  const loadData = async () => {
    if (!eventId) return;
    try {
      setLoading(true);
      setError('');

      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('id, name, date')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;
      setEvent(eventData);
      setEventName(eventData.name);

      const { data: participantsData, error: participantsError } = await supabase
        .from('event_participants')
        .select(`
          id,
          company_id,
          invited_at,
          companies!inner (
            id,
            company_name,
            company_code,
            email,
            industry,
            website,
            profile_id
          )
        `)
        .eq('event_id', eventId)
        .order('invited_at', { ascending: false });

      if (participantsError) throw participantsError;

      const enrichedData = (participantsData || []).map((p: any) => ({
        ...p,
        companies: {
          ...p.companies,
          hasLoggedIn: p.companies.profile_id !== null
        }
      }));

      setParticipants(enrichedData as any);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError(err.message || 'Failed to load participants');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveParticipant = async (participantId: string, companyName: string) => {
    if (!confirm(`Remove ${companyName} from this event?\n\nThis will also delete all their interview slots.`)) {
      return;
    }

    try {
      const { error: deleteError } = await supabase
        .from('event_participants')
        .delete()
        .eq('id', participantId);

      if (deleteError) throw deleteError;

      alert(`✅ Removed ${companyName} from event`);
      await loadData();
    } catch (err: any) {
      console.error('Error removing participant:', err);
      alert('Failed to remove participant: ' + err.message);
    }
  };

  const handleResendInvite = async (company: any) => {
    if (!company.email || company.email === 'No email') {
      alert('Cannot resend: No email found for this company');
      return;
    }

    if (confirm(`Send/Reset credentials for ${company.email}?`)) {
      try {
        // Generate a secure default password using utility function
        const defaultPassword = generateSecurePassword(16);

        const { error: signUpError } = await supabase.auth.signUp({
          email: company.email.toLowerCase(),
          password: defaultPassword,
          options: {
            data: {
              company_name: company.company_name,
              company_code: company.company_code,
              role: 'company',
              event_name: eventName,
              event_id: eventId
            },
            emailRedirectTo: `${window.location.origin}/company`
          }
        });

        if (signUpError) {
          // Check if account already exists
          if (signUpError.message?.includes('already registered') || signUpError.message?.includes('already exists')) {
            alert(`⚠️ Account already exists for ${company.email}.\n\nThe company can login using their existing password.\n\nIf they forgot their password, they can use the "Forgot Password" link on the login page.`);
          } else {
            alert('Error creating/updating account: ' + signUpError.message);
          }
        } else {
          // Display credentials to admin (no email sent)
          alert(`✅ Account credentials created!\n\n📧 Email: ${company.email}\n🔑 Default Password: ${defaultPassword}\n\n⚠️ Please share these credentials with the company securely.\nThey should change their password after first login.`);
        }
      } catch (err: any) {
        alert('Failed to create account: ' + err.message);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading participants...</p>
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
              <Link to="/admin/events" className="text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Event Participants</h1>
                {event && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {event.name} • {new Date(event.date).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
            <Link
              to={`/admin/events/${eventId}/quick-invite`}
              className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition font-semibold"
            >
              ⚡ Quick Invite Companies
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
            {error}
          </div>
        )}

        <div className="bg-card rounded-xl border border-border">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">
              Invited Companies ({participants.length})
            </h2>
          </div>

          {participants.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground text-lg mb-4">No companies invited yet</p>
              <Link
                to={`/admin/events/${eventId}/quick-invite`}
                className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition font-semibold"
              >
                ⚡ Invite Your First Company
              </Link>
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted">
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Company</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Code</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Email</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Industry</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Status</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Invited At</th>
                      <th className="text-right py-3 px-4 font-semibold text-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {participants.map(participant => {
                      if (!participant.companies) return null;
                      const company = participant.companies;
                      
                      return (
                        <tr key={participant.id} className="border-b hover:bg-muted/50 transition">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-semibold text-foreground">{company.company_name}</p>
                              {company.website && (
                                <a 
                                  href={company.website} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary hover:underline"
                                >
                                  {company.website}
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                              {company.company_code}
                            </code>
                          </td>
                          <td className="py-3 px-4 text-sm text-muted-foreground">
                            {company.email || 'No email'}
                          </td>
                          <td className="py-3 px-4 text-sm text-muted-foreground">
                            {company.industry || '-'}
                          </td>
                          <td className="py-3 px-4">
                            {company.hasLoggedIn ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                                ✓ Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning">
                                ⏳ Pending
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-muted-foreground">
                            {new Date(participant.invited_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {!company.hasLoggedIn && (
                                <button
                                  onClick={() => handleResendInvite(company)}
                                  className="text-primary hover:text-primary/80 text-sm font-medium hover:underline"
                                >
                                  📧 Resend
                                </button>
                              )}
                              <button
                                onClick={() => handleRemoveParticipant(participant.id, company.company_name)}
                                className="text-destructive hover:text-destructive/80 text-sm font-medium hover:underline"
                              >
                                Remove
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden divide-y divide-border">
                {participants.map(participant => {
                  if (!participant.companies) return null;
                  const company = participant.companies;
                  
                  return (
                    <div key={participant.id} className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-foreground">{company.company_name}</p>
                          <code className="text-xs bg-muted px-2 py-1 rounded font-mono mt-1 inline-block">
                            {company.company_code}
                          </code>
                        </div>
                        {company.hasLoggedIn ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">
                            ✓ Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning">
                            ⏳ Pending
                          </span>
                        )}
                      </div>

                      <div className="text-sm space-y-1">
                        <p className="text-muted-foreground">
                          <span className="font-medium text-foreground">Email:</span> {company.email || 'No email'}
                        </p>
                        <p className="text-muted-foreground">
                          <span className="font-medium text-foreground">Industry:</span> {company.industry || '-'}
                        </p>
                        {company.website && (
                          <p>
                            <a 
                              href={company.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              {company.website}
                            </a>
                          </p>
                        )}
                      </div>

                      <div className="pt-2 flex justify-end gap-3 border-t border-border mt-2">
                        {!company.hasLoggedIn && (
                          <button
                            onClick={() => handleResendInvite(company)}
                            className="text-primary hover:text-primary/80 text-sm font-medium"
                          >
                            📧 Resend Invite
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveParticipant(participant.id, company.company_name)}
                          className="text-destructive hover:text-destructive/80 text-sm font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
