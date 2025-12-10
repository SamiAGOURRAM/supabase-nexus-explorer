import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { 
  LayoutDashboard, 
  Briefcase, 
  Building2, 
  Calendar, 
  User,
  Menu,
  X
} from 'lucide-react';

interface StudentSidebarProps {
  onSignOut: () => void;
}

export default function StudentSidebar({ onSignOut }: StudentSidebarProps) {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    if (path === '/student') {
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
      {/* Top Navigation Bar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? "bg-transparent backdrop-blur-xl shadow-lg" 
          : "bg-[#1a1f3a] shadow-md"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo/Brand */}
            <div className="flex-shrink-0">
              <Link to="/" className="flex items-center group">
                <img
                  src={isScrolled ? "/logos/2.svg" : "/logos/1.svg"}
                  alt="INF Logo"
                  className="h-44 w-auto transition-all duration-300 group-hover:scale-105"
                />
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 font-semibold ${
                      isScrolled
                        ? active
                          ? 'text-[#ffb300] bg-[#ffb300]/10'
                          : 'text-gray-900 hover:text-[#ffb300] hover:bg-[#ffb300]/10'
                        : active
                        ? 'text-[#ffb300] bg-white/10'
                        : 'text-white hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.title}</span>
                  </Link>
                );
              })}
            </div>

            {/* Desktop Sign Out Button */}
            <div className="hidden lg:block">
              <button
                onClick={onSignOut}
                className="bg-[#ffb300] text-white px-6 py-2.5 rounded-lg hover:bg-[#e6a200] transition-all duration-200 font-semibold shadow-lg hover:shadow-xl hover:scale-105"
              >
                Sign Out
              </button>
            </div>

            {/* Mobile Menu Button */}
            <div className="lg:hidden flex items-center gap-3">
              <button
                onClick={onSignOut}
                className={`px-4 py-2 rounded-lg transition-all duration-200 font-semibold text-sm ${
                  isScrolled
                    ? "bg-[#ffb300] text-white hover:bg-[#e6a200] shadow-md"
                    : "bg-[#ffb300] text-white hover:bg-[#e6a200] shadow-lg"
                }`}
              >
                Sign Out
              </button>
              <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-2 rounded-lg transition-all ${
                  isScrolled
                    ? "text-gray-900 hover:bg-gray-100"
                    : "text-white hover:bg-white/10"
                }`}
              >
                {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isOpen && (
            <div className={`lg:hidden pb-4 border-t ${
              isScrolled 
                ? "bg-white border-gray-200" 
                : "bg-[#1a1f3a] border-white/10"
            }`}>
              <div className="flex flex-col space-y-1 pt-4">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-semibold ${
                        isScrolled
                          ? active
                            ? 'text-[#ffb300] bg-[#ffb300]/10'
                            : 'text-gray-900 hover:text-[#ffb300] hover:bg-[#ffb300]/10'
                          : active
                          ? 'text-[#ffb300] bg-white/10'
                          : 'text-white hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.title}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Spacer */}
      <div className="h-20" />
    </>
  );
}

