import DecorativeShape from "../../landingPage/components/DecorativeShape";

const AboutMission = () => {
  return (
    <section className="py-24 bg-[#f5f5f0] relative overflow-hidden">
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
        <div className="text-center mb-12">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            Our Mission
          </h2>
        </div>

        <div className="max-w-4xl mx-auto">
          <p className="text-lg text-gray-700 leading-relaxed text-center">
            INF was created to empower SHBM students by connecting them directly
            with top-tier hotels, resorts, restaurants, and hospitality groups.
            It is a student-led initiative designed to enrich academic learning
            with real-world experience.
          </p>
          <p className="text-lg text-gray-700 leading-relaxed text-center mt-6">
            Over the years, INF has supported students in securing internships
            across prestigious brands, giving them a head start in their
            professional journeys.
          </p>
        </div>
      </div>
    </section>
  );
};

export default AboutMission;
