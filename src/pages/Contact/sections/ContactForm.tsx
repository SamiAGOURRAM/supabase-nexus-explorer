import { Instagram, Mail, MapPin, Phone } from "lucide-react";
import { useState } from "react";

const ContactForm = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission here
    console.log("Form submitted:", formData);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          {/* Left Column - Contact Information */}
          <div>
            <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6 font-serif">
              We'd Love to Hear From You!
            </h2>
            <div className="w-20 h-1 bg-[#ffb300] mb-8" />

            <div className="space-y-6">
              {/* Address */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-[#007e40]/10 flex items-center justify-center flex-shrink-0">
                  <MapPin size={24} className="text-[#007e40]" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Address</h3>
                  <p className="text-gray-600">
                    Lot 660, Ben Guerir 43150
                    <br />
                    UM6P Campus
                    <br />
                    Morocco
                  </p>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-[#007e40]/10 flex items-center justify-center flex-shrink-0">
                  <Mail size={24} className="text-[#007e40]" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Email</h3>
                  <a
                    href="mailto:inf@um6p.ma"
                    className="text-[#007e40] hover:text-[#005a2d] transition-colors"
                  >
                    inf@um6p.ma
                  </a>
                  <div className="mt-3">
                    <a
                      href="mailto:partners@inf-platform.ma"
                      className="text-[#007e40] hover:text-[#005a2d] transition-colors block"
                    >
                      partners@inf-platform.ma
                    </a>
                    <span className="text-sm text-gray-500">
                      (For Companies)
                    </span>
                  </div>
                  <div className="mt-2">
                    <a
                      href="mailto:students@inf-platform.ma"
                      className="text-[#007e40] hover:text-[#005a2d] transition-colors block"
                    >
                      students@inf-platform.ma
                    </a>
                    <span className="text-sm text-gray-500">
                      (For Students)
                    </span>
                  </div>
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-[#007e40]/10 flex items-center justify-center flex-shrink-0">
                  <Phone size={24} className="text-[#007e40]" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Phone</h3>
                  <p className="text-gray-600">+212 5XX-XXXXXX</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Monday–Friday, 09:00–18:00
                  </p>
                </div>
              </div>

              {/* Social Media */}
              <div className="flex items-start gap-4 pt-4">
                <div className="w-12 h-12 rounded-lg bg-[#007e40]/10 flex items-center justify-center flex-shrink-0">
                  <Instagram size={24} className="text-[#007e40]" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Follow Us
                  </h3>
                  <a
                    href="#"
                    className="text-[#007e40] hover:text-[#005a2d] transition-colors"
                    aria-label="Instagram"
                  >
                    @inf_shbm
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Contact Form */}
          <div className="bg-gray-50 rounded-2xl p-8 lg:p-10">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              Send us a Message
            </h3>
            <p className="text-gray-600 mb-8">
              Have a question, a request, or need assistance? Send us a message
              and our team will get back to you shortly.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Full Name */}
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Full Name <span className="text-[#f8231d]">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#007e40] focus:border-[#007e40] transition-all outline-none"
                  placeholder="Your full name"
                />
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Email <span className="text-[#f8231d]">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#007e40] focus:border-[#007e40] transition-all outline-none"
                  placeholder="your.email@example.com"
                />
              </div>

              {/* Message */}
              <div>
                <label
                  htmlFor="message"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Message <span className="text-[#f8231d]">*</span>
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={6}
                  value={formData.message}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#007e40] focus:border-[#007e40] transition-all outline-none resize-none"
                  placeholder="Your message here..."
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full px-8 py-4 bg-[#ffb300] text-white rounded-lg hover:bg-[#e6a200] transition-all duration-200 font-semibold shadow-lg hover:shadow-xl text-lg"
              >
                Send Message
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactForm;
