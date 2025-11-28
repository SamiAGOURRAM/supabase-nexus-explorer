import { Mail, MapPin } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const Footer = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleScrollToSection = (sectionId: string, e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    
    // If we're on the landing page, scroll to the section
    if (location.pathname === '/') {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          // Account for fixed header if needed
          const headerOffset = 80;
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }
      }, 50);
    } else {
      // If we're on a different page, navigate to landing page with hash
      navigate(`/#${sectionId}`);
      // Store the section ID to scroll after navigation
      sessionStorage.setItem('scrollToSection', sectionId);
    }
  };

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <a href="/" className="inline-block mb-4">
              <img src="/logos/1.svg" alt="INF Logo" className="h-32 sm:h-36 md:h-40 lg:h-44 w-auto" />
            </a>
            <p className="text-gray-400 mb-4">
              The Internship & Networking Forum at SHBM — UM6P. Your gateway to
              hospitality careers and industry connections.
            </p>
            <p className="text-sm text-gray-500">
              School of Hospitality & Business Management
              <br />
              Université Mohammed VI Polytechnique
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="/offers"
                  className="text-gray-400 hover:text-[#ffb300] transition-colors"
                >
                  Offerings
                </a>
              </li>
              <li>
                <a
                  href="#about"
                  onClick={(e) => handleScrollToSection('about', e)}
                  className="text-gray-400 hover:text-[#ffb300] transition-colors cursor-pointer"
                >
                  About INF
                </a>
              </li>
              <li>
                <a
                  href="/aboutheinf"
                  className="text-gray-400 hover:text-[#ffb300] transition-colors"
                >
                  About the INF
                </a>
              </li>
              <li>
                <a
                  href="/login"
                  className="text-gray-400 hover:text-[#ffb300] transition-colors"
                >
                  Student Portal
                </a>
              </li>
              <li>
                <a
                  href="/login"
                  className="text-gray-400 hover:text-[#ffb300] transition-colors"
                >
                  Company Portal
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-start">
                <Mail size={18} className="mr-2 mt-1 text-[#ffb300]" />
                <span className="text-gray-400 text-sm">inf.um6p@um6p.ma</span>
              </li>
              <li className="flex items-start">
                <MapPin size={18} className="mr-2 mt-1 text-[#ffb300]" />
                <span className="text-gray-400 text-sm">
                  UM6P Campus
                  <br />
                  Ben Guerir, Morocco
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center">
          <p className="text-gray-400 text-sm">
            © {new Date().getFullYear()} INF - Internship & Networking Forum.
            All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
