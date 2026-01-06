import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Search, Users, FileText, Filter } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import LoadingScreen from '@/components/shared/LoadingScreen';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import EmptyState from '@/components/shared/EmptyState';
import Pagination from '@/components/shared/Pagination';
import CompanyLayout from '@/components/company/CompanyLayout';
import { useAuth } from '@/hooks/useAuth';
import { warn as logWarn, error as logError } from '@/utils/logger';

type StudentBooking = {
  booking_id: string | null;
  student_id: string;
  student_name: string;
  student_email: string;
  student_phone: string | null;
  student_number: string | null;
  specialization: string | null;
  graduation_year: number | null;
  program: string | null;
  year_of_study: number | null;
  cv_url: string | null;
  resume_url: string | null;
  offer_title: string | null;
  slot_time: string | null;
  status: string | null;
  linkedin_url: string | null;
  biography: string | null;
};

export default function CompanyStudents() {
  const { user, loading: authLoading, signOut } = useAuth('company');
  const { showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentBooking[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProgram, setFilterProgram] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterGraduationYear, setFilterGraduationYear] = useState<string>('all');
  const [error, setError] = useState<Error | null>(null);
  const [profiles, setProfiles] = useState<any[]>([]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const loadStudents = useCallback(async () => {
    if (!user) return;
    try {
      setError(null);
      setLoading(true);

      // Get ALL student profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, phone, student_number, specialization, graduation_year, cv_url, profile_photo_url, languages_spoken, program, biography, linkedin_url, resume_url, year_of_study, created_at')
        .eq('role', 'student')
        .order('full_name', { ascending: true });

      if (profilesError) {
        throw new Error(`Failed to load student profiles: ${profilesError.message}`);
      }

      if (!profilesData || profilesData.length === 0) {
        setStudents([]);
        setProfiles([]);
        return;
      }

      // Store profiles for later use in rendering
      setProfiles(profilesData);

      // Get company info for bookings (optional - to show if they have booked with you)
      const { data: company } = await supabase
        .from('companies')
        .select('id')
        .eq('profile_id', user.id)
        .maybeSingle();

      // Get bookings info if company exists
      let bookingsMap = new Map<string, { booking_id: string; slot_time: string; offer_title: string }>();
      if (company) {
        const { data: slots } = await supabase
          .from('event_slots')
          .select('id, start_time, offer_id')
          .eq('company_id', company.id);

        if (slots && slots.length > 0) {
          const slotIds = slots.map(s => s.id);
          const offerIds = [...new Set(slots.map(s => s.offer_id).filter(Boolean))];

          // Get offer titles
          let offerMap = new Map<string, string>();
          if (offerIds.length > 0) {
            const { data: offers } = await supabase
              .from('offers')
              .select('id, title')
              .in('id', offerIds);
            if (offers) {
              offerMap = new Map(offers.map(o => [o.id, o.title]));
            }
          }

          const { data: bookings } = await supabase
            .from('bookings')
            .select('id, student_id, slot_id, status')
            .in('slot_id', slotIds)
            .eq('status', 'confirmed');

          if (bookings) {
            bookings.forEach(booking => {
              const slot = slots.find(s => s.id === booking.slot_id);
              if (slot) {
                bookingsMap.set(booking.student_id, {
                  booking_id: booking.id,
                  slot_time: slot.start_time,
                  offer_title: slot.offer_id ? (offerMap.get(slot.offer_id) || 'Unknown Offer') : 'Unknown Offer'
                });
              }
            });
          }
        }
      }

      // Map all students
      const studentsData: StudentBooking[] = profilesData.map((profile) => {
        const bookingInfo = bookingsMap.get(profile.id);
        
        return {
          booking_id: bookingInfo?.booking_id || null,
          student_id: profile.id,
          student_name: profile.full_name || 'Unknown',
          student_email: profile.email || '',
          student_phone: profile.phone || null,
          student_number: profile.student_number || null,
          specialization: profile.specialization || null,
          graduation_year: profile.graduation_year || null,
          program: profile.program || null,
          year_of_study: profile.year_of_study || null,
          cv_url: profile.cv_url || null,
          resume_url: profile.resume_url || null,
          offer_title: bookingInfo?.offer_title || null,
          slot_time: bookingInfo?.slot_time || null,
          status: bookingInfo ? 'confirmed' : null,
          linkedin_url: profile.linkedin_url || null,
          biography: profile.biography || null,
        };
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
    let filtered = students;

    // Search filter
    const query = searchQuery.toLowerCase().trim();
    if (query) {
      filtered = filtered.filter((student) => {
        return (
          student.student_name.toLowerCase().includes(query) ||
          student.student_email.toLowerCase().includes(query) ||
          student.offer_title.toLowerCase().includes(query) ||
          (student.student_number && student.student_number.toLowerCase().includes(query))
        );
      });
    }

    // Program filter
    if (filterProgram !== 'all') {
      filtered = filtered.filter((student) => student.program === filterProgram);
    }

    // Year of study filter
    if (filterYear !== 'all') {
      filtered = filtered.filter((student) => student.year_of_study === parseInt(filterYear));
    }

    // Graduation year filter
    if (filterGraduationYear !== 'all') {
      filtered = filtered.filter((student) => student.graduation_year === parseInt(filterGraduationYear));
    }

    return filtered;
  }, [searchQuery, filterProgram, filterYear, filterGraduationYear, students]);

  // Get unique values for filters
  const uniquePrograms = useMemo(() => {
    return Array.from(new Set(students.map(s => s.program).filter(Boolean))) as string[];
  }, [students]);

  const uniqueYears = useMemo(() => {
    return Array.from(
      new Set(
        students
          .map((s) => s.year_of_study)
          .filter((year): year is number => year !== null && year !== undefined)
      )
    ).sort((a, b) => a - b);
  }, [students]);

  const uniqueGraduationYears = useMemo(() => {
    return Array.from(
      new Set(
        students
          .map((s) => s.graduation_year)
          .filter((year): year is number => year !== null && year !== undefined)
      )
    ).sort((a, b) => a - b);
  }, [students]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterProgram, filterYear, filterGraduationYear]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

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
      <CompanyLayout onSignOut={signOut}>
        <div className="p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <ErrorDisplay error={error} onRetry={loadStudents} />
          </div>
        </div>
      </CompanyLayout>
    );
  }

  return (
    <CompanyLayout onSignOut={signOut}>
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <section className="bg-[#1a1f3a] border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-12">
            <h1 className="text-3xl font-bold text-white mb-2">
              All Students
            </h1>
            <p className="text-white/70">
              Browse all student profiles and candidates
            </p>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="text-2xl font-bold text-gray-900 mb-1">{stats.unique}</div>
                <div className="text-sm text-gray-600">Unique Students</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="text-2xl font-bold text-gray-900 mb-1">{stats.confirmed}</div>
                <div className="text-sm text-gray-600">Confirmed Bookings</div>
              </div>
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="text-2xl font-bold text-gray-900 mb-1">{stats.total}</div>
                <div className="text-sm text-gray-600">Total Bookings</div>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-8 space-y-6">

          {/* Search and Filters */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search students by name, email, or student number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#007e40] focus:border-transparent"
              />
            </div>
            
            {/* Filters */}
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-900">Filters:</span>
              </div>
              
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Program
                </label>
                <select
                  value={filterProgram}
                  onChange={(e) => setFilterProgram(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#007e40] focus:border-transparent"
                >
                  <option value="all">All Programs</option>
                  {uniquePrograms.map((program) => (
                    <option key={program} value={program}>
                      {program}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Year of Study
                </label>
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">All Years</option>
                  {uniqueYears.map((year) => (
                    <option key={year} value={year.toString()}>
                      Year {year}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex-1 min-w-[150px]">
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Graduation Year
                </label>
                <select
                  value={filterGraduationYear}
                  onChange={(e) => setFilterGraduationYear(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">All Years</option>
                  {uniqueGraduationYears.map((year) => (
                    <option key={year} value={year.toString()}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              {(filterProgram !== 'all' || filterYear !== 'all' || filterGraduationYear !== 'all') && (
                <button
                  onClick={() => {
                    setFilterProgram('all');
                    setFilterYear('all');
                    setFilterGraduationYear('all');
                  }}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
          </div>

          {/* Students List */}
        {filteredStudents.length === 0 ? (
          <EmptyState
            icon={Users}
            title={students.length === 0 ? 'No students found' : 'No students match your search'}
            message={
              students.length === 0
                ? 'No student profiles are available at the moment.'
                : 'Try adjusting your search or filters.'
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paginatedStudents.map((student) => (
                    <tr key={student.student_id} className="hover:bg-muted/30 transition-colors">
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
                        {student.booking_id ? (
                          <div>
                            <p className="text-sm text-foreground font-medium">{student.offer_title}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {student.slot_time ? new Date(student.slot_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                            </p>
                          </div>
                        ) : (
                          <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">No Booking</span>
                        )}
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
            
            {/* Pagination */}
            {filteredStudents.length > 10 && (
              <div className="px-4 sm:px-6 py-4 border-t border-border">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                  itemsPerPage={itemsPerPage}
                  totalItems={filteredStudents.length}
                />
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </CompanyLayout>
  );
}
