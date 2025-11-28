import { TrendingUp, Sparkles, Target, BarChart3 } from "lucide-react";
import DecorativeShape from "../../landingPage/components/DecorativeShape";

const AboutValues = () => {
  const features = [
    {
      icon: TrendingUp,
      title: "Continuous Growth",
      description: "Built to evolve with each edition, incorporating feedback and industry needs.",
      color: "from-[#007e40] to-[#005a2d]",
      iconBg: "bg-[#007e40]/10",
      iconColor: "text-[#007e40]",
    },
    {
      icon: Sparkles,
      title: "Enhanced Features",
      description: "Improved functionality, better analytics, and an enhanced user experience with every update.",
      color: "from-[#ffb300] to-[#e6a200]",
      iconBg: "bg-[#ffb300]/10",
      iconColor: "text-[#ffb300]",
    },
    {
      icon: BarChart3,
      title: "Data-Driven",
      description: "Powered by analytics and insights to optimize matching and improve outcomes.",
      color: "from-blue-600 to-blue-800",
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-600",
    },
    {
      icon: Target,
      title: "Long-Term Vision",
      description: "Establishing INF as Morocco's most advanced recruitment forum for hospitality.",
      color: "from-purple-600 to-purple-800",
      iconBg: "bg-purple-500/10",
      iconColor: "text-purple-600",
    },
  ];

  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-[#f5f5f0] relative overflow-hidden">
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
        {/* Header */}
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 rounded-full border border-gray-200 mb-6">
            <Sparkles size={16} className="text-[#ffb300]" />
            <span className="text-sm font-semibold text-gray-700">Our Vision</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6">
            A Foundation for the Future
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            The INF Platform is built to grow. Each edition benefits from improved features, better analytics, and enhanced user experience.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="group relative bg-white rounded-2xl p-6 border-2 border-gray-200 hover:border-[#007e40] transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
              >
                {/* Icon */}
                <div className={`${feature.iconBg} ${feature.iconColor} w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <Icon size={24} />
                </div>

                {/* Content */}
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {feature.description}
                </p>

                {/* Gradient Accent */}
                <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-b-2xl`} />
              </div>
            );
          })}
        </div>

        {/* Vision Statement */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-[#007e40] to-[#005a2d] rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
                  backgroundSize: "40px 40px",
                }}
              />
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <Target size={32} className="text-[#ffb300]" />
                <h3 className="text-2xl sm:text-3xl font-bold">Our Long-Term Vision</h3>
              </div>
              <p className="text-base sm:text-lg text-white/95 leading-relaxed">
                To establish INF as Morocco's most advanced recruitment forum for hospitality, supported by a scalable, data-driven digital infrastructure that connects talent with opportunity.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutValues;
