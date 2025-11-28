import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Footer from "./components/Footer";
import Navigation from "./components/Navigation";
import CallToAction from "./sections/CallToAction";
import Hero from "./sections/Hero";
import Offerings from "./sections/Offerings";
import Story from "./sections/Story";
import Testimonials from "./sections/Testimonials";
import WhyINF from "./sections/WhyINF";

const LandingPage = () => {
  const location = useLocation();

  useEffect(() => {
    // Handle hash navigation when page loads
    const hash = location.hash.replace('#', '');
    const scrollToSection = sessionStorage.getItem('scrollToSection');
    const sectionId = hash || scrollToSection;

    if (sectionId) {
      // Wait for DOM to be ready
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          const headerOffset = 80;
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
          
          // Clear session storage after scrolling
          if (scrollToSection) {
            sessionStorage.removeItem('scrollToSection');
          }
        }
      }, 100);
    }
  }, [location.hash, location.pathname]);

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <Hero />
      <Offerings />
      <Story />
      <Testimonials />
      <WhyINF />
      <CallToAction />
      <Footer />
    </div>
  );
};

export default LandingPage;
