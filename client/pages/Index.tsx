import Navigation from "@/components/htk/Navigation";
import Hero from "@/components/htk/Hero";
import Services from "@/components/htk/Services";
import About from "@/components/htk/About";
import Pricing from "@/components/htk/Pricing";
import Footer from "@/components/htk/Footer";

export default function Index() {
  return (
    <div className="w-full bg-[#0a0e1a] text-white font-inter">
      <Navigation />
      <Hero />
      <Services />
      <About />
      <Pricing />
      <Footer />
    </div>
  );
}
