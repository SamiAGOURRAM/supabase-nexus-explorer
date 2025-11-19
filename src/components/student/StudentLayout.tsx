import { ReactNode } from 'react';
import StudentSidebar from './StudentSidebar';

interface StudentLayoutProps {
  children: ReactNode;
  onSignOut: () => void;
}

export default function StudentLayout({ children, onSignOut }: StudentLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex">
      <StudentSidebar onSignOut={onSignOut} />
      <main className="flex-1 w-full md:w-auto overflow-auto pt-16 md:pt-0">
        {children}
      </main>
    </div>
  );
}

