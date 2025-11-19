import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Mail, Phone, FileText, Calendar, Briefcase, User, GraduationCap } from 'lucide-react';

type StudentProfile = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  student_number: string | null;
  specialization: string | null;
  graduation_year: number | null;
  cv_url: string | null;
};

type Booking = {
  id: string;
  offer_title: string;
  slot_time: string;
  slot_location: string | null;
  status: string;
  notes: string | null;
};

export default function StudentProfile() {
  const [loading, setLoading] = useState(true);
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    loadStudentProfile();
  }, [id]);

  const loadStudentProfile = async () => {
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
      navigate('/company/students');
      return;
    }

    // Get student profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle(); // Use maybeSingle() to avoid 406 errors

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      alert('Student not found');
      navigate('/company/students');
      return;
    }

    if (!profile) {
      alert('Student not found');
      navigate('/company/students');
      return;
    }

    setStudent(profile);

    // Get company's offers
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

    // Get bookings for this student with company's offers
    // Use bookings table and join through event_slots to get offer_id
    const { data: bookingsData } = await supabase
      .from('bookings')
      .select(`
        id,
        slot_id,
        status,
        student_notes,
        event_slots!inner (
          offer_id
        )
      `)
      .eq('student_id', id)
      .in('event_slots.offer_id', offerIds);

    if (bookingsData && bookingsData.length > 0) {
      // Get slot details
      const slotIds = bookingsData.map(b => b.slot_id);
      const { data: slots } = await supabase
        .from('event_slots')
        .select('id, start_time, location')
        .in('id', slotIds);

      const slotMap = new Map(slots?.map(s => [s.id, { time: s.start_time, location: s.location }]) || []);

      const formattedBookings: Booking[] = bookingsData.map(booking => {
        const slot = slotMap.get(booking.slot_id);
        const offerId = (booking.event_slots as any)?.offer_id;
        return {
          id: booking.id,
          offer_title: offerMap.get(offerId) || 'Unknown',
          slot_time: slot?.time || '',
          slot_location: slot?.location || null,
          status: booking.status,
          notes: booking.student_notes || null,
        };
      });

      // Sort by time
      formattedBookings.sort((a, b) => new Date(b.slot_time).getTime() - new Date(a.slot_time).getTime());

      setBookings(formattedBookings);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!student) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link to="/company/students" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Student Profile</h1>
              <p className="text-sm text-muted-foreground mt-1">View student details and interview history</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Student Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Basic Info */}
            <div className="bg-card rounded-xl border border-border p-6">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4 mx-auto">
                <User className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground text-center mb-4">{student.full_name}</h2>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm text-foreground break-all">{student.email}</p>
                  </div>
                </div>

                {student.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="text-sm text-foreground">{student.phone}</p>
                    </div>
                  </div>
                )}

                {student.student_number && (
                  <div className="flex items-start gap-3">
                    <User className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Student Number</p>
                      <p className="text-sm text-foreground">{student.student_number}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Academic Info */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                Academic Information
              </h3>
              <div className="space-y-3">
                {student.specialization && (
                  <div>
                    <p className="text-xs text-muted-foreground">Specialization</p>
                    <p className="text-sm text-foreground">{student.specialization}</p>
                  </div>
                )}
                {student.graduation_year && (
                  <div>
                    <p className="text-xs text-muted-foreground">Graduation Year</p>
                    <p className="text-sm text-foreground">{student.graduation_year}</p>
                  </div>
                )}
              </div>
            </div>

            {/* CV */}
            {student.cv_url && (
              <div className="bg-card rounded-xl border border-border p-6">
                <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Resume / CV
                </h3>
                <a
                  href={student.cv_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                >
                  <FileText className="w-4 h-4" />
                  View CV
                </a>
              </div>
            )}
          </div>

          {/* Right Column - Interview History */}
          <div className="lg:col-span-2">
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Interview History
              </h3>

              {bookings.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">No interviews scheduled with your company</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bookings.map((booking) => (
                    <div key={booking.id} className="p-4 bg-background rounded-lg border border-border">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Briefcase className="w-4 h-4 text-primary" />
                            <h4 className="font-medium text-foreground">{booking.offer_title}</h4>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(booking.slot_time).toLocaleDateString('en-US', {
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })}
                            </div>
                            <div className="flex items-center gap-1">
                              {new Date(booking.slot_time).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                          {booking.slot_location && (
                            <p className="text-xs text-muted-foreground mt-1">📍 {booking.slot_location}</p>
                          )}
                        </div>
                        <span className={`px-2 py-1 text-xs font-medium rounded ${
                          booking.status === 'confirmed'
                            ? 'bg-green-500/20 text-green-600'
                            : 'bg-muted text-muted-foreground'
                        }`}>
                          {booking.status}
                        </span>
                      </div>
                      {booking.notes && (
                        <div className="pt-3 border-t border-border">
                          <p className="text-xs text-muted-foreground mb-1">Company Notes:</p>
                          <p className="text-sm text-foreground">{booking.notes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
