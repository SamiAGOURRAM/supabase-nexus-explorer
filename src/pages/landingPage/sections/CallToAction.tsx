import { ArrowRight, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CallToAction = () => {
  const navigate = useNavigate();

  return (
    <section className="py-24 bg-gradient-to-br from-gray-900 via-[#007e40] to-gray-900 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-96 h-96 bg-[#ffb300] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-[#f8231d] rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000" />
      </div>

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

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm rounded-full border border-white/20 mb-8">
          <Sparkles size={16} className="text-[#ffb300]" />
          <span className="text-sm text-white font-medium">
            Start Your Journey Today
          </span>
        </div>

        {/* Heading */}
        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6">
          Join the INF Today
        </h2>

        {/* Description */}
        <p className="text-xl text-gray-200 mb-12 max-w-2xl mx-auto">
          If you are an SHBM Bachelor student (Year 1, 3, or 4) or an IVET trainee, this platform is built for you.
          Connect with leading employers, grow your network, and take the first step toward your future in hospitality.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={() => navigate("/signup")}
            className="group px-10 py-5 bg-[#ffb300] text-white rounded-lg hover:bg-[#e6a200] transition-all duration-300 font-bold text-lg shadow-2xl hover:shadow-3xl hover:scale-105 flex items-center gap-3"
          >
            Register Now
            <ArrowRight
              size={22}
              className="group-hover:translate-x-1 transition-transform"
            />
          </button>
          <button
            onClick={() => navigate("/login")}
            className="px-10 py-5 bg-white text-[#007e40] rounded-lg hover:bg-gray-100 transition-all duration-300 font-bold text-lg shadow-xl"
          >
            Sign In
          </button>
        </div>

        {/* Additional Info */}
        <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {[
            { label: "Free Registration" },
            { label: "Instant Access" },
            { label: "Exclusive Opportunities" },
          ].map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-center gap-2 text-white/90 bg-white/10 backdrop-blur-sm rounded-lg py-3 px-4 border border-white/20"
            >
              <span className="font-medium">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default CallToAction;
