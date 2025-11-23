import { Award, Heart, Target } from "lucide-react";
import DecorativeShape from "../../landingPage/components/DecorativeShape";

const AboutValues = () => {
  const values = [
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
  ];

  return (
    <section className="py-24 bg-[#f5f5f0] relative overflow-hidden">
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
        <div className="text-center mb-12">
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            Our Core Values
          </h2>
          <p className="text-lg text-gray-600">
            The principles that guide everything we do
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {values.map((value, index) => {
            const Icon = value.icon;
            return (
              <div
                key={index}
                className="text-center p-8 rounded-2xl bg-white hover:shadow-lg transition-all duration-300"
              >
                <div
                  className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
                  style={{ backgroundColor: `${value.color}20` }}
                >
                  <Icon size={36} style={{ color: value.color }} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">
                  {value.title}
                </h3>
                <p className="text-gray-700 leading-relaxed">
                  {value.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default AboutValues;
