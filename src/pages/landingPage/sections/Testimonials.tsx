import { Quote } from "lucide-react";

const Testimonials = () => {
  const testimonials = [
    {
      name: "Sofia Dakir",
      role: "Mandarin Oriental Hotel Group",
      quote:
        "INF was my gateway into the hospitality world. It helped me secure an F&B internship at Mandarin Oriental Marrakech, a defining moment that shaped my vision and growth.",
      image: "👩‍💼",
    },
    {
      name: "Mohamed Ibenbba",
      role: "Relais & Châteaux",
      quote:
        "INF gave me access to my first professional internship with a globally renowned brand. The networking and exposure were invaluable.",
      image: "👨‍💼",
    },
    {
      name: "Chahd Bouskrirou",
      role: "St. Regis Hotels",
      quote:
        "As a second-year student, INF connected me with industry leaders and led to an internship in Butler Service at St. Regis La Bahia Blanca Resort. Networking truly changes everything.",
      image: "👩‍🎓",
    },
  ];

  return (
    <section className="py-24 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Real Stories From SHBM Students
          </h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Discover how INF has helped students launch their careers in the
            hospitality industry
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105"
            >
              {/* Quote Icon */}
              <div className="mb-6">
                <Quote size={40} className="text-[#ffb300]" />
              </div>

              {/* Quote Text */}
              <p className="text-gray-200 text-lg mb-8 leading-relaxed italic">
                "{testimonial.quote}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-4 pt-6 border-t border-white/20">
                <div className="text-4xl">{testimonial.image}</div>
                <div>
                  <div className="font-bold text-white text-lg">
                    {testimonial.name}
                  </div>
                  <div className="text-[#ffb300] text-sm">
                    {testimonial.role}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
