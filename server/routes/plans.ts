import { Router, RequestHandler } from "express";
import { getPlan, createPlan } from "@/services/supabase";

const router = Router();

const handleGet: RequestHandler = async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!studentId) {
      return res.status(400).json({ error: "studentId is required" });
    }

    const result = await getPlan(studentId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

const handleCreate: RequestHandler = async (req, res) => {
  try {
    const { studentId, name, totalSessions, expiryDate } = req.body;

    if (!studentId || !name || !totalSessions || !expiryDate) {
      return res.status(400).json({
        error:
          "studentId, name, totalSessions, and expiryDate are required",
      });
    }

    const result = await createPlan(studentId, name, totalSessions, expiryDate);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
};

router.get("/:studentId", handleGet);
router.post("/", handleCreate);

export default router;
