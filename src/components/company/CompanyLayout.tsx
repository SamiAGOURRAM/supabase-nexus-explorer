import { ReactNode } from 'react';
import CompanySidebar from './CompanySidebar';

interface CompanyLayoutProps {
  children: ReactNode;
  onSignOut: () => void;
}

export default function CompanyLayout({ children, onSignOut }: CompanyLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex">
      <CompanySidebar onSignOut={onSignOut} />
      <main className="flex-1 w-full md:w-auto overflow-auto pt-16 md:pt-0">
        {children}
      </main>
    </div>
  );
}
