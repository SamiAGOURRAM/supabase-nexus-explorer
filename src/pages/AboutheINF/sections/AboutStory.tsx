import DecorativeShape from "../../landingPage/components/DecorativeShape";

const AboutStory = () => {
  return (
    <section className="py-16 sm:py-20 lg:py-24 bg-white relative overflow-hidden">
      {/* Decorative Shapes */}
      <DecorativeShape
        position="top-right"
        size="lg"
        opacity={0.1}
        rotation={90}
      />
      <DecorativeShape
        position="bottom-left"
        size="md"
        opacity={0.08}
        rotation={0}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Image Side */}
          <div className="relative order-2 lg:order-1">
            <div className="aspect-[4/3] rounded-xl lg:rounded-2xl overflow-hidden shadow-xl lg:shadow-2xl">
              <img
                src="/landing-page/whyinf-1.png"
                alt="INF Platform connecting students and recruiters"
                className="w-full h-full object-cover"
              />
            </div>
            {/* Decorative element - hidden on mobile */}
            <div className="hidden md:block absolute -bottom-4 -right-4 lg:-bottom-6 lg:-right-6 w-24 h-24 lg:w-32 lg:h-32 bg-[#ffb300] rounded-xl lg:rounded-2xl -z-10" />
          </div>

          {/* Content Side */}
          <div className="order-1 lg:order-2">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6">
              Why the INF Platform Matters
            </h2>
            <p className="text-base sm:text-lg text-gray-700 mb-4 sm:mb-6 leading-relaxed">
              The platform is more than a digital tool—it is a strategic bridge between SHBM talent and the hospitality industry.
            </p>
            <p className="text-base sm:text-lg text-gray-700 mb-3 sm:mb-4 leading-relaxed font-semibold">
              It supports:
            </p>
            <ul className="space-y-2 sm:space-y-3">
              <li className="text-base sm:text-lg text-gray-700 leading-relaxed flex items-start">
                <span className="text-[#ffb300] mr-2 sm:mr-3 font-bold flex-shrink-0 mt-1">•</span>
                <span>Efficient communication between students and recruiters</span>
              </li>
              <li className="text-base sm:text-lg text-gray-700 leading-relaxed flex items-start">
                <span className="text-[#ffb300] mr-2 sm:mr-3 font-bold flex-shrink-0 mt-1">•</span>
                <span>High-quality interview scheduling</span>
              </li>
              <li className="text-base sm:text-lg text-gray-700 leading-relaxed flex items-start">
                <span className="text-[#ffb300] mr-2 sm:mr-3 font-bold flex-shrink-0 mt-1">•</span>
                <span>Clear visibility on internship opportunities</span>
              </li>
              <li className="text-base sm:text-lg text-gray-700 leading-relaxed flex items-start">
                <span className="text-[#ffb300] mr-2 sm:mr-3 font-bold flex-shrink-0 mt-1">•</span>
                <span>Stronger, more structured industry relationships</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutStory;
