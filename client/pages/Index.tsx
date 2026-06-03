import Navigation from "@/components/htk/Navigation";
import Hero from "@/components/htk/Hero";
import Services from "@/components/htk/Services";
import About from "@/components/htk/About";
import Pricing from "@/components/htk/Pricing";
import Footer from "@/components/htk/Footer";
import WhatsAppFloat from "@/components/htk/WhatsAppFloat";
import SectionDivider from "@/components/htk/SectionDivider";

export default function Index() {
  return (
    <div className="w-full bg-[#0a0e1a] text-white font-inter">
      <Navigation />
      <Hero />
      <SectionDivider number="01" label="Servicios" />
      <Services />
      <SectionDivider number="02" label="Quiénes somos" />
      <About />
      <SectionDivider number="03" label="Planes" />
      <Pricing />
      <Footer />
      <WhatsAppFloat />
    </div>
  );
}
