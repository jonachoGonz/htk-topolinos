// Mock Cronofy API service for booking system
// Real implementation will integrate with actual Cronofy endpoints

export interface TimeSlot {
  id: string;
  time: string; // "08:30", "10:00", etc.
  duration: 90; // minutes
  capacity: 6;
  booked: number; // How many spots are taken
}

export interface DaySchedule {
  date: Date;
  day: string; // "Monday", "Tuesday", etc.
  slots: TimeSlot[];
}

// Time slots to display (90-minute duration each)
const SLOT_TIMES = [
  { start: "08:30", end: "10:00" },
  { start: "10:00", end: "11:30" },
  { start: "11:30", end: "13:00" },
  // SKIP: 13:00 - 15:30 (Lunch/Closure)
  { start: "15:30", end: "17:00" },
  { start: "17:00", end: "18:30" },
  { start: "18:30", end: "20:00" },
  { start: "20:00", end: "21:30" },
];

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/**
 * Generates mock schedule for 7 days starting from the given date
 * Each day has 7 time slots with varying availability
 */
export const mockSchedule = (startDate: Date): DaySchedule[] => {
  const schedule: DaySchedule[] = [];

  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() + i);

    const dayIndex = currentDate.getDay();
    const dayName = DAY_NAMES[dayIndex];

    // Generate slots with realistic availability
    const slots: TimeSlot[] = SLOT_TIMES.map((slotTime, index) => {
      // Vary booking status for realistic data
      // Some slots are full, some have a few spots, some have many
      const bookedOptions = [0, 1, 2, 3, 4, 5, 6];
      const booked =
        bookedOptions[
          (i * SLOT_TIMES.length + index) % bookedOptions.length
        ];

      return {
        id: `${currentDate.toISOString().split("T")[0]}-${slotTime.start}`,
        time: slotTime.start,
        duration: 90,
        capacity: 6,
        booked,
      };
    });

    schedule.push({
      date: currentDate,
      day: dayName,
      slots,
    });
  }

  return schedule;
};

/**
 * Simulates booking a time slot
 * In a real scenario, this would call the Cronofy API
 */
export const bookSlot = async (slotId: string): Promise<boolean> => {
  // Simulate async API call
  return new Promise((resolve) => {
    setTimeout(() => {
      // Always return success for mock
      resolve(true);
    }, 500);
  });
};

/**
 * Get the current week's Monday as a starting point
 */
export const getCurrentWeekStart = (date: Date = new Date()): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
  return new Date(d.setDate(diff));
};

/**
 * Format date to display format (e.g., "Mon 15")
 */
export const formatDateDisplay = (date: Date): string => {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayName = days[date.getDay()];
  const dayNum = date.getDate();
  return `${dayName} ${dayNum}`;
};
