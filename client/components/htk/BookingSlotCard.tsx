import { Lock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface BookingSlotCardProps {
  time: string;
  capacity: number;
  booked: number;
  slotId: string;
  onBook: (slotId: string) => void;
}

export default function BookingSlotCard({
  time,
  capacity,
  booked,
  slotId,
  onBook,
}: BookingSlotCardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isFull = booked >= capacity;
  const availableSpots = capacity - booked;

  const handleBook = async () => {
    if (isFull) {
      toast.error("Sorry, this class is full.");
      return;
    }

    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 300)); // Simulate API call
      onBook(slotId);
      toast.success("Class booked! Check your email.");
    } catch (error) {
      toast.error("Failed to book class. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`bg-[#0f131a] border border-white/10 rounded-lg p-4 transition-all duration-300 ${
        isFull ? "opacity-60" : "hover:shadow-[0_0_10px_rgba(0,239,255,0.2)]"
      }`}
    >
      <div className="space-y-3">
        {/* Time and Duration */}
        <div className="flex items-baseline justify-between">
          <div className="text-lg font-bold text-white">{time}</div>
          <div className="text-xs text-gray-400">90 min</div>
        </div>

        {/* Capacity */}
        <div className="text-sm text-gray-400">
          {booked}/{capacity} spots filled
        </div>

        {/* Button */}
        <button
          onClick={handleBook}
          disabled={isFull || isLoading}
          className={`w-full py-2 rounded-md font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
            isFull
              ? "bg-transparent border border-white/10 text-gray-400 cursor-not-allowed"
              : "border border-cyan-400 text-cyan-400 hover:bg-cyan-400/10 active:bg-cyan-400/20"
          }`}
        >
          {isFull ? (
            <>
              <Lock className="w-4 h-4" />
              Full
            </>
          ) : isLoading ? (
            "Booking..."
          ) : (
            "Book Now"
          )}
        </button>
      </div>
    </div>
  );
}
