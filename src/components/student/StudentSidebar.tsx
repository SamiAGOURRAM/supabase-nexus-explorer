import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Briefcase, 
  Building2, 
  Calendar, 
  User,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useState } from 'react';

interface StudentSidebarProps {
  onSignOut: () => void;
}

export default function StudentSidebar({ onSignOut }: StudentSidebarProps) {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/student') {
      // Dashboard should be highlighted when on /student exactly
      return location.pathname === '/student';
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const navItems = [
    {
      title: 'Dashboard',
      path: '/student',
      icon: LayoutDashboard,
    },
    {
      title: 'Offers',
      path: '/student/offers',
      icon: Briefcase,
    },
    {
      title: 'Companies',
      path: '/student/companies',
      icon: Building2,
    },
    {
      title: 'Bookings',
      path: '/student/bookings',
      icon: Calendar,
    },
    {
      title: 'Profile',
      path: '/student/profile',
      icon: User,
    },
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-card border border-border rounded-lg shadow-sm"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky top-0 left-0 z-40
        w-64 bg-card border-r border-border min-h-screen flex flex-col
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo/Header */}
        <div className="p-6 border-b border-border flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-foreground">Student Portal</h2>
            <p className="text-xs text-muted-foreground mt-1">Dashboard</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  active
                    ? 'bg-primary text-primary-foreground shadow-soft'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">{item.title}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

