import Navigation from "@/components/htk/Navigation";
import BookingHeader from "@/components/htk/BookingHeader";
import BookingCalendar from "@/components/htk/BookingCalendar";
import Footer from "@/components/htk/Footer";

export default function Booking() {
  return (
    <div className="w-full bg-[#0a0e1a] text-white font-inter">
      <Navigation />
      <BookingHeader />
      <BookingCalendar />
      <Footer />
    </div>
  );
}
