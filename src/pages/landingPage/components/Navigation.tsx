import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const Navigation = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isInVideoSection, setIsInVideoSection] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const viewportHeight = window.innerHeight;
      setIsScrolled(scrollPosition > 50);
      // Check if we're in the Hero/video section (first screen)
      setIsInVideoSection(scrollPosition < viewportHeight * 0.8);
    };

    // Initial check
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "About", href: "/about" },
    { name: "Offerings", href: "/offers" },
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
            <Link to="/" className="flex items-center group">
              <img
                src={isInVideoSection ? "/logos/1.svg" : "/logos/2.svg"}
                alt="INF Logo"
                className="h-32 sm:h-36 md:h-40 lg:h-44 w-auto transition-all duration-300 group-hover:scale-105"
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {navLinks.map((link) => {
              const isHashLink = link.href.startsWith("#");
              const className = `px-4 py-2 rounded-lg transition-all duration-200 font-semibold text-base ${
                isInVideoSection
                  ? "text-white hover:text-[#ffb300] hover:bg-[#ffb300]/10"
                  : "text-gray-900 hover:text-[#ffb300] hover:bg-[#ffb300]/10"
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

          {/* Desktop Sign In Button */}
          <div className="hidden lg:block">
            <button
              onClick={() => navigate("/login")}
              className="bg-[#ffb300] text-white px-6 py-3 rounded-lg hover:bg-[#e6a200] transition-all duration-200 font-semibold text-base shadow-lg hover:shadow-xl hover:scale-105"
            >
              Sign In
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="lg:hidden flex items-center gap-3">
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
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`p-2 rounded-lg transition-all ${
                isInVideoSection
                  ? "text-white hover:text-[#ffb300] hover:bg-[#ffb300]/10"
                  : "text-gray-900 hover:text-[#ffb300] hover:bg-[#ffb300]/10"
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
                const className = `px-4 py-3 rounded-lg transition-all duration-200 font-semibold text-base ${
                  isInVideoSection
                    ? "text-white hover:text-[#ffb300] hover:bg-[#ffb300]/10"
                    : "text-gray-900 hover:text-[#ffb300] hover:bg-[#ffb300]/10"
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
