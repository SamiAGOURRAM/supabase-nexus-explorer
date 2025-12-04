import { ReactNode } from 'react';
import CompanySidebar from './CompanySidebar';

interface CompanyLayoutProps {
  children: ReactNode;
  onSignOut: () => void;
}

export default function CompanyLayout({ children, onSignOut }: CompanyLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <CompanySidebar onSignOut={onSignOut} />
      <main className="w-full">
        {children}
      </main>
    </div>
  );
}
