import { Link } from 'react-router-dom';
import { LogOut, Building2 } from 'lucide-react';

/**
 * CompanyHeader - Header component for company dashboard
 * 
 * Displays the company name, dashboard title, and navigation buttons.
 * 
 * @component
 * @param companyName - Name of the company
 * @param onSignOut - Callback when sign out button is clicked
 * 
 * @example
 * <CompanyHeader companyName="TechCorp" onSignOut={handleSignOut} />
 */
export default function CompanyHeader({
  companyName,
  onSignOut,
}: {
  companyName: string | null;
  onSignOut: () => void;
}) {
  return (
    <header className="bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{companyName || 'Company Dashboard'}</h1>
              <p className="text-sm text-muted-foreground mt-1">Manage your recruitment</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/company/profile"
              className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg hover:border-primary transition-colors"
            >
              <Building2 className="w-4 h-4" />
              Profile
            </Link>
            <button
              onClick={onSignOut}
              className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}


