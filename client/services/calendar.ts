import { supabase } from "./supabase";

const CRONOFY_API = "https://api.cronofy.com/v1";

export async function syncWithGoogleCalendar(userId: string, accessToken: string) {
  try {
    // Store Google Calendar token securely (backend should handle this)
    const response = await fetch("/api/integrations/google-calendar/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, accessToken }),
    });

    if (!response.ok) throw new Error("Failed to sync with Google Calendar");

    return await response.json();
  } catch (error) {
    console.error("Google Calendar sync failed:", error);
    throw error;
  }
}

export async function syncWithCronofy(userId: string, cronofyAuth: string) {
  try {
    // Sync bookings to Cronofy
    const { data: bookings } = await supabase
      .from("bookings")
      .select("*, availability(time_slot), students(email, name)")
      .eq("professional_id", userId);

    const events = bookings?.map((booking) => ({
      event_uid: `booking-${booking.id}`,
      summary: `Sesión con ${booking.students?.name || "Cliente"}`,
      description: booking.notes || "",
      start: new Date(booking.availability?.time_slot).toISOString(),
      end: new Date(new Date(booking.availability?.time_slot).getTime() + 60 * 60 * 1000).toISOString(),
      location: {
        description: "Online/In-person",
      },
    })) || [];

    const response = await fetch(`${CRONOFY_API}/events`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cronofyAuth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ events }),
    });

    if (!response.ok) throw new Error("Cronofy sync failed");

    return await response.json();
  } catch (error) {
    console.error("Cronofy sync failed:", error);
    throw error;
  }
}

export async function checkCalendarConflicts(
  professionalId: string,
  startTime: Date,
  endTime: Date,
  source: "google" | "cronofy"
) {
  try {
    const response = await fetch("/api/integrations/calendar/conflicts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        professionalId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        source,
      }),
    });

    if (!response.ok) throw new Error("Failed to check conflicts");

    const { conflicts } = await response.json();
    return conflicts;
  } catch (error) {
    console.error("Conflict check failed:", error);
    return [];
  }
}

export async function getAvailabilityFromCalendar(
  professionalId: string,
  source: "google" | "cronofy"
) {
  try {
    const response = await fetch(
      `/api/integrations/calendar/availability?professionalId=${professionalId}&source=${source}`
    );

    if (!response.ok) throw new Error("Failed to fetch availability");

    return await response.json();
  } catch (error) {
    console.error("Failed to fetch calendar availability:", error);
    return [];
  }
}

export async function disconnectCalendarIntegration(
  userId: string,
  source: "google" | "cronofy"
) {
  try {
    const response = await fetch(
      `/api/integrations/calendar/disconnect`,
      {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, source }),
      }
    );

    if (!response.ok) throw new Error("Failed to disconnect");

    return true;
  } catch (error) {
    console.error("Failed to disconnect calendar:", error);
    throw error;
  }
}
