import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Mail, Phone, FileText, Calendar, Briefcase, User, GraduationCap } from 'lucide-react';
import { error as logError } from '@/utils/logger';

type StudentProfile = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  student_number: string | null;
  specialization: string | null;
  graduation_year: number | null;
  cv_url: string | null;
  profile_photo_url?: string | null;
  languages_spoken?: string[];
  program?: string | null;
  biography?: string | null;
  linkedin_url?: string | null;
  resume_url?: string | null;
  year_of_study?: number | null;
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

    if (!id) {
      alert('Student ID is required');
      navigate('/company/students');
      return;
    }
    // Get student profile with ALL fields for companies to view
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, student_number, specialization, graduation_year, cv_url, profile_photo_url, languages_spoken, program, biography, linkedin_url, resume_url, year_of_study, created_at, updated_at')
      .eq('id', id)
      .maybeSingle(); // Use maybeSingle() to avoid 406 errors

    if (profileError) {
      // Profile fetch error - log but continue gracefully
      alert('Student not found');
      navigate('/company/students');
      return;
    }

    if (!profile) {
      alert('Student not found');
      navigate('/company/students');
      return;
    }


    setStudent(profile as unknown as StudentProfile);

    // Get company's offers
    const { data: offers, error: offersError } = await supabase
      .from('offers')
      .select('id, title')
      .eq('company_id', company.id);

    if (offersError) {
      logError('Error fetching offers:', offersError);
      setLoading(false);
      return;
    }

    if (!offers || offers.length === 0) {
      setBookings([]);
      setLoading(false);
      return;
    }

    const offerIds = offers.map(o => o.id);
    const offerMap = new Map(offers.map(o => [o.id, o.title]));

    // Get bookings for this student
    const { data: bookingsData, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, slot_id, status, student_notes')
      .eq('student_id', id || '');

    if (bookingsError) {
      logError('Error fetching bookings:', bookingsError);
      setBookings([]);
      setLoading(false);
      return;
    }

    if (!bookingsData || bookingsData.length === 0) {
      setBookings([]);
      setLoading(false);
      return;
    }

    // Get slot details and filter by company's offers
    const slotIds = bookingsData.map(b => b.slot_id).filter(Boolean);
    
    if (slotIds.length === 0) {
      setBookings([]);
      setLoading(false);
      return;
    }

    const { data: slots, error: slotsError } = await supabase
      .from('event_slots')
      .select('id, start_time, location, offer_id')
      .in('id', slotIds)
      .in('offer_id', offerIds);

    if (slotsError) {
      logError('Error fetching slots:', slotsError);
      setBookings([]);
      setLoading(false);
      return;
    }

    if (!slots || slots.length === 0) {
      setBookings([]);
      setLoading(false);
      return;
    }

    // Create map for quick lookup
    const bookingSlotMap = new Map(bookingsData.map(b => [b.slot_id, b]));

    // Filter bookings to only include those with slots that belong to company's offers
    const formattedBookings: Booking[] = [];
    
    for (const slot of slots) {
      const booking = bookingSlotMap.get(slot.id);
      if (booking && slot.offer_id) {
        formattedBookings.push({
          id: booking.id,
          offer_title: offerMap.get(slot.offer_id) || 'Unknown Offer',
          slot_time: slot.start_time || '',
          slot_location: slot.location || null,
          status: booking.status,
          notes: booking.student_notes || null,
        });
      }
    }

    // Sort by time (most recent first)
    formattedBookings.sort((a, b) => {
      const timeA = a.slot_time ? new Date(a.slot_time).getTime() : 0;
      const timeB = b.slot_time ? new Date(b.slot_time).getTime() : 0;
      return timeB - timeA;
    });

    setBookings(formattedBookings);
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
              {student.profile_photo_url ? (
                <img
                  src={student.profile_photo_url}
                  alt={student.full_name}
                  className="w-20 h-20 rounded-full object-cover mb-4 mx-auto border-2 border-border"
                />
              ) : (
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4 mx-auto">
                  <User className="w-10 h-10 text-primary" />
                </div>
              )}
              <h2 className="text-xl font-bold text-foreground text-center mb-4">{student.full_name}</h2>
              <p className="text-sm text-muted-foreground text-center mb-4">
                {student.program || 'Program not specified'}
              </p>
              
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

            {/* Academic Info - Always show this section */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <GraduationCap className="w-4 h-4" />
                Academic Information
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Specialization</p>
                  <p className="text-sm text-foreground">
                    {student.specialization || <span className="text-muted-foreground italic">Not provided</span>}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Year of Study</p>
                  <p className="text-sm text-foreground">
                    {student.year_of_study ? `Year ${student.year_of_study}` : <span className="text-muted-foreground italic">Not provided</span>}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Graduation Year</p>
                  <p className="text-sm text-foreground">
                    {student.graduation_year || <span className="text-muted-foreground italic">Not provided</span>}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Program</p>
                  <p className="text-sm text-foreground">
                    {student.program || <span className="text-muted-foreground italic">Not provided</span>}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Languages</p>
                  {student.languages_spoken && Array.isArray(student.languages_spoken) && student.languages_spoken.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {student.languages_spoken.map((lang, idx) => (
                        <span key={idx} className="inline-flex items-center px-2 py-1 rounded text-xs bg-primary/10 text-primary">
                          {lang}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">Not provided</p>
                  )}
                </div>
              </div>
            </div>

            {/* Biography - Always show this section */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-sm font-semibold text-foreground mb-3">Biography</h3>
              {student.biography ? (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                  {student.biography}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic">No biography provided</p>
              )}
            </div>

            {/* LinkedIn - Always show this section */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-sm font-semibold text-foreground mb-3">LinkedIn Profile</h3>
              {student.linkedin_url ? (
                <a
                  href={student.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  View LinkedIn Profile
                </a>
              ) : (
                <p className="text-sm text-muted-foreground italic">No LinkedIn profile provided</p>
              )}
            </div>

            {/* Resume / CV - Always show this section */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Resume / CV
              </h3>
              {student.resume_url ? (
                <a
                  href={student.resume_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium mb-2"
                >
                  <FileText className="w-4 h-4" />
                  View Resume
                </a>
              ) : (
                <p className="text-sm text-muted-foreground italic mb-2">No resume uploaded</p>
              )}
              {student.cv_url ? (
                <a
                  href={student.cv_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors text-sm font-medium"
                >
                  <FileText className="w-4 h-4" />
                  View CV (Alternative)
                </a>
              ) : (
                !student.resume_url && (
                  <p className="text-sm text-muted-foreground italic">No CV provided</p>
                )
              )}
            </div>
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
