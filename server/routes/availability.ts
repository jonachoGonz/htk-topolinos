import { Router, RequestHandler } from "express";
import {
  getAvailability,
  createAvailability,
  deleteAvailability,
} from "@/services/supabase";

const router = Router();

const handleGet: RequestHandler = async (req, res) => {
  try {
    const { professionalId } = req.params;
    if (!professionalId) {
      return res.status(400).json({ error: "professionalId is required" });
    }

    const result = await getAvailability(professionalId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

const handleCreate: RequestHandler = async (req, res) => {
  try {
    const { professionalId, dayOfWeek, startTime, endTime, maxCapacity } =
      req.body;

    if (
      !professionalId ||
      dayOfWeek === undefined ||
      !startTime ||
      !endTime
    ) {
      return res.status(400).json({
        error:
          "professionalId, dayOfWeek, startTime, and endTime are required",
      });
    }

    const result = await createAvailability(
      professionalId,
      dayOfWeek,
      startTime,
      endTime,
      maxCapacity || 5
    );

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

const handleDelete: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "id is required" });
    }

    const result = await deleteAvailability(id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

router.get("/:professionalId", handleGet);
router.post("/", handleCreate);
router.delete("/:id", handleDelete);

export default router;
