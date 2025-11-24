import { ReactNode } from 'react';
import AdminSidebar from './AdminSidebar';

interface AdminLayoutProps {
  children: ReactNode;
  onSignOut: () => void;
}

export default function AdminLayout({ children, onSignOut }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex">
      <AdminSidebar onSignOut={onSignOut} />
      <main className="flex-1 w-full md:w-auto overflow-auto pt-16 md:pt-0">
        {children}
      </main>
    </div>
  );
}

