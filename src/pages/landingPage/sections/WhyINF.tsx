import { Building2, Handshake, TrendingUp, Users2 } from "lucide-react";

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
        "Exclusive Networking Events",
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
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Why an INF?
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            The INF provides unparalleled access to internship pathways,
            industry mentorship, and a supportive community that helps you grow
            as a future hospitality leader.
          </p>
        </div>

        {/* Reasons Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">
          {reasons.map((reason, index) => {
            const Icon = reason.icon;
            return (
              <div key={index} className="relative">
                <div className="bg-gray-50 rounded-2xl p-10 h-full border-2 border-gray-100 hover:border-[#007e40] transition-all duration-300">
                  {/* Icon */}
                  <div className="w-16 h-16 bg-gradient-to-br from-[#007e40] to-[#005a2d] rounded-xl flex items-center justify-center mb-6">
                    <Icon size={32} className="text-white" />
                  </div>

                  {/* Title */}
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    {reason.title}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-700 mb-6 leading-relaxed">
                    {reason.description}
                  </p>

                  {/* Features */}
                  <ul className="space-y-3">
                    {reason.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center text-gray-600">
                        <div className="w-2 h-2 bg-[#ffb300] rounded-full mr-3" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {/* Learn More Button */}
                  <button className="mt-6 text-[#007e40] font-semibold hover:text-[#005a2d] transition-colors flex items-center gap-2 group">
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
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Stats Section */}
        <div className="bg-gradient-to-br from-[#007e40] to-[#005a2d] rounded-3xl p-12 text-white">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { icon: TrendingUp, value: "95%", label: "Placement Rate" },
              { icon: Handshake, value: "200+", label: "Internships Secured" },
              { icon: Building2, value: "50+", label: "Partner Companies" },
              { icon: Users2, value: "500+", label: "Students Reached" },
            ].map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="text-center">
                  <Icon size={32} className="mx-auto mb-4 text-[#ffb300]" />
                  <div className="text-4xl font-bold mb-2">{stat.value}</div>
                  <div className="text-gray-200 text-sm">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyINF;
