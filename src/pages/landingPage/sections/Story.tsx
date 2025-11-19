import { Award, Heart, Target } from "lucide-react";
import DecorativeShape from "../components/DecorativeShape";

const Story = () => {
  return (
    <section id="about" className="py-24 bg-white relative overflow-hidden">
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
        {/* Main Story */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-24">
          {/* Image Side */}
          <div className="relative">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
              <img
                src="/landing-page/story-section-image.png"
                alt="SHBM students walking through modern building"
                className="w-full h-full object-cover"
              />
            </div>
            {/* Decorative element */}
            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-[#ffb300] rounded-2xl -z-10" />
          </div>

          {/* Content Side */}
          <div>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
              The Story Behind Our Forum
            </h2>
            <p className="text-lg text-gray-700 mb-6 leading-relaxed">
              The Internship & Networking Forum brings together hospitality
              professionals and students, creating an environment of growth,
              mentorship, and real-world opportunity.
            </p>
            <p className="text-lg text-gray-700 mb-8 leading-relaxed">
              Built by SHBM students, powered by industry connections, and
              designed to help you take control of your career journey.
            </p>
            <button className="px-8 py-3 bg-[#ffb300] text-white rounded-lg hover:bg-[#e6a200] transition-all duration-200 font-semibold shadow-lg hover:shadow-xl">
              Learn More
            </button>
          </div>
        </div>

        {/* Core Values */}
        <div className="mt-16  ">
          <div className="text-center mb-12">
            <h3 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Our Core Values
            </h3>
            <p className="text-lg text-gray-600">
              The principles that guide everything we do
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Target,
                title: "Empowerment",
                description:
                  "We help students take ownership of their careers through exposure, experience, and meaningful professional connections.",
                color: "#ffb300",
              },
              {
                icon: Heart,
                title: "Collaboration",
                description:
                  "We bring students and industry leaders together in an environment that fosters shared learning and long-lasting relationships.",
                color: "#007e40",
              },
              {
                icon: Award,
                title: "Excellence",
                description:
                  "Every event, workshop, and interaction is designed with rigor, quality, and industry relevance.",
                color: "#f8231d",
              },
            ].map((value, index) => {
              const Icon = value.icon;
              return (
                <div
                  key={index}
                  className="text-center p-8 rounded-2xl bg-gray-50 hover:bg-white hover:shadow-lg transition-all duration-300"
                >
                  <div
                    className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                    style={{ backgroundColor: `${value.color}20` }}
                  >
                    <Icon size={36} style={{ color: value.color }} />
                  </div>
                  <h4 className="text-2xl font-bold text-gray-900 mb-4">
                    {value.title}
                  </h4>
                  <p className="text-gray-600 leading-relaxed">
                    {value.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Story;
