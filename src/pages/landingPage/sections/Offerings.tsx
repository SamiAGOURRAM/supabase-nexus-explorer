import { ArrowRight, Briefcase, GraduationCap, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DecorativeShape from "../components/DecorativeShape";

const Offerings = () => {
  const navigate = useNavigate();

  const offerings = [
    {
      icon: Briefcase,
      number: "01",
      title: "Internship Opportunities",
      description:
        "Connect with leading hotels and hospitality groups actively seeking talented interns.",
      details:
        "Access exclusive listings, tailored roles, and hands-on experiences that set the foundation for your career.",
      color: "#ffb300",
      image: "/landing-page/offerings.png",
    },
    {
      icon: Users,
      number: "02",
      title: "Networking Event",
      description:
        "Engage directly with industry professionals through curated networking sessions.",
      details:
        "Build meaningful relationships, expand your circle, and meet future colleagues and mentors.",
      color: "#007e40",
      image: "/landing-page/offerings-2.png",
    },
    {
      icon: GraduationCap,
      number: "03",
      title: "Workshops & Seminars",
      description:
        "Participate in expert-led workshops, guest lectures, and skill-building sessions.",
      details:
        "Gain practical insights, industry knowledge, and the confidence needed to excel in your internships.",
      color: "#f8231d",
      image: "/landing-page/offerings-3.png",
    },
  ];

  return (
    <section
      id="offerings"
      className="py-24 bg-[#f5f5f0] relative overflow-hidden"
    >
      {/* Decorative Shapes */}
      <DecorativeShape
        position="top-left"
        size="md"
        opacity={0.08}
        rotation={0}
      />
      <DecorativeShape
        position="top-right"
        size="sm"
        opacity={0.06}
        rotation={90}
      />
      <DecorativeShape
        position="bottom-right"
        size="md"
        opacity={0.08}
        rotation={0}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-20">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            Explore Our Key Offerings
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
            Discover opportunities designed to connect students with top-tier
            hospitality companies and industry experts.
          </p>
        </div>

        {/* Offerings - Alternating Layout */}
        <div className="space-y-32">
          {offerings.map((offering, index) => {
            const Icon = offering.icon;
            const isEven = index % 2 === 0;

            return (
              <div
                key={index}
                className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${
                  isEven ? "" : "lg:grid-flow-dense"
                }`}
              >
                {/* Image Side */}
                <div className={`relative ${isEven ? "" : "lg:col-start-2"}`}>
                  <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
                    <img
                      src={offering.image}
                      alt={offering.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* Decorative element */}
                  <div
                    className="absolute -bottom-6 -right-6 w-32 h-32 rounded-2xl -z-10"
                    style={{ backgroundColor: offering.color }}
                  />
                </div>

                {/* Content Side */}
                <div className={isEven ? "" : "lg:col-start-1"}>
                  {/* Number Badge */}
                  <div
                    className="text-lg font-bold mb-4 inline-block px-4 py-2 rounded-lg"
                    style={{
                      color: offering.color,
                      backgroundColor: `${offering.color}20`,
                    }}
                  >
                    {offering.number}
                  </div>

                  {/* Icon */}
                  <div
                    className="w-16 h-16 rounded-xl flex items-center justify-center mb-6"
                    style={{ backgroundColor: `${offering.color}20` }}
                  >
                    <Icon size={32} style={{ color: offering.color }} />
                  </div>

                  <h3 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-6">
                    {offering.title}
                  </h3>

                  <p className="text-lg text-gray-700 mb-4 font-medium leading-relaxed">
                    {offering.description}
                  </p>

                  <p className="text-base text-gray-600 mb-8 leading-relaxed">
                    {offering.details}
                  </p>

                  <button
                    onClick={() => navigate("/signup")}
                    className="group px-8 py-3 text-white rounded-lg transition-all duration-300 font-semibold shadow-lg hover:shadow-xl flex items-center gap-2"
                    style={{ backgroundColor: offering.color }}
                    onMouseEnter={(e) => {
                      const r = parseInt(offering.color.slice(1, 3), 16);
                      const g = parseInt(offering.color.slice(3, 5), 16);
                      const b = parseInt(offering.color.slice(5, 7), 16);
                      e.currentTarget.style.backgroundColor = `rgb(${Math.max(
                        0,
                        r - 20
                      )}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)})`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = offering.color;
                    }}
                  >
                    Get Started
                    <ArrowRight
                      size={20}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Offerings;
