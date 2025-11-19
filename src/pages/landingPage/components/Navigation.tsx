import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const Navigation = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsScrolled(scrollPosition > 50);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { name: "Home", href: "/" },
    { name: "About", href: "/about" },
    { name: "Offerings", href: "#offerings" },
    { name: "Contact", href: "/contact" },
  ];

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? "bg-white/95 backdrop-blur-sm shadow-sm" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <a href="/" className="flex items-center">
              <img
                src={isScrolled ? "/logos/2.svg" : "/logos/1.svg"}
                alt="INF Logo"
                className="h-52 w-auto transition-all duration-300"
              />
            </a>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link) => {
              const isHashLink = link.href.startsWith("#");
              const className = `transition-colors duration-200 font-medium ${
                isScrolled
                  ? "text-gray-700 hover:text-[#007e40]"
                  : "text-white hover:text-[#ffb300]"
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
          <button
            onClick={() => navigate("/login")}
            className="bg-[#ffb300] text-white px-6 py-2.5 rounded-lg hover:bg-[#e6a200] transition-all duration-200 font-medium shadow-sm hover:shadow-md"
          >
            Sign In
          </button>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`transition-colors ${
                isScrolled
                  ? "text-gray-700 hover:text-[#007e40]"
                  : "text-white hover:text-[#ffb300]"
              }`}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div
            className={`md:hidden pb-4 transition-all duration-300 ${
              isScrolled ? "bg-white" : "bg-gray-900/95 backdrop-blur-sm"
            }`}
          >
            <div className="flex flex-col space-y-3">
              {navLinks.map((link) => {
                const isHashLink = link.href.startsWith("#");
                const className = `transition-colors duration-200 font-medium py-2 ${
                  isScrolled
                    ? "text-gray-700 hover:text-[#007e40]"
                    : "text-white hover:text-[#ffb300]"
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
              <button
                onClick={() => {
                  navigate("/login");
                  setIsMenuOpen(false);
                }}
                className="bg-[#ffb300] text-white px-6 py-2.5 rounded-lg hover:bg-[#e6a200] transition-all duration-200 font-medium text-left"
              >
                Sign In
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navigation;
