import { ReactNode } from 'react';
import StudentSidebar from './StudentSidebar';

interface StudentLayoutProps {
  children: ReactNode;
  onSignOut: () => void;
}

export default function StudentLayout({ children, onSignOut }: StudentLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <StudentSidebar onSignOut={onSignOut} />
      <main className="w-full">
        {children}
      </main>
    </div>
  );
}

