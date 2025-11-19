import Footer from "../landingPage/components/Footer";
import Navigation from "../landingPage/components/Navigation";
import CallToAction from "../landingPage/sections/CallToAction";
import ContactForm from "./sections/ContactForm";
import ContactHero from "./sections/ContactHero";

const Contact = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />
      <ContactHero />
      <ContactForm />
      <CallToAction />
      <Footer />
    </div>
  );
};

export default Contact;
