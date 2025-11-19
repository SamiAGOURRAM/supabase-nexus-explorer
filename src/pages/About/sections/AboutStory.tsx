import DecorativeShape from "../../landingPage/components/DecorativeShape";

const AboutStory = () => {
  return (
    <section className="py-24 bg-white relative overflow-hidden">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Image Side */}
          <div className="relative">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
              <img
                src="/landing-page/story-section-image.png"
                alt="SHBM students and industry professionals"
                className="w-full h-full object-cover"
              />
            </div>
            {/* Decorative element */}
            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-[#ffb300] rounded-2xl -z-10" />
          </div>

          {/* Content Side */}
          <div>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              A bridge between students and leading companies in the hospitality
              sector.
            </h2>
            <p className="text-lg text-gray-700 mb-6 leading-relaxed">
              INF was created to empower SHBM students by connecting them
              directly with top-tier hotels, resorts, restaurants, and
              hospitality groups. It is a student-led initiative designed to
              enrich academic learning with real-world experience.
            </p>
            <p className="text-lg text-gray-700 leading-relaxed">
              Over the years, INF has supported students in securing internships
              across prestigious brands, giving them a head start in their
              professional journeys.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutStory;
