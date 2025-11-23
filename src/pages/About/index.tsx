import Footer from "../landingPage/components/Footer";
import Navigation from "../landingPage/components/Navigation";
import CallToAction from "../landingPage/sections/CallToAction";
import AboutHero from "./sections/AboutHero";
import AboutMission from "./sections/AboutMission";
import AboutStory from "./sections/AboutStory";
import AboutValues from "./sections/AboutValues";

const About = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <AboutHero />
      <AboutStory />
      <AboutMission />
      <AboutValues />
      <CallToAction />
      <Footer />
    </div>
  );
};

export default About;
