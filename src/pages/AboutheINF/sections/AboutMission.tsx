import { ArrowRight, FileText, Clock, BarChart3, Leaf, Zap, CheckCircle2 } from "lucide-react";
import DecorativeShape from "../../landingPage/components/DecorativeShape";

const AboutMission = () => {
  const features = [
    {
      icon: Leaf,
      title: "Paperless & Sustainable",
      description: "Replacing printed materials with digital schedules, tickets, and forms.",
      color: "bg-green-50 border-green-200",
      iconColor: "text-green-600",
    },
    {
      icon: Zap,
      title: "Automated Registration & Ticketing",
      description: "A structured, reliable system that simplified check-in and enhanced event logistics.",
      color: "bg-yellow-50 border-yellow-200",
      iconColor: "text-yellow-600",
    },
    {
      icon: Clock,
      title: "Speed Recruiting Booking System",
      description: "Students could book interview slots directly from the platform, ensuring an organized flow for recruiters and participants.",
      color: "bg-blue-50 border-blue-200",
      iconColor: "text-blue-600",
    },
    {
      icon: BarChart3,
      title: "Real-Time Analytics Dashboard",
      description: "Organizers gained instant insights into attendance, engagement, and recruitment impact—an essential tool for continuous optimization.",
      color: "bg-purple-50 border-purple-200",
      iconColor: "text-purple-600",
    },
  ];

  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-gradient-to-b from-[#f5f5f0] to-white relative overflow-hidden">
      {/* Decorative Shapes */}
      <DecorativeShape
        position="top-left"
        size="md"
        opacity={0.08}
        rotation={0}
      />
      <DecorativeShape
        position="bottom-right"
        size="sm"
        opacity={0.06}
        rotation={90}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-[#ffb300]/10 rounded-full mb-4 sm:mb-6">
            <ArrowRight className="text-[#ffb300]" size={18} />
            <span className="text-xs sm:text-sm font-semibold text-gray-700">Evolution Timeline</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6">
            The Evolution of INF
          </h2>
          <div className="flex items-center justify-center gap-2 sm:gap-4 text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800">
            <span className="px-4 sm:px-6 py-2 sm:py-3 bg-gray-100 rounded-lg text-sm sm:text-base lg:text-xl">2022</span>
            <ArrowRight className="text-[#ffb300]" size={24} />
            <span className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-[#ffb300] to-[#e6a200] text-white rounded-lg shadow-lg text-sm sm:text-base lg:text-xl">2025</span>
          </div>
        </div>

        {/* Comparison Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-12 sm:mb-16">
          {/* 2022 - Old System */}
          <div className="relative">
            <div className="bg-white rounded-xl lg:rounded-2xl p-6 sm:p-8 shadow-lg border-2 border-gray-200 h-full">
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <FileText className="text-gray-600" size={20} />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900">INF 2022</h3>
              </div>
              <p className="text-base sm:text-lg text-gray-700 mb-4 sm:mb-6 leading-relaxed">
                Relied heavily on manual processes—printed schedules, paper forms, basic coordination.
              </p>
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  <span className="text-sm sm:text-base text-gray-600">Printed schedules and forms</span>
                </div>
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  <span className="text-sm sm:text-base text-gray-600">Manual coordination</span>
                </div>
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="w-2 h-2 bg-gray-400 rounded-full mt-2 flex-shrink-0" />
                  <span className="text-sm sm:text-base text-gray-600">Basic paper-based system</span>
                </div>
              </div>
            </div>
            {/* Decorative element - hidden on mobile */}
            <div className="hidden md:block absolute -bottom-4 -right-4 w-20 h-20 lg:w-24 lg:h-24 bg-gray-200 rounded-xl lg:rounded-2xl -z-10 opacity-50" />
          </div>

          {/* 2025 - New System */}
          <div className="relative">
            <div className="bg-gradient-to-br from-[#ffb300] to-[#e6a200] rounded-xl lg:rounded-2xl p-6 sm:p-8 shadow-xl text-white h-full transform hover:scale-[1.02] transition-transform duration-300">
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center flex-shrink-0">
                  <Zap className="text-white" size={20} />
                </div>
                <h3 className="text-xl sm:text-2xl font-bold text-white">INF 2025</h3>
              </div>
              <p className="text-base sm:text-lg text-white/95 mb-4 sm:mb-6 leading-relaxed">
                A digital-first recruitment experience, powered by a single centralized platform.
              </p>
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-start gap-2 sm:gap-3">
                  <CheckCircle2 className="text-white mt-1 flex-shrink-0" size={16} />
                  <span className="text-sm sm:text-base text-white/95">Fully digitalized platform</span>
                </div>
                <div className="flex items-start gap-2 sm:gap-3">
                  <CheckCircle2 className="text-white mt-1 flex-shrink-0" size={16} />
                  <span className="text-sm sm:text-base text-white/95">Automated systems</span>
                </div>
                <div className="flex items-start gap-2 sm:gap-3">
                  <CheckCircle2 className="text-white mt-1 flex-shrink-0" size={16} />
                  <span className="text-sm sm:text-base text-white/95">Real-time analytics</span>
                </div>
              </div>
            </div>
            {/* Decorative element - hidden on mobile */}
            <div className="hidden md:block absolute -bottom-4 -right-4 w-20 h-20 lg:w-24 lg:h-24 bg-[#ffb300] rounded-xl lg:rounded-2xl -z-10 opacity-30" />
          </div>
        </div>

        {/* Key Features Section */}
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8 sm:mb-12">
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4">
              Key Features of INF 2025
            </h3>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto px-4">
              The new platform introduced several improvements that elevated the event experience:
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className={`bg-white p-5 sm:p-6 rounded-xl border-2 ${feature.color} hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className={`flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-lg ${feature.color} flex items-center justify-center`}>
                      <Icon className={feature.iconColor} size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                        {feature.title}
                      </h4>
                      <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutMission;
