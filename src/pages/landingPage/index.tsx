import { useNavigate } from "react-router-dom";
import Footer from "./components/Footer";
import Navigation from "./components/Navigation";
import CallToAction from "./sections/CallToAction";
import Hero from "./sections/Hero";
import Offerings from "./sections/Offerings";
import Story from "./sections/Story";
import Testimonials from "./sections/Testimonials";
import WhyINF from "./sections/WhyINF";

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <Hero />
      <Offerings />
      <Story />
      <Testimonials />
      <WhyINF />
      <CallToAction />
      <Footer />
    </div>
  );
};

export default LandingPage;
