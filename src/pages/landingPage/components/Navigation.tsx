import { Menu, X, User, LogOut, ChevronDown } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/lib/supabase";

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, refresh } = useUser();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isInVideoSection, setIsInVideoSection] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Disable video section logic on offers page
  const isOffersPage = location.pathname === '/offers';

  // Get dashboard route based on user role
  const getDashboardRoute = () => {
    if (!profile) return '/student';
    if (profile.role === 'admin') return '/admin';
    if (profile.role === 'company') return '/company';
    return '/student';
  };

  // Handle sign out
  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      setIsUserMenuOpen(false);
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Sign out error:', error);
      }
      await refresh();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setIsSigningOut(false);
    }
  };

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      // Use click instead of mousedown to allow click handlers to run first
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const viewportHeight = window.innerHeight;
      setIsScrolled(scrollPosition > 50);
      // Check if we're in the Hero/video section (first screen) - skip on offers page
      if (!isOffersPage) {
        setIsInVideoSection(scrollPosition < viewportHeight * 0.8);
      } else {
        setIsInVideoSection(false);
      }
    };

    // Initial check
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isOffersPage]);

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "About", href: "/about" },
    { name: "Offers", href: "/offers" },
    { name: "Contact", href: "/contact" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? "bg-white/98 backdrop-blur-md shadow-lg" 
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20 md:h-24">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <a href="/" className="flex items-center group">
              <img
                src={isInVideoSection ? "/logos/1.svg" : "/logos/2.svg"}
                alt="INF Logo"
                className="h-32 sm:h-36 md:h-40 lg:h-44 w-auto transition-all duration-300 group-hover:scale-105"
              />
            </a>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {navLinks.map((link) => {
              const isHashLink = link.href.startsWith("#");
              // On offers page, always use dark text
              const className = `px-4 py-2 rounded-lg transition-all duration-200 font-semibold text-base ${
                isOffersPage || !isInVideoSection
                  ? "text-gray-900 hover:text-[#ffb300] hover:bg-[#ffb300]/10"
                  : "text-white hover:text-[#ffb300] hover:bg-[#ffb300]/10"
              }`;
              return isHashLink ? (
                <a key={link.name} href={link.href} className={className}>
                  {link.name}
                </a>
              ) : (
                <Link key={link.name} to={link.href} className={className}>
                  {link.name}
                </Link>
              );
            })}
          </div>

          {/* Desktop User Menu / Sign In Button */}
          <div className="hidden lg:block">
            {user && profile ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsUserMenuOpen(!isUserMenuOpen);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="flex items-center gap-2 bg-white border-2 border-gray-200 px-4 py-2.5 rounded-lg hover:border-[#ffb300] font-medium text-sm shadow-md hover:shadow-lg cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-full bg-[#ffb300] flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                    {profile.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div className="flex flex-col items-start min-w-0">
                    <span className="text-gray-900 font-semibold text-sm truncate max-w-[120px]">
                      {profile.full_name || 'User'}
                    </span>
                    <span className="text-xs text-gray-500 capitalize truncate max-w-[120px]">
                      {profile.role}
                    </span>
                  </div>
                  <ChevronDown size={16} className="text-gray-500 flex-shrink-0" />
                </button>

                {/* Dropdown Menu */}
                {isUserMenuOpen && (
                  <div 
                    className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-[60]"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <div className="px-4 py-3 border-b border-gray-200">
                      <p className="text-sm font-semibold text-gray-900">{profile.full_name || 'User'}</p>
                      <p className="text-xs text-gray-500 mt-1">{profile.email}</p>
                      <p className="text-xs text-[#ffb300] font-medium mt-1 capitalize">{profile.role}</p>
                    </div>
                    <Link
                      to={getDashboardRoute()}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setIsUserMenuOpen(false);
                        navigate(getDashboardRoute());
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <User size={18} />
                      <span>Go to Dashboard</span>
                    </Link>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSignOut();
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      disabled={isSigningOut}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-left"
                    >
                      <LogOut size={18} />
                      <span>{isSigningOut ? 'Signing out...' : 'Sign Out'}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className="bg-[#ffb300] text-white px-6 py-3 rounded-lg hover:bg-[#e6a200] transition-all duration-200 font-semibold text-base shadow-lg hover:shadow-xl hover:scale-105"
              >
                Sign In
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden flex items-center gap-3">
            {user && profile ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsUserMenuOpen(!isUserMenuOpen);
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="flex items-center gap-2 bg-white border-2 border-gray-200 px-3 py-2 rounded-lg shadow-md cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-full bg-[#ffb300] flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                    {profile.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <ChevronDown size={16} className="text-gray-500 flex-shrink-0" />
                </button>

                {/* Mobile Dropdown Menu */}
                {isUserMenuOpen && (
                  <div 
                    className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-[60]"
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    <div className="px-4 py-3 border-b border-gray-200">
                      <p className="text-sm font-semibold text-gray-900">{profile.full_name || 'User'}</p>
                      <p className="text-xs text-gray-500 mt-1">{profile.email}</p>
                      <p className="text-xs text-[#ffb300] font-medium mt-1 capitalize">{profile.role}</p>
                    </div>
                    <Link
                      to={getDashboardRoute()}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setIsUserMenuOpen(false);
                        setIsMenuOpen(false);
                        navigate(getDashboardRoute());
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <User size={18} />
                      <span>Go to Dashboard</span>
                    </Link>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSignOut();
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      disabled={isSigningOut}
                      className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-left"
                    >
                      <LogOut size={18} />
                      <span>{isSigningOut ? 'Signing out...' : 'Sign Out'}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className={`px-4 py-2 rounded-lg transition-all duration-200 font-semibold text-sm ${
                  isScrolled
                    ? "bg-[#ffb300] text-white hover:bg-[#e6a200] shadow-md"
                    : "bg-[#ffb300] text-white hover:bg-[#e6a200] shadow-lg"
                }`}
              >
                Sign In
              </button>
            )}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`p-2 rounded-lg transition-all ${
                isOffersPage || !isInVideoSection
                  ? "text-gray-900 hover:text-[#ffb300] hover:bg-[#ffb300]/10"
                  : "text-white hover:text-[#ffb300] hover:bg-[#ffb300]/10"
              }`}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div
            className={`lg:hidden pb-6 transition-all duration-300 border-t ${
              isScrolled 
                ? "bg-white border-gray-200" 
                : "bg-white/98 backdrop-blur-md border-gray-200"
            }`}
          >
            <div className="flex flex-col space-y-1 pt-4">
              {navLinks.map((link) => {
                const isHashLink = link.href.startsWith("#");
                // On offers page, always use dark text
                const className = `px-4 py-3 rounded-lg transition-all duration-200 font-semibold text-base ${
                  isOffersPage || !isInVideoSection
                    ? "text-gray-900 hover:text-[#ffb300] hover:bg-[#ffb300]/10"
                    : "text-white hover:text-[#ffb300] hover:bg-[#ffb300]/10"
                }`;
                return isHashLink ? (
                  <a
                    key={link.name}
                    href={link.href}
                    className={className}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.name}
                  </a>
                ) : (
                  <Link
                    key={link.name}
                    to={link.href}
                    className={className}
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {link.name}
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
