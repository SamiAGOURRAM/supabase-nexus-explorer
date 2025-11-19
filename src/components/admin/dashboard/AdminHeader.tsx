import { LogOut } from 'lucide-react';

/**
 * AdminHeader - Header component for admin dashboard
 * 
 * Displays the admin dashboard title and sign out button.
 * 
 * @component
 * @param onSignOut - Callback when sign out button is clicked
 * 
 * @example
 * <AdminHeader onSignOut={handleSignOut} />
 */
export default function AdminHeader({ onSignOut }: { onSignOut: () => void }) {
  return (
    <header className="bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Welcome back, Admin</p>
          </div>
          <button
            onClick={onSignOut}
            className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}



