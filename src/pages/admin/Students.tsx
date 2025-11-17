import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Users, GraduationCap, Mail, Phone, Search, UserX } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAuth } from '@/hooks/useAuth';

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
};

export default function AdminStudents() {
  const { signOut } = useAuth('admin');
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

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
      alert('Error: ' + err.message);
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
          alert('Permission denied. Please check RLS policies allow admins to view profiles.');
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
        .select('*')
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
      
      setStudents(fullStudentProfiles || []);
    } catch (err: any) {
      console.error('❌ Error loading students:', err);
      alert('Error loading students: ' + (err.message || 'Unknown error'));
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
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Students Management</h1>
            <p className="text-muted-foreground">View and manage all student accounts</p>
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name, email, or student number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Students</p>
                  <p className="text-2xl font-bold text-foreground mt-1">{students.length}</p>
                </div>
                <Users className="w-8 h-8 text-primary" />
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Deprioritized</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {students.filter(s => s.is_deprioritized).length}
                  </p>
                </div>
                <UserX className="w-8 h-8 text-warning" />
              </div>
            </div>
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">With Profile</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {students.filter(s => s.student_number && s.specialization).length}
                  </p>
                </div>
                <GraduationCap className="w-8 h-8 text-success" />
              </div>
            </div>
          </div>

          {/* Students List */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Loading students...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-xl border border-border">
              <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Students Found</h3>
              <p className="text-muted-foreground">
                {searchQuery ? 'Try a different search term' : 'No students registered yet'}
              </p>
            </div>
          ) : (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Contact
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Academic Info
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-muted/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mr-3">
                              <GraduationCap className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-foreground">{student.full_name}</div>
                              <div className="text-xs text-muted-foreground">{student.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-foreground">
                            {student.phone ? (
                              <div className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {student.phone}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">No phone</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-foreground">
                            {student.student_number && (
                              <div className="mb-1">#{student.student_number}</div>
                            )}
                            {student.specialization && (
                              <div className="text-xs text-muted-foreground">{student.specialization}</div>
                            )}
                            {student.graduation_year && (
                              <div className="text-xs text-muted-foreground">Grad: {student.graduation_year}</div>
                            )}
                            {!student.student_number && !student.specialization && (
                              <span className="text-muted-foreground text-xs">Incomplete profile</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            student.is_deprioritized
                              ? 'bg-warning/10 text-warning'
                              : 'bg-success/10 text-success'
                          }`}>
                            {student.is_deprioritized ? 'Deprioritized' : 'Active'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <button
                            onClick={() => handleToggleDeprioritized(student.id, student.is_deprioritized)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              student.is_deprioritized
                                ? 'bg-success/10 text-success hover:bg-success/20'
                                : 'bg-warning/10 text-warning hover:bg-warning/20'
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

