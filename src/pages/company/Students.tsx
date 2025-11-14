import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Search, Users, FileText } from 'lucide-react';

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
  offer_title: string;
  slot_time: string;
  status: string;
};

export default function CompanyStudents() {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentBooking[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
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
      setLoading(false);
      return;
    }

    // Get all offers for this company
    const { data: offers } = await supabase
      .from('offers')
      .select('id, title')
      .eq('company_id', company.id);

    if (!offers || offers.length === 0) {
      setLoading(false);
      return;
    }

    const offerIds = offers.map(o => o.id);
    const offerMap = new Map(offers.map(o => [o.id, o.title]));

    // Get all bookings for these offers
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id, student_id, slot_id, status, event_slots!inner(offer_id)')
      .in('event_slots.offer_id', offerIds);

    if (!bookings || bookings.length === 0) {
      setLoading(false);
      return;
    }

    // Get student profiles
    const studentIds = [...new Set(bookings.map(b => b.student_id))];
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, student_number, specialization, graduation_year, cv_url')
      .in('id', studentIds);

    // Get slot times
    const slotIds = bookings.map(b => b.slot_id);
    const { data: slots } = await supabase
      .from('event_slots')
      .select('id, start_time')
      .in('id', slotIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    const slotMap = new Map(slots?.map(s => [s.id, s.start_time]) || []);

    // Combine all data
    const studentsData: StudentBooking[] = bookings.map(booking => {
      const profile = profileMap.get(booking.student_id);
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
        offer_title: offerMap.get((booking as any).event_slots?.offer_id) || 'Unknown',
        slot_time: slotMap.get(booking.slot_id) || '',
        status: booking.status,
      };
    });

    // Sort by slot time
    studentsData.sort((a, b) => new Date(b.slot_time).getTime() - new Date(a.slot_time).getTime());

    setStudents(studentsData);
    setLoading(false);
  };

  const filteredStudents = students.filter(student =>
    student.student_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.student_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.offer_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (student.student_number && student.student_number.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const stats = {
    unique: new Set(students.map(s => s.student_id)).size,
    confirmed: students.filter(s => s.status === 'confirmed').length,
    total: students.length,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
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
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {students.length === 0 ? 'No students yet' : 'No students match your search'}
            </h3>
            <p className="text-muted-foreground">
              {students.length === 0 ? 'Students will appear here once they book interviews' : 'Try a different search term'}
            </p>
          </div>
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
                        <Link
                          to={`/company/students/${student.student_id}`}
                          className="font-medium text-foreground hover:text-primary transition-colors"
                        >
                          {student.student_name}
                        </Link>
                        {student.student_number && (
                          <p className="text-xs text-muted-foreground mt-1">{student.student_number}</p>
                        )}
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
                          {student.cv_url ? (
                            <a
                              href={student.cv_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                              title="View CV"
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
