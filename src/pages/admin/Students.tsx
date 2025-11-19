import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { Users, GraduationCap, Phone, Search, UserX, Download, Filter, Edit2, Save, X, Linkedin } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAuth } from '@/hooks/useAuth';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import EmptyState from '@/components/shared/EmptyState';
import LoadingTable from '@/components/shared/LoadingTable';
import ImageUpload from '@/components/shared/ImageUpload';
import { uploadProfilePhoto } from '@/utils/fileUpload';

type Student = {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  student_number: string | null;
  specialization: string | null;
  graduation_year: number | null;
  is_deprioritized: boolean;
  created_at: string;
  profile_photo_url?: string | null;
  languages_spoken?: string[] | null;
  program?: string | null;
  year_of_study?: number | null;
  biography?: string | null;
  linkedin_url?: string | null;
  resume_url?: string | null;
  cv_url?: string | null;
  // Event specific data
  event_stats?: {
    total_bookings: number;
    companies: Array<{ id: string; name: string }>;
    sessions?: string[];
  };
};

export default function AdminStudents() {
  const { signOut } = useAuth('admin');
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCompany, setFilterCompany] = useState<string>('all');
  const [filterProgram, setFilterProgram] = useState<string>('all');
  const [filterYear, setFilterYear] = useState<string>('all');
  const [filterGraduationYear, setFilterGraduationYear] = useState<string>('all');
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([]);
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('eventId');
  const [eventName, setEventName] = useState<string | null>(null);
  const navigate = useNavigate();
  const { showError, showSuccess } = useToast();
  
  // Inline editing state
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editedStudent, setEditedStudent] = useState<Partial<Student> | null>(null);
  const [savingStudentId, setSavingStudentId] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [languageInput, setLanguageInput] = useState<Record<string, string>>({});

  useEffect(() => {
    checkAdminAndLoadStudents();
  }, [eventId]);

  const checkAdminAndLoadStudents = async () => {
    try {
      setLoading(true);
      
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      // Check if user is admin
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Profile fetch error:', profileError);
        navigate('/login');
        return;
      }

      if (!profile || profile.role !== 'admin') {
        navigate('/offers');
        return;
      }

      // Load students
      await loadStudents();
    } catch (err: any) {
      console.error('Error:', err);
      const errorMessage = err instanceof Error ? err : new Error('Failed to load students');
      setError(errorMessage);
      showError('Failed to load students. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    try {
      // If eventId is present, load event details first
      if (eventId) {
        const { data: event, error: eventError } = await supabase
          .from('events')
          .select('name')
          .eq('id', eventId)
          .single();
        
        if (eventError) {
          console.error('Error loading event:', eventError);
        } else {
          setEventName(event.name);
        }
      } else {
        setEventName(null);
      }

      // Strategy: Query all profiles first to see what we have
      // The RLS policy "Authenticated users can view profiles" should allow this
      const { data: allProfiles, error: allError } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, created_at')
        .order('created_at', { ascending: false });
      
      if (allError) {
        console.error('Error fetching all profiles:', allError);
        // ... error handling ...
        throw allError;
      }
      
      // Filter for students: role='student' OR (not admin and not company)
      const studentProfiles = allProfiles.filter((p: any) => {
        const role = p.role;
        if (role === 'student') return true;
        if (role !== 'admin' && role !== 'company') return true;
        return false;
      });
      
      if (studentProfiles.length === 0) {
        setStudents([]);
        return;
      }
      
      // Fetch full details for student profiles
      const studentIds = studentProfiles.map((p: any) => p.id);
      const { data: fullStudentProfiles, error: fullError } = await supabase
        .from('profiles')
        .select('id, email, full_name, phone, student_number, specialization, graduation_year, cv_url, is_deprioritized, created_at, profile_photo_url, languages_spoken, program, biography, linkedin_url, resume_url, year_of_study')
        .in('id', studentIds)
        .order('created_at', { ascending: false });
      
      if (fullError) throw fullError;

      // If eventId is present, fetch bookings and calculate stats
      let studentStats: Record<string, { total_bookings: number; companies: Array<{ id: string; name: string }>; sessions: string[] }> = {};
      
      if (eventId) {
        // Get event participants to get companies
        const { data: participants } = await supabase
          .from('event_participants')
          .select(`
            companies!inner (
              id,
              company_name
            )
          `)
          .eq('event_id', eventId);

        if (participants) {
          const uniqueCompanies = participants
            .map((p: any) => ({ id: p.companies.id, name: p.companies.company_name }))
            .filter((c: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.id === c.id) === i);
          setCompanies(uniqueCompanies);
        }

        // Get event slots
        const { data: eventSlots } = await supabase
          .from('event_slots')
          .select('id, company_id, session_id')
          .eq('event_id', eventId)
          .eq('is_active', true);

        const slotIds = eventSlots?.map(s => s.id) || [];
        const slotCompanyMap = new Map(eventSlots?.map(s => [s.id, s.company_id]) || []);
        const slotSessionMap = new Map(eventSlots?.map(s => [s.id, s.session_id]) || []);

        // Get session names - filter out null values
        const sessionIds = [...new Set(eventSlots?.map(s => s.session_id).filter((id): id is string => Boolean(id)) || [])];
        let sessionsMap = new Map<string, string>();
        if (sessionIds.length > 0) {
          const { data: sessions } = await supabase
            .from('speed_recruiting_sessions')
            .select('id, name')
            .in('id', sessionIds);
          sessions?.forEach(s => sessionsMap.set(s.id, s.name));
        }

        if (slotIds.length > 0) {
          // Get bookings
          const { data: bookings } = await supabase
            .from('bookings')
            .select('student_id, slot_id')
            .in('slot_id', slotIds)
            .eq('status', 'confirmed');

          // Get companies info
          const companyIds = [...new Set(eventSlots?.map(s => s.company_id))];
          const { data: companiesData } = await supabase
            .from('companies')
            .select('id, company_name')
            .in('id', companyIds);
          
          const companyNameMap = new Map(companiesData?.map(c => [c.id, c.company_name]) || []);

          // Calculate stats per student
          bookings?.forEach(booking => {
            const studentId = booking.student_id;
            if (!studentStats[studentId]) {
              studentStats[studentId] = { total_bookings: 0, companies: [], sessions: [] };
            }
            
            studentStats[studentId].total_bookings++;
            
            const companyId = slotCompanyMap.get(booking.slot_id);
            if (companyId) {
              const companyName = companyNameMap.get(companyId);
              if (companyName && !studentStats[studentId].companies.some(c => c.id === companyId)) {
                studentStats[studentId].companies.push({ id: companyId, name: companyName });
              }
            }

            const sessionId = slotSessionMap.get(booking.slot_id);
            if (sessionId) {
              const sessionName = sessionsMap.get(sessionId);
              if (sessionName && !studentStats[studentId].sessions.includes(sessionName)) {
                studentStats[studentId].sessions.push(sessionName);
              }
            }
          });
        }
      }
      
      // Map to Student type
      const mappedStudents: Student[] = (fullStudentProfiles || []).map((s: any) => ({
        id: s.id,
        email: s.email,
        full_name: s.full_name,
        phone: s.phone || null,
        student_number: s.student_number || null,
        specialization: s.specialization || null,
        graduation_year: s.graduation_year || null,
        is_deprioritized: s.is_deprioritized || false,
        created_at: s.created_at,
        profile_photo_url: s.profile_photo_url || null,
        languages_spoken: s.languages_spoken || null,
        program: s.program || null,
        year_of_study: s.year_of_study || null,
        biography: s.biography || null,
        linkedin_url: s.linkedin_url || null,
        resume_url: s.resume_url || null,
        cv_url: s.cv_url || null,
        event_stats: eventId ? (studentStats[s.id] || { total_bookings: 0, companies: [], sessions: [] }) : undefined
      }));
      
      setStudents(mappedStudents);
      setError(null);
    } catch (err: any) {
      console.error('Error loading students:', err);
      const errorMessage = err instanceof Error ? err : new Error('Failed to load students');
      setError(errorMessage);
      showError('Failed to load students. Please try again.');
      setStudents([]);
    }
  };

  const handleToggleDeprioritized = async (studentId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_deprioritized: !currentStatus })
        .eq('id', studentId);

      if (error) throw error;
      showSuccess(`Student ${!currentStatus ? 'deprioritized' : 'prioritized'} successfully`);
      await loadStudents();
    } catch (err: any) {
      console.error('Error updating student:', err);
      showError(err.message || 'Failed to update student status');
    }
  };

  const startEditing = (student: Student) => {
    setEditingStudentId(student.id);
    setEditedStudent({ ...student });
    setLanguageInput({ [student.id]: '' });
  };

  const cancelEditing = () => {
    setEditingStudentId(null);
    setEditedStudent(null);
    setPhotoFile(null);
    setLanguageInput({});
  };

  const addLanguage = (studentId: string) => {
    if (!editedStudent || !languageInput[studentId]?.trim()) return;
    const currentLangs = editedStudent.languages_spoken || [];
    const newLang = languageInput[studentId].trim();
    if (!currentLangs.includes(newLang)) {
      setEditedStudent({
        ...editedStudent,
        languages_spoken: [...currentLangs, newLang]
      });
    }
    setLanguageInput({ ...languageInput, [studentId]: '' });
  };

  const removeLanguage = (_studentId: string, lang: string) => {
    if (!editedStudent) return;
    const currentLangs = editedStudent.languages_spoken || [];
    setEditedStudent({
      ...editedStudent,
      languages_spoken: currentLangs.filter(l => l !== lang)
    });
  };

  const handlePhotoSelect = (file: File) => {
    setPhotoFile(file);
  };

  const saveStudent = async (studentId: string) => {
    if (!editedStudent) return;

    try {
      setSavingStudentId(studentId);
      
      // Upload photo if selected
      let profilePhotoUrl = editedStudent.profile_photo_url;
      if (photoFile) {
        setUploadingPhoto(studentId);
        const uploadResult = await uploadProfilePhoto(photoFile, studentId);
        if (uploadResult.error) {
          throw new Error(uploadResult.error);
        }
        profilePhotoUrl = uploadResult.url;
        setUploadingPhoto(null);
      }

      // Prepare update data
      const updateData: any = {
        full_name: editedStudent.full_name?.trim() || '',
        email: editedStudent.email?.trim() || '',
        phone: editedStudent.phone?.trim() || null,
        student_number: editedStudent.student_number?.trim() || null,
        specialization: editedStudent.specialization?.trim() || null,
        graduation_year: editedStudent.graduation_year || null,
        program: editedStudent.program || null,
        year_of_study: editedStudent.year_of_study || null,
        languages_spoken: editedStudent.languages_spoken || [],
        biography: editedStudent.biography?.trim() || null,
        linkedin_url: editedStudent.linkedin_url?.trim() || null,
        resume_url: editedStudent.resume_url?.trim() || null,
        cv_url: editedStudent.cv_url?.trim() || null,
        is_deprioritized: editedStudent.is_deprioritized || false,
      };

      if (profilePhotoUrl !== undefined) {
        updateData.profile_photo_url = profilePhotoUrl;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', studentId);

      if (error) throw error;

      showSuccess('Student profile updated successfully');
      cancelEditing();
      await loadStudents();
    } catch (err: any) {
      console.error('Error saving student:', err);
      showError(err.message || 'Failed to update student profile');
    } finally {
      setSavingStudentId(null);
      setUploadingPhoto(null);
    }
  };

  const exportToCSV = () => {
    if (!eventId) return;
    
    const headers = ['Name', 'Email', 'Specialization', 'Graduation Year', 'Total Interviews', 'Companies', 'Sessions'];
    const rows = filteredStudents.map(s => [
      s.full_name,
      s.email,
      s.specialization || 'N/A',
      s.graduation_year?.toString() || 'N/A',
      s.event_stats?.total_bookings.toString() || '0',
      s.event_stats?.companies.map(c => c.name).join('; ') || 'N/A',
      s.event_stats?.sessions?.join('; ') || 'N/A'
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${eventName || 'event'}-students.csv`;
    a.click();
    showSuccess('CSV exported successfully');
  };

  const filteredStudents = students.filter(student => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesName = student.full_name.toLowerCase().includes(query);
      const matchesEmail = student.email.toLowerCase().includes(query);
      const matchesStudentNumber = student.student_number?.toLowerCase().includes(query);
      const matchesSpecialization = student.specialization?.toLowerCase().includes(query);
      if (!matchesName && !matchesEmail && !matchesStudentNumber && !matchesSpecialization) return false;
    }

    // Company filter (only when eventId is present)
    if (eventId && filterCompany !== 'all') {
      const hasCompany = student.event_stats?.companies.some(c => c.id === filterCompany);
      if (!hasCompany) return false;
    }

    // Program filter
    if (filterProgram !== 'all') {
      if (student.program !== filterProgram) return false;
    }

    // Year of study filter
    if (filterYear !== 'all') {
      if (student.year_of_study !== parseInt(filterYear)) return false;
    }

    // Graduation year filter
    if (filterGraduationYear !== 'all') {
      if (student.graduation_year !== parseInt(filterGraduationYear)) return false;
    }

    return true;
  });

  // Get unique values for filters
  const uniquePrograms = Array.from(new Set(students.map(s => s.program).filter(Boolean))) as string[];
  const uniqueYears = Array.from(new Set(students.map(s => s.year_of_study).filter(Boolean))).sort() as number[];
  const uniqueGraduationYears = Array.from(new Set(students.map(s => s.graduation_year).filter(Boolean))).sort() as number[];

  return (
    <AdminLayout onSignOut={signOut}>
      <div className="p-4 sm:p-6 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">
              {eventName ? `${eventName} - Students` : 'Students Management'}
            </h1>
            <p className="text-muted-foreground text-sm md:text-base">
              {eventName ? 'View and manage students participating in this event' : 'View and manage all student accounts'}
            </p>
          </div>

          {/* Search and Filters */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name, email, or student number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-background border border-input rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-soft"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 items-start sm:items-center">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="w-5 h-5 text-primary flex-shrink-0" />
                <label className="text-sm font-medium text-foreground">Filters:</label>
              </div>
              
              <select
                value={filterProgram}
                onChange={(e) => setFilterProgram(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm"
              >
                <option value="all">All Programs</option>
                {uniquePrograms.map(program => (
                  <option key={program} value={program}>{program}</option>
                ))}
              </select>

              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm"
              >
                <option value="all">All Years</option>
                {uniqueYears.map(year => (
                  <option key={year} value={year.toString()}>Year {year}</option>
                ))}
              </select>

              <select
                value={filterGraduationYear}
                onChange={(e) => setFilterGraduationYear(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm"
              >
                <option value="all">All Graduation Years</option>
                {uniqueGraduationYears.map(year => (
                  <option key={year} value={year.toString()}>{year}</option>
                ))}
              </select>

              {eventId && (
                <select
                  value={filterCompany}
                  onChange={(e) => setFilterCompany(e.target.value)}
                  className="w-full sm:w-auto px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm"
                >
                  <option value="all">All Companies</option>
                  {companies.map(company => (
                    <option key={company.id} value={company.id}>{company.name}</option>
                  ))}
                </select>
              )}
            </div>

            {eventId && (
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <button
                  onClick={exportToCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              </div>
            )}

            {(searchQuery || filterProgram !== 'all' || filterYear !== 'all' || filterGraduationYear !== 'all' || (eventId && filterCompany !== 'all')) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterProgram('all');
                  setFilterYear('all');
                  setFilterGraduationYear('all');
                  setFilterCompany('all');
                }}
                className="text-sm text-primary hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
            <div className="bg-card border border-border rounded-xl p-5 shadow-soft hover:shadow-elegant transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                  <p className="text-3xl font-bold text-foreground">{students.length}</p>
                </div>
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-5 shadow-soft hover:shadow-elegant transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Deprioritized</p>
                  <p className="text-3xl font-bold text-foreground">
                    {students.filter(s => s.is_deprioritized).length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-warning/10 rounded-xl flex items-center justify-center">
                  <UserX className="w-6 h-6 text-warning" />
                </div>
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-5 shadow-soft hover:shadow-elegant transition-all duration-200">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Complete Profiles</p>
                  <p className="text-3xl font-bold text-foreground">
                    {students.filter(s => s.student_number && s.specialization).length}
                  </p>
                </div>
                <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center">
                  <GraduationCap className="w-6 h-6 text-success" />
                </div>
              </div>
            </div>
          </div>

          {/* Students List */}
          {error ? (
            <ErrorDisplay error={error} onRetry={loadStudents} />
          ) : loading ? (
            <LoadingTable columns={6} rows={10} />
          ) : filteredStudents.length === 0 ? (
            <EmptyState
              icon={Users}
              title={searchQuery ? 'No students match your search' : 'No students registered yet'}
              message={
                searchQuery 
                  ? 'Try a different search term or clear your filters to see all students.' 
                  : 'Students will appear here once they register for the platform.'
              }
              className="bg-card rounded-xl border border-border p-12"
            />
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden shadow-elegant">
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <table className="w-full min-w-[800px]">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Academic Info
                      </th>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Actions
                      </th>
                      {eventId && (
                        <>
                          <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Interviews
                          </th>
                          <th className="px-4 sm:px-6 py-3 sm:py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Companies
                          </th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {filteredStudents.map((student) => {
                      const isEditing = editingStudentId === student.id;
                      const currentStudent = isEditing && editedStudent ? editedStudent : student;
                      
                      return (
                        <tr 
                          key={student.id} 
                          className={`transition-colors duration-150 ${
                            isEditing 
                              ? 'bg-primary/5 border-l-4 border-l-primary' 
                              : 'hover:bg-muted/30'
                          }`}
                        >
                          {/* Student Info Column */}
                          <td className="px-4 sm:px-6 py-3 sm:py-4">
                            {isEditing ? (
                              <div className="space-y-3">
                                <div>
                                  <label className="text-xs text-muted-foreground mb-1 block">Profile Photo</label>
                                  <ImageUpload
                                    currentImageUrl={currentStudent.profile_photo_url || null}
                                    onImageSelect={handlePhotoSelect}
                                    onImageRemove={() => {
                                      setPhotoFile(null);
                                      if (editedStudent) {
                                        setEditedStudent({ ...editedStudent, profile_photo_url: null });
                                      }
                                    }}
                                    label=""
                                    maxSizeMB={5}
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground mb-1 block">Full Name</label>
                                  <input
                                    type="text"
                                    value={currentStudent.full_name || ''}
                                    onChange={(e) => editedStudent && setEditedStudent({ ...editedStudent, full_name: e.target.value })}
                                    className="w-full px-2 py-1 text-sm bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-primary"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                                  <input
                                    type="email"
                                    value={currentStudent.email || ''}
                                    onChange={(e) => editedStudent && setEditedStudent({ ...editedStudent, email: e.target.value })}
                                    className="w-full px-2 py-1 text-sm bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-primary"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground mb-1 block">Program</label>
                                  <select
                                    value={currentStudent.program || ''}
                                    onChange={(e) => editedStudent && setEditedStudent({ ...editedStudent, program: e.target.value || null })}
                                    className="w-full px-2 py-1 text-sm bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-primary"
                                  >
                                    <option value="">Select program</option>
                                    <option value="Bachelor's">Bachelor's</option>
                                    <option value="IVET">IVET</option>
                                  </select>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3">
                                {student.profile_photo_url ? (
                                  <img
                                    src={student.profile_photo_url}
                                    alt={student.full_name}
                                    className="w-11 h-11 rounded-xl object-cover flex-shrink-0 border border-border"
                                  />
                                ) : (
                                  <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                    <GraduationCap className="w-5 h-5 text-primary" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-foreground truncate">{student.full_name}</div>
                                  <div className="text-xs text-muted-foreground truncate">{student.email}</div>
                                  {student.program && (
                                    <div className="text-xs text-muted-foreground mt-0.5">{student.program}</div>
                                  )}
                                </div>
                              </div>
                            )}
                          </td>
                          
                          {/* Contact Column */}
                          <td className="px-4 sm:px-6 py-3 sm:py-4">
                            {isEditing ? (
                              <div className="space-y-2">
                                <div>
                                  <label className="text-xs text-muted-foreground mb-1 block">Phone</label>
                                  <input
                                    type="tel"
                                    value={currentStudent.phone || ''}
                                    onChange={(e) => editedStudent && setEditedStudent({ ...editedStudent, phone: e.target.value || null })}
                                    className="w-full px-2 py-1 text-sm bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-primary"
                                    placeholder="+212 6XX XXX XXX"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground mb-1 block">LinkedIn</label>
                                  <input
                                    type="url"
                                    value={currentStudent.linkedin_url || ''}
                                    onChange={(e) => editedStudent && setEditedStudent({ ...editedStudent, linkedin_url: e.target.value || null })}
                                    className="w-full px-2 py-1 text-sm bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-primary"
                                    placeholder="https://linkedin.com/in/..."
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground mb-1 block">Resume URL</label>
                                  <input
                                    type="url"
                                    value={currentStudent.resume_url || ''}
                                    onChange={(e) => editedStudent && setEditedStudent({ ...editedStudent, resume_url: e.target.value || null })}
                                    className="w-full px-2 py-1 text-sm bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-primary"
                                    placeholder="https://..."
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground mb-1 block">CV URL</label>
                                  <input
                                    type="url"
                                    value={currentStudent.cv_url || ''}
                                    onChange={(e) => editedStudent && setEditedStudent({ ...editedStudent, cv_url: e.target.value || null })}
                                    className="w-full px-2 py-1 text-sm bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-primary"
                                    placeholder="https://..."
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm text-foreground">
                                {student.phone ? (
                                  <div className="flex items-center gap-2">
                                    <Phone className="w-4 h-4 text-muted-foreground" />
                                    <span>{student.phone}</span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground italic">No phone</span>
                                )}
                                {student.linkedin_url && (
                                  <div className="mt-1">
                                    <a href={student.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1">
                                      <Linkedin className="w-3 h-3" />
                                      LinkedIn
                                    </a>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          
                          {/* Academic Info Column */}
                          <td className="px-4 sm:px-6 py-3 sm:py-4">
                            {isEditing ? (
                              <div className="space-y-2">
                                <div>
                                  <label className="text-xs text-muted-foreground mb-1 block">Student Number</label>
                                  <input
                                    type="text"
                                    value={currentStudent.student_number || ''}
                                    onChange={(e) => editedStudent && setEditedStudent({ ...editedStudent, student_number: e.target.value || null })}
                                    className="w-full px-2 py-1 text-sm bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-primary"
                                  />
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground mb-1 block">Specialization</label>
                                  <input
                                    type="text"
                                    value={currentStudent.specialization || ''}
                                    onChange={(e) => editedStudent && setEditedStudent({ ...editedStudent, specialization: e.target.value || null })}
                                    className="w-full px-2 py-1 text-sm bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-primary"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="text-xs text-muted-foreground mb-1 block">Year of Study</label>
                                    <select
                                      value={currentStudent.year_of_study || ''}
                                      onChange={(e) => editedStudent && setEditedStudent({ ...editedStudent, year_of_study: e.target.value ? parseInt(e.target.value) : null })}
                                      className="w-full px-2 py-1 text-sm bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-primary"
                                    >
                                      <option value="">Select</option>
                                      {Array.from({ length: 10 }, (_, i) => i + 1).map((year) => (
                                        <option key={year} value={year}>Year {year}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="text-xs text-muted-foreground mb-1 block">Grad Year</label>
                                    <input
                                      type="number"
                                      value={currentStudent.graduation_year || ''}
                                      onChange={(e) => editedStudent && setEditedStudent({ ...editedStudent, graduation_year: e.target.value ? parseInt(e.target.value) : null })}
                                      className="w-full px-2 py-1 text-sm bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-primary"
                                      placeholder="2025"
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground mb-1 block">Languages</label>
                                  <div className="flex gap-1 mb-1">
                                    <input
                                      type="text"
                                      value={languageInput[student.id] || ''}
                                      onChange={(e) => setLanguageInput({ ...languageInput, [student.id]: e.target.value })}
                                      onKeyPress={(e) => {
                                        if (e.key === 'Enter') {
                                          e.preventDefault();
                                          addLanguage(student.id);
                                        }
                                      }}
                                      placeholder="Add language"
                                      className="flex-1 px-2 py-1 text-xs bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-primary"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => addLanguage(student.id)}
                                      className="px-2 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
                                    >
                                      Add
                                    </button>
                                  </div>
                                  {currentStudent.languages_spoken && currentStudent.languages_spoken.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {currentStudent.languages_spoken.map((lang, idx) => (
                                        <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">
                                          {lang}
                                          <button
                                            type="button"
                                            onClick={() => removeLanguage(student.id, lang)}
                                            className="hover:text-destructive"
                                          >
                                            <X className="w-3 h-3" />
                                          </button>
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <label className="text-xs text-muted-foreground mb-1 block">Biography</label>
                                  <textarea
                                    value={currentStudent.biography || ''}
                                    onChange={(e) => editedStudent && setEditedStudent({ ...editedStudent, biography: e.target.value || null })}
                                    rows={3}
                                    className="w-full px-2 py-1 text-xs bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                                    placeholder="Biography..."
                                  />
                                </div>
                              </div>
                            ) : (
                              <div className="text-sm space-y-1">
                                {student.student_number && (
                                  <div className="font-medium text-foreground">#{student.student_number}</div>
                                )}
                                {student.specialization && (
                                  <div className="text-xs text-foreground">{student.specialization}</div>
                                )}
                                {student.year_of_study && (
                                  <div className="text-xs text-muted-foreground">Year {student.year_of_study}</div>
                                )}
                                {student.graduation_year && (
                                  <div className="text-xs text-muted-foreground">Grad: {student.graduation_year}</div>
                                )}
                                {student.languages_spoken && Array.isArray(student.languages_spoken) && student.languages_spoken.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {student.languages_spoken.slice(0, 2).map((lang: string, idx: number) => (
                                      <span key={idx} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-primary/10 text-primary">
                                        {lang}
                                      </span>
                                    ))}
                                    {student.languages_spoken.length > 2 && (
                                      <span className="text-xs text-muted-foreground">+{student.languages_spoken.length - 2}</span>
                                    )}
                                  </div>
                                )}
                                {!student.student_number && !student.specialization && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-md bg-muted/50 text-xs text-muted-foreground">
                                    Incomplete profile
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          
                          {/* Status Column */}
                          <td className="px-4 sm:px-6 py-3 sm:py-4">
                            {isEditing ? (
                              <div>
                                <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={currentStudent.is_deprioritized || false}
                                    onChange={(e) => editedStudent && setEditedStudent({ ...editedStudent, is_deprioritized: e.target.checked })}
                                    className="w-4 h-4 text-primary border-border rounded focus:ring-primary"
                                  />
                                  <span className="text-xs text-foreground">Deprioritized</span>
                                </label>
                              </div>
                            ) : (
                              <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
                                student.is_deprioritized
                                  ? 'bg-warning/10 text-warning border border-warning/20'
                                  : 'bg-success/10 text-success border border-success/20'
                              }`}>
                                {student.is_deprioritized ? 'Deprioritized' : 'Active'}
                              </span>
                            )}
                          </td>
                          
                          {/* Actions Column */}
                          <td className="px-4 sm:px-6 py-3 sm:py-4">
                            {isEditing ? (
                              <div className="flex flex-col gap-2">
                                <button
                                  onClick={() => saveStudent(student.id)}
                                  disabled={savingStudentId === student.id || uploadingPhoto === student.id}
                                  className="flex items-center justify-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {savingStudentId === student.id || uploadingPhoto === student.id ? (
                                    <>
                                      <div className="w-3 h-3 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                                      Saving...
                                    </>
                                  ) : (
                                    <>
                                      <Save className="w-3 h-3" />
                                      Save
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  disabled={savingStudentId === student.id}
                                  className="flex items-center justify-center gap-1 px-3 py-1.5 bg-muted text-foreground rounded text-xs font-medium hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  <X className="w-3 h-3" />
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-2">
                                <button
                                  onClick={() => startEditing(student)}
                                  className="flex items-center justify-center gap-1 px-3 py-1.5 bg-primary/10 text-primary rounded text-xs font-medium hover:bg-primary/20"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleToggleDeprioritized(student.id, student.is_deprioritized)}
                                  className={`px-3 py-1.5 rounded text-xs font-semibold transition-all duration-200 ${
                                    student.is_deprioritized
                                      ? 'bg-success/10 text-success hover:bg-success/20 border border-success/20'
                                      : 'bg-warning/10 text-warning hover:bg-warning/20 border border-warning/20'
                                  }`}
                                >
                                  {student.is_deprioritized ? 'Prioritize' : 'Deprioritize'}
                                </button>
                              </div>
                            )}
                          </td>
                          
                          {/* Event Stats Columns (read-only) */}
                          {eventId && student.event_stats && (
                            <>
                              <td className="px-4 sm:px-6 py-3 sm:py-4">
                                <span className="px-2 py-1 bg-primary/10 text-primary text-sm rounded-full font-medium">
                                  {student.event_stats.total_bookings}
                                </span>
                              </td>
                              <td className="px-4 sm:px-6 py-3 sm:py-4">
                                <div className="flex flex-wrap gap-1">
                                  {student.event_stats.companies.slice(0, 3).map((company, idx) => (
                                    <span key={idx} className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded">
                                      {company.name}
                                    </span>
                                  ))}
                                  {student.event_stats.companies.length > 3 && (
                                    <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded">
                                      +{student.event_stats.companies.length - 3}
                                    </span>
                                  )}
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

