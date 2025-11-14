import { Link } from 'react-router-dom';
import { Calendar, Users, Clock, FileText } from 'lucide-react';
import { formatTime, formatDateShort } from '@/utils/dateUtils';
import type { ScheduledStudent } from '@/hooks/useCompanyStats';

/**
 * ScheduledStudentsList - List of students scheduled for interviews
 * 
 * Displays a list of students who have booked interview slots with the company.
 * Shows student information, interview time, and links to CVs.
 * 
 * @component
 * @param students - Array of scheduled students
 * 
 * @example
 * <ScheduledStudentsList students={scheduledStudents} />
 */
export default function ScheduledStudentsList({ students }: { students: ScheduledStudent[] }) {
  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-foreground">Scheduled Interviews</h2>
        <Link to="/company/students" className="text-sm text-primary hover:text-primary/80 transition-colors">
          View All Students
        </Link>
      </div>

      {students.length > 0 ? (
        <div className="space-y-3">
          {students.map((student) => (
            <Link 
              key={student.booking_id} 
              to={`/company/students/${student.student_id}`}
              className="flex items-center gap-4 p-4 bg-background rounded-lg border border-border hover:border-primary/50 transition-colors"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-foreground">{student.student_name}</p>
                  {student.cv_url && (
                    <a
                      href={student.cv_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 transition-colors"
                      title="View CV"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <FileText className="w-4 h-4" />
                    </a>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">{student.offer_title}</p>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-xs text-muted-foreground">{student.student_email}</p>
                  {student.student_phone && (
                    <p className="text-xs text-muted-foreground">• {student.student_phone}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2 text-sm text-foreground font-medium mb-1">
                  <Clock className="w-4 h-4" />
                  {formatTime(student.slot_start_time)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDateShort(student.slot_start_time)}
                </p>
                {student.slot_location && (
                  <p className="text-xs text-muted-foreground mt-1">{student.slot_location}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 animate-fade-in">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-muted-foreground opacity-50" />
          </div>
          <h3 className="font-semibold text-foreground mb-2">No Students Scheduled</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Students will appear here once they book interview slots
          </p>
          <Link
            to="/company/slots"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all text-sm font-medium hover:scale-105 active:scale-95"
          >
            View Slots
          </Link>
        </div>
      )}
    </div>
  );
}


