import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Search, Users, FileText } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import LoadingScreen from '@/components/shared/LoadingScreen';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import EmptyState from '@/components/shared/EmptyState';
import { useAuth } from '@/hooks/useAuth';
import { debug, warn as logWarn, error as logError } from '@/utils/logger';

type StudentBooking = {
  booking_id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  student_phone: string | null;
  student_number: string | null;
  specialization: string | null;
  graduation_year: number | null;
  cv_url: string | null;
  resume_url: string | null;
  offer_title: string;
  slot_time: string;
  status: string;
};

export default function CompanyStudents() {
  const { user, loading: authLoading } = useAuth('company');
  const { showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentBooking[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<Error | null>(null);
  const [profiles, setProfiles] = useState<any[]>([]);

  const loadStudents = useCallback(async () => {
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
        setStudents([]);
        return;
      }

      // Get all slots directly for this company (slots have company_id)
      const { data: slots, error: slotsError } = await supabase
        .from('event_slots')
        .select('id, start_time, offer_id, company_id')
        .eq('company_id', company.id);

      if (slotsError) {
        throw new Error(`Failed to load slots: ${slotsError.message}`);
      }

      if (!slots || slots.length === 0) {
        debug('📊 No slots found for company:', company.id);
        setStudents([]);
        return;
      }

      debug('📊 Found slots for company:', slots.length);

      const slotIds = slots.map((s) => s.id);
      
      // Get all unique offer IDs from slots
      const offerIds = [...new Set(slots.map((s) => s.offer_id).filter((id): id is string => Boolean(id)))];
      
      // Get offer titles
      let offerMap = new Map<string, string>();
      if (offerIds.length > 0) {
        const { data: offers, error: offersError } = await supabase
          .from('offers')
          .select('id, title')
          .in('id', offerIds);

        if (offersError) {
          logWarn('Failed to load offers:', offersError);
        } else if (offers) {
          offerMap = new Map(offers.map((o) => [o.id, o.title]));
        }
      }

      const slotMap = new Map(slots.map((s) => [s.id, { time: s.start_time, offer_id: s.offer_id }]));

      // Get bookings for these slots
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, student_id, slot_id, status')
        .in('slot_id', slotIds)
        .eq('status', 'confirmed'); // Only show confirmed bookings

      if (bookingsError) {
        throw new Error(`Failed to load bookings: ${bookingsError.message}`);
      }

      if (!bookings || bookings.length === 0) {
        debug('📊 No bookings found for company slots');
        setStudents([]);
        return;
      }

      debug('📊 Found bookings:', bookings.length);

      const studentIds = [...new Set(bookings.map((b) => b.student_id))];
      
      // Get all student profile information for companies to view
      let profiles: any[] = [];
      if (studentIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, email, phone, student_number, specialization, graduation_year, cv_url, profile_photo_url, languages_spoken, program, biography, linkedin_url, resume_url, year_of_study, created_at')
          .in('id', studentIds)
          .eq('role', 'student'); // Ensure we only get students

        if (profilesError) {
          throw new Error(`Failed to load student profiles: ${profilesError.message}`);
        }

        profiles = profilesData || [];
      }

      // Store profiles for later use in rendering
      setProfiles(profiles);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      const studentsData: StudentBooking[] = bookings.map((booking) => {
        const profile = profileMap.get(booking.student_id);
        const slotInfo = slotMap.get(booking.slot_id);
        const offerId = slotInfo?.offer_id;
        
        return {
          booking_id: booking.id,
          student_id: booking.student_id,
          student_name: profile?.full_name || 'Unknown',
          student_email: profile?.email || '',
          student_phone: profile?.phone || null,
          student_number: profile?.student_number || null,
          specialization: profile?.specialization || null,
          graduation_year: profile?.graduation_year || null,
          cv_url: profile?.cv_url || null,
          resume_url: profile?.resume_url || null,
          offer_title: offerId ? (offerMap.get(offerId) || 'Unknown') : 'Unknown',
          slot_time: slotInfo?.time || '',
          status: booking.status,
        };
      });

      studentsData.sort(
        (a, b) => new Date(b.slot_time).getTime() - new Date(a.slot_time).getTime()
      );

      // Debug logging (development only)
      debug('📊 Company Students Data:', {
        companyId: company.id,
        slotsCount: slots.length,
        offerIdsCount: offerIds.length,
        bookingsCount: bookings.length,
        studentsCount: studentIds.length,
        profilesCount: profiles.length,
        studentsDataCount: studentsData.length,
        sampleStudent: studentsData[0] || null,
        sampleBooking: bookings[0] || null,
        sampleSlot: slots[0] || null
      });

      setStudents(studentsData);
    } catch (err: any) {
      logError('Error loading students:', err);
      const errorMessage = err instanceof Error ? err : new Error('Failed to load students');
      setError(errorMessage);
      showError('Failed to load students. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [showError, user]);

  useEffect(() => {
    if (!authLoading) {
      loadStudents();
    }
  }, [authLoading, loadStudents]);

  const filteredStudents = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return students;

    return students.filter((student) => {
      return (
        student.student_name.toLowerCase().includes(query) ||
        student.student_email.toLowerCase().includes(query) ||
        student.offer_title.toLowerCase().includes(query) ||
        (student.student_number && student.student_number.toLowerCase().includes(query))
      );
    });
  }, [searchQuery, students]);

  const stats = useMemo(() => {
    return {
      unique: new Set(students.map((s) => s.student_id)).size,
      confirmed: students.filter((s) => s.status === 'confirmed').length,
      total: students.length,
    };
  }, [students]);

  if (authLoading) {
    return <LoadingScreen message="Loading student data..." />;
  }

  if (loading) {
    return <LoadingScreen message="Loading student data..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-xl">
          <ErrorDisplay error={error} onRetry={loadStudents} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link to="/company" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Students</h1>
              <p className="text-sm text-muted-foreground mt-1">View students who booked interviews</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Unique Students</p>
            <p className="text-2xl font-bold text-foreground">{stats.unique}</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Confirmed Bookings</p>
            <p className="text-2xl font-bold text-green-600">{stats.confirmed}</p>
          </div>
          <div className="bg-card rounded-lg border border-border p-4">
            <p className="text-sm text-muted-foreground">Total Bookings</p>
            <p className="text-2xl font-bold text-primary">{stats.total}</p>
          </div>
        </div>

        {/* Search */}
        <div className="bg-card rounded-lg border border-border p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search students by name, email, or student number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Students List */}
        {filteredStudents.length === 0 ? (
          <EmptyState
            icon={Users}
            title={students.length === 0 ? 'No students yet' : 'No students match your search'}
            message={
              students.length === 0
                ? 'Students will appear here once they book interviews.'
                : 'Try a different search term.'
            }
            className="bg-card rounded-xl border border-border"
          />
        ) : (
          <div className="bg-card rounded-lg border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Student</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Contact</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Academic</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Offer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Interview</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredStudents.map((student) => (
                    <tr key={student.booking_id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {profiles.find((p: any) => p.id === student.student_id)?.profile_photo_url ? (
                            <img
                              src={profiles.find((p: any) => p.id === student.student_id)?.profile_photo_url}
                              alt={student.student_name}
                              className="w-8 h-8 rounded-lg object-cover flex-shrink-0 border border-border"
                            />
                          ) : null}
                          <div>
                            <Link
                              to={`/company/students/${student.student_id}`}
                              className="font-medium text-foreground hover:text-primary transition-colors"
                            >
                              {student.student_name}
                            </Link>
                            {student.student_number && (
                              <p className="text-xs text-muted-foreground mt-0.5">{student.student_number}</p>
                            )}
                            {profiles.find((p: any) => p.id === student.student_id)?.program && (
                              <p className="text-xs text-muted-foreground mt-0.5">{profiles.find((p: any) => p.id === student.student_id)?.program}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-foreground">{student.student_email}</p>
                        {student.student_phone && (
                          <p className="text-xs text-muted-foreground mt-1">{student.student_phone}</p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        {student.specialization && (
                          <p className="text-sm text-foreground">{student.specialization}</p>
                        )}
                        {student.graduation_year && (
                          <p className="text-xs text-muted-foreground mt-1">Class of {student.graduation_year}</p>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-foreground">{student.offer_title}</p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm text-foreground">
                          {new Date(student.slot_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(student.slot_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {(student.cv_url || student.resume_url) ? (
                            <a
                              href={student.resume_url || student.cv_url || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                              title="View CV/Resume"
                            >
                              <FileText className="w-4 h-4" />
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">No CV</span>
                          )}
                          <Link
                            to={`/company/students/${student.student_id}`}
                            className="text-xs text-primary hover:text-primary/80 transition-colors"
                          >
                            View Profile
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
