import { Building2, Handshake, TrendingUp, Users2 } from "lucide-react";
import { Link } from "react-router-dom";
import DecorativeShape from "../components/DecorativeShape";
import { useEffect, useRef, useState } from "react";

const AnimatedStat = ({ 
  icon: Icon, 
  end, 
  label, 
  isPercentage = false 
}: { 
  icon: React.ElementType; 
  end: number; 
  label: string; 
  isPercentage?: boolean;
}) => {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const statRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (statRef.current) {
      observer.observe(statRef.current);
    }

    return () => observer.disconnect();
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    let startTime: number | null = null;
    const duration = 2500;
    
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
  }, [isVisible, end]);

  return (
    <div ref={statRef} className="text-center transform transition-all duration-300 hover:scale-110">
      <Icon size={32} className="mx-auto mb-4 text-[#ffb300] transition-transform duration-300 group-hover:rotate-12" />
      <div className="text-4xl font-bold mb-2 tabular-nums">
        {count.toLocaleString()}{isPercentage ? "%" : "+"}
      </div>
      <div className="text-gray-200 text-sm">{label}</div>
    </div>
  );
};

const WhyINF = () => {
  const reasons = [
    {
      icon: Building2,
      title: "Industry Connections",
      description:
        "Meet top companies and decision-makers in the hospitality sector. Build relationships that matter.",
      features: [
        "50+ Partner Companies",
        "Direct Access to Recruiters",
        "Exclusive Networking Event",
      ],
    },
    {
      icon: Users2,
      title: "Student-Led Initiatives",
      description:
        "Organized by students for students, ensuring a relevant, supportive, career-focused experience.",
      features: [
        "Peer-to-Peer Learning",
        "Student Success Stories",
        "Collaborative Environment",
      ],
    },
  ];

  return (
    <section className="py-24 bg-white relative overflow-hidden">
      {/* Decorative Shapes */}
      <DecorativeShape
        position="top-left"
        size="md"
        opacity={0.1}
        rotation={0}
      />
      <DecorativeShape
        position="top-right"
        size="sm"
        opacity={0.08}
        rotation={90}
      />
      <DecorativeShape
        position="bottom-right"
        size="md"
        opacity={0.08}
        rotation={-90}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Why INF?
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            The INF provides unparalleled access to internship pathways,
            industry mentorship, and a supportive community that helps you grow
            as a future hospitality leader.
          </p>
        </div>

        {/* Reasons - Image Left, Text Right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
          {/* Image Left */}
          <div className="order-2 lg:order-1 relative">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-xl">
              <img
                src="/landing-page/whyinf-2.png"
                alt="Industry connections - professionals networking"
                className="w-full h-full object-cover"
              />
            </div>
            {/* Decorative element */}
            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-[#007e40] rounded-2xl -z-10" />
          </div>

          {/* Text Right */}
          <div className="order-1 lg:order-2">
            <h3 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
              {reasons[0].title}
            </h3>
            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
              Our platform connects students with top companies in the
              hospitality sector, ensuring you meet the right people for your
              career advancement.
            </p>
            <Link
              to="/aboutheinf"
              className="text-[#007e40] font-semibold hover:text-[#005a2d] transition-colors flex items-center gap-2 group inline-block"
            >
              Learn More
              <svg
                className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          </div>
        </div>

        {/* Reasons - Text Left, Image Right */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
          {/* Text Left */}
          <div>
            <h3 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
              {reasons[1].title}
            </h3>
            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
              Organized by students for students, our forum uniquely understands
              the needs of aspiring professionals, fostering a supportive
              community.
            </p>
            <Link
              to="/aboutheinf"
              className="text-[#007e40] font-semibold hover:text-[#005a2d] transition-colors flex items-center gap-2 group inline-block"
            >
              Learn More
              <svg
                className="w-4 h-4 group-hover:translate-x-1 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          </div>

          {/* Image Right */}
          <div className="relative">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-xl">
              <img
                src="/landing-page/whyinf-1.png"
                alt="Student-led initiatives - students in classroom"
                className="w-full h-full object-cover"
              />
            </div>
            {/* Decorative element */}
            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-[#f8231d] rounded-2xl -z-10" />
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-gradient-to-br from-[#007e40] to-[#005a2d] rounded-3xl p-12 text-white">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <AnimatedStat icon={TrendingUp} end={95} label="Placement Rate" isPercentage={true} />
            <AnimatedStat icon={Handshake} end={200} label="Internships Secured" />
            <AnimatedStat icon={Building2} end={50} label="Partner Companies" />
            <AnimatedStat icon={Users2} end={500} label="Students Reached" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyINF;
