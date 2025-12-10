import { ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { useUser } from "@/contexts/UserContext";
import { supabase } from "@/lib/supabase";

const AnimatedCounter = ({ end, duration = 2500, label }: { end: number; duration?: number; label: string }) => {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const counterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (counterRef.current) {
      observer.observe(counterRef.current);
    }

    return () => observer.disconnect();
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    let startTime: number | null = null;
    
    // Easing function for smooth deceleration
    const easeOutExpo = (x: number): number => {
      return x === 1 ? 1 : 1 - Math.pow(2, -10 * x);
    };

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // Apply easing for smoother animation
      const easedProgress = easeOutExpo(progress);
      setCount(Math.floor(easedProgress * end));
      
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }, [isVisible, end, duration]);

  return (
    <div ref={counterRef} className="text-center transform transition-all duration-300 hover:scale-110">
      <div className="text-3xl sm:text-4xl font-bold text-[#ffb300] mb-2 tabular-nums">
        {count.toLocaleString()}+
      </div>
      <div className="text-sm text-gray-400 uppercase tracking-wider">
        {label}
      </div>
    </div>
  );
};

const Hero = () => {
  const navigate = useNavigate();
  const { user } = useUser();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setIsAuthenticated(!!session);
    };
    checkAuth();
  }, [user]);

  const handleGetStarted = () => {
    if (isAuthenticated) {
      navigate("/offers");
    } else {
      navigate("/signup");
    }
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background GIF */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/landing-page/hero-image.gif')",
        }}
      />

      {/* Dark Blue Overlay */}
      <div className="absolute inset-0 bg-[#1a1f3a]/70" />

      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-[#ffb300] rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-[#007e40] rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse delay-1000" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-8">
          <Sparkles size={16} className="text-[#ffb300]" />
          <span className="text-sm text-white font-medium">
            Welcome to the Soul of Our Vision
          </span>
        </div>

        {/* Main Heading */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
          Connect. Network.{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#ffb300] via-[#ffc940] to-[#ffb300]">
            Build.
          </span>
        </h1>

        {/* Subheading */}
        <p className="text-xl sm:text-2xl text-gray-300 mb-4 max-w-4xl mx-auto font-light">
          The Internship & Networking Forum (INF) at SHBM — UM6P
        </p>

        <p className="text-lg text-gray-400 mb-10 max-w-3xl mx-auto">
          Your gateway to hospitality careers, industry leaders, and exclusive
          internship opportunities.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={handleGetStarted}
            className="group px-8 py-4 bg-[#ffb300] text-white rounded-lg hover:bg-[#e6a200] transition-all duration-300 font-semibold text-lg shadow-xl hover:shadow-2xl hover:scale-105 flex items-center gap-2"
          >
            Get Started
            <ArrowRight
              size={20}
              className="group-hover:translate-x-1 transition-transform"
            />
          </button>
          <button
            onClick={() => navigate("/about")}
            className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-lg hover:bg-white/20 transition-all duration-300 font-semibold text-lg border border-white/20"
          >
            Learn More
          </button>
        </div>

        {/* Stats */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
          <AnimatedCounter end={500} label="Students" />
          <AnimatedCounter end={50} label="Companies" />
          <AnimatedCounter end={200} label="Internships" />
          <AnimatedCounter end={10} label="Events" />
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-white/30 rounded-full flex items-start justify-center p-2">
          <div className="w-1.5 h-3 bg-[#ffb300] rounded-full" />
        </div>
      </div>
    </section>
  );
};

export default Hero;
