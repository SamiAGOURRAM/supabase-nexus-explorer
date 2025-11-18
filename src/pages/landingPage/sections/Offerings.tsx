import { Briefcase, GraduationCap, Users } from "lucide-react";

const Offerings = () => {
  const offerings = [
    {
      icon: Briefcase,
      title: "Internship Opportunities",
      description:
        "Connect with leading hotels and hospitality groups actively seeking talented interns.",
      details:
        "Access exclusive listings, tailored roles, and hands-on experiences that set the foundation for your career.",
      color: "#ffb300",
    },
    {
      icon: Users,
      title: "Networking Events",
      description:
        "Engage directly with industry professionals through curated networking sessions.",
      details:
        "Build meaningful relationships, expand your circle, and meet future colleagues and mentors.",
      color: "#007e40",
    },
    {
      icon: GraduationCap,
      title: "Workshops & Seminars",
      description:
        "Participate in expert-led workshops, guest lectures, and skill-building sessions.",
      details:
        "Gain practical insights, industry knowledge, and the confidence needed to excel in your internships.",
      color: "#f8231d",
    },
  ];

  return (
    <section id="offerings" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Explore Our Key Offerings
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Discover opportunities designed to connect students with top-tier
            hospitality companies and industry experts.
          </p>
        </div>

        {/* Offerings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {offerings.map((offering, index) => {
            const Icon = offering.icon;
            return (
              <div
                key={index}
                className="group bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border border-gray-100"
              >
                {/* Icon */}
                <div
                  className="w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300"
                  style={{ backgroundColor: `${offering.color}20` }}
                >
                  <Icon size={32} style={{ color: offering.color }} />
                </div>

                {/* Number Badge */}
                <div
                  className="text-sm font-bold mb-3"
                  style={{ color: offering.color }}
                >
                  0{index + 1}
                </div>

                {/* Title */}
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  {offering.title}
                </h3>

                {/* Description */}
                <p className="text-gray-700 mb-4 font-medium">
                  {offering.description}
                </p>

                {/* Details */}
                <p className="text-gray-600 text-sm leading-relaxed">
                  {offering.details}
                </p>

                {/* Hover indicator */}
                <div
                  className="mt-6 h-1 w-0 group-hover:w-full transition-all duration-300 rounded-full"
                  style={{ backgroundColor: offering.color }}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Offerings;
