import { Router, RequestHandler } from "express";
import {
  getBookings,
  createNewBooking,
  updateBookingStatus,
} from "@/services/supabase";

const router = Router();

const handleGet: RequestHandler = async (req, res) => {
  try {
    const { type, userId } = req.query;

    if (!type || !userId) {
      return res
        .status(400)
        .json({ error: "type (student|professional) and userId are required" });
    }

    if (type !== "student" && type !== "professional") {
      return res
        .status(400)
        .json({ error: "type must be 'student' or 'professional'" });
    }

    const result = await getBookings(type, userId as string);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

const handleCreate: RequestHandler = async (req, res) => {
  try {
    const { studentId, professionalId, bookingDate, startTime, endTime, notes } =
      req.body;

    if (!studentId || !professionalId || !bookingDate || !startTime || !endTime) {
      return res.status(400).json({
        error:
          "studentId, professionalId, bookingDate, startTime, and endTime are required",
      });
    }

    const result = await createNewBooking(
      studentId,
      professionalId,
      bookingDate,
      startTime,
      endTime,
      notes
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

const handleUpdateStatus: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!id || !status) {
      return res.status(400).json({ error: "id and status are required" });
    }

    if (!["confirmed", "cancelled", "completed"].includes(status)) {
      return res
        .status(400)
        .json({
          error: "status must be 'confirmed', 'cancelled', or 'completed'",
        });
    }

    const result = await updateBookingStatus(id, status);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

router.get("/", handleGet);
router.post("/", handleCreate);
router.put("/:id/status", handleUpdateStatus);

export default router;
