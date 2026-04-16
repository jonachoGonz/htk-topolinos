import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";
import BookingSlotCard from "./BookingSlotCard";
import {
  mockSchedule,
  getCurrentWeekStart,
  formatDateDisplay,
  type DaySchedule,
} from "@/services/cronofy";

export default function BookingCalendar() {
  const [weekStart, setWeekStart] = useState<Date>(getCurrentWeekStart());
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [schedule, setSchedule] = useState<DaySchedule[]>([]);
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());

  // Load schedule when week changes
  useEffect(() => {
    const newSchedule = mockSchedule(weekStart);
    setSchedule(newSchedule);
  }, [weekStart]);

  const handlePreviousWeek = () => {
    const newDate = new Date(weekStart);
    newDate.setDate(newDate.getDate() - 7);
    setWeekStart(newDate);
    setSelectedDayIndex(0); // Reset to Monday of new week
  };

  const handleNextWeek = () => {
    const newDate = new Date(weekStart);
    newDate.setDate(newDate.getDate() + 7);
    setWeekStart(newDate);
    setSelectedDayIndex(0); // Reset to Monday of new week
  };

  const handleBookSlot = (slotId: string) => {
    setBookedSlots((prev) => new Set(prev).add(slotId));

    // Update the mock schedule to reflect booking
    setSchedule((prev) =>
      prev.map((day) => ({
        ...day,
        slots: day.slots.map((slot) =>
          slot.id === slotId && slot.booked < slot.capacity
            ? { ...slot, booked: slot.booked + 1 }
            : slot
        ),
      }))
    );
  };

  const selectedDay = schedule[selectedDayIndex];
  const weekEndDate = new Date(weekStart);
  weekEndDate.setDate(weekEndDate.getDate() + 6);

  return (
    <div className="w-full py-10 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Week Navigation Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white">
              Week of{" "}
              {weekStart.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}{" "}
              -{" "}
              {weekEndDate.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </h3>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handlePreviousWeek}
              className="p-2 rounded-lg border border-white/10 hover:bg-white/5 transition text-gray-400 hover:text-white"
              aria-label="Previous week"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNextWeek}
              className="p-2 rounded-lg border border-white/10 hover:bg-white/5 transition text-gray-400 hover:text-white"
              aria-label="Next week"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Week Day Selector */}
        <div className="mb-8 overflow-x-auto pb-2">
          <div className="flex gap-3 min-w-max md:min-w-0 md:flex-wrap">
            {schedule.map((day, index) => (
              <button
                key={index}
                onClick={() => setSelectedDayIndex(index)}
                className={`px-4 py-3 rounded-lg font-medium transition-all flex-shrink-0 md:flex-shrink-1 ${
                  selectedDayIndex === index
                    ? "border-2 border-cyan-400 bg-cyan-400/10 text-cyan-400"
                    : "border border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300"
                }`}
              >
                {formatDateDisplay(day.date)}
              </button>
            ))}
          </div>
        </div>

        {/* Time Slots Grid */}
        {selectedDay && (
          <div>
            <h4 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wide">
              Available Times
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedDay.slots.map((slot) => (
                <BookingSlotCard
                  key={slot.id}
                  slotId={slot.id}
                  time={slot.time}
                  capacity={slot.capacity}
                  booked={slot.booked}
                  onBook={handleBookSlot}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
