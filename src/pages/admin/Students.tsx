import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { Users, GraduationCap, Phone, Search, UserX } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAuth } from '@/hooks/useAuth';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import EmptyState from '@/components/shared/EmptyState';
import LoadingTable from '@/components/shared/LoadingTable';

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
};

export default function AdminStudents() {
  const { signOut } = useAuth('admin');
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { showError } = useToast();

  useEffect(() => {
    checkAdminAndLoadStudents();
  }, []);

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
      console.log('🔍 Loading students...');
      
      // Strategy: Query all profiles first to see what we have
      // The RLS policy "Authenticated users can view profiles" should allow this
      const { data: allProfiles, error: allError } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, created_at')
        .order('created_at', { ascending: false });
      
      if (allError) {
        console.error('❌ Error fetching all profiles:', allError);
        console.error('Error code:', allError.code);
        console.error('Error message:', allError.message);
        console.error('Error details:', JSON.stringify(allError, null, 2));
        
        // If RLS is blocking, try a different approach
        if (allError.code === '42501' || allError.message?.includes('permission')) {
          showError('Permission denied. Please check RLS policies allow admins to view profiles.');
        }
        throw allError;
      }
      
      console.log('✅ Total profiles in database:', allProfiles?.length || 0);
      
      if (!allProfiles || allProfiles.length === 0) {
        console.warn('⚠️ No profiles found in database!');
        console.warn('💡 This might mean:');
        console.warn('   1. Users exist in auth.users but profiles were not created');
        console.warn('   2. The trigger to create profiles did not run');
        console.warn('   3. RLS policies are blocking access');
        setStudents([]);
        return;
      }
      
      // Analyze role distribution
      const roleCounts = allProfiles.reduce((acc: any, p: any) => {
        const role = p.role || 'NULL';
        acc[role] = (acc[role] || 0) + 1;
        return acc;
      }, {});
      console.log('📊 Role distribution:', roleCounts);
      console.log('📋 Sample profiles:', allProfiles.slice(0, 3).map((p: any) => ({
        email: p.email,
        name: p.full_name,
        role: p.role
      })));
      
      // Filter for students: role='student' OR (not admin and not company)
      // Since user said "all non-admin accounts are students"
      const studentProfiles = allProfiles.filter((p: any) => {
        const role = p.role;
        // Explicitly student
        if (role === 'student') return true;
        // Not admin and not company = student by default
        if (role !== 'admin' && role !== 'company') return true;
        return false;
      });
      
      console.log(`📚 Found ${studentProfiles.length} student profiles (including non-admin/non-company)`);
      
      if (studentProfiles.length === 0) {
        console.warn('⚠️ No student profiles found!');
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
      
      if (fullError) {
        console.error('❌ Error fetching full student profiles:', fullError);
        throw fullError;
      }
      
      console.log('✅ Successfully loaded', fullStudentProfiles?.length || 0, 'students');
      if (fullStudentProfiles && fullStudentProfiles.length > 0) {
        console.log('📋 Sample student data:', fullStudentProfiles.slice(0, 2).map((s: any) => ({
          email: s.email,
          name: s.full_name,
          role: s.role
        })));
      }
      
      // Map to Student type, ensuring all required fields are present
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
      }));
      
      setStudents(mappedStudents);
      setError(null);
    } catch (err: any) {
      console.error('❌ Error loading students:', err);
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
      await loadStudents();
    } catch (err: any) {
      console.error('Error updating student:', err);
      alert('Error: ' + err.message);
    }
  };

  const filteredStudents = students.filter(student =>
    student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.student_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout onSignOut={signOut}>
      <div className="p-6 md:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">Students Management</h1>
            <p className="text-muted-foreground text-sm md:text-base">View and manage all student accounts</p>
          </div>

          {/* Search */}
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
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Academic Info
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {filteredStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-muted/30 transition-colors duration-150">
                        <td className="px-6 py-4">
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
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-foreground">
                            {student.phone ? (
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-muted-foreground" />
                                <span>{student.phone}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground italic">No phone</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
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
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
                            student.is_deprioritized
                              ? 'bg-warning/10 text-warning border border-warning/20'
                              : 'bg-success/10 text-success border border-success/20'
                          }`}>
                            {student.is_deprioritized ? 'Deprioritized' : 'Active'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleToggleDeprioritized(student.id, student.is_deprioritized)}
                            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                              student.is_deprioritized
                                ? 'bg-success/10 text-success hover:bg-success/20 border border-success/20'
                                : 'bg-warning/10 text-warning hover:bg-warning/20 border border-warning/20'
                            }`}
                          >
                            {student.is_deprioritized ? 'Prioritize' : 'Deprioritize'}
                          </button>
                        </td>
                      </tr>
                    ))}
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

