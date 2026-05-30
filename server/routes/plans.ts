import { Router, Request, Response } from "express";
import { PlanService } from "../services/PlanService";
import { PlanTemplate, PlanDuration } from "../../shared/api";

const router = Router();
const planService = new PlanService();

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

// Get all active plans
router.get("/", async (req: Request, res: Response) => {
  try {
    const plans = await planService.getPlanTemplates(true);
    res.json(plans);
  } catch (error) {
    console.error("Error fetching plans:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to fetch plans",
    });
  }
});

// Get plan by ID with durations
router.get("/:planId", async (req: Request, res: Response) => {
  try {
    const { planId } = req.params;
    const plan = await planService.getPlanTemplate(planId);
    const durations = await planService.getPlanDurations(planId);

    res.json({ plan, durations });
  } catch (error) {
    console.error("Error fetching plan:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to fetch plan",
    });
  }
});

// Create new plan (teacher/admin only)
router.post("/", async (req: AuthRequest, res: Response) => {
  try {
    if (req.user?.role !== "teacher" && req.user?.role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const planData = req.body as Partial<PlanTemplate>;
    const plan = await planService.createPlanTemplate(
      req.user.id,
      planData
    );

    res.status(201).json(plan);
  } catch (error) {
    console.error("Error creating plan:", error);
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to create plan",
    });
  }
});

// Add duration option to plan
router.post(
  "/:planId/durations",
  async (req: AuthRequest, res: Response) => {
    try {
      const { planId } = req.params;
      const durationData = req.body as Partial<PlanDuration>;

      const duration = await planService.createPlanDuration(
        planId,
        durationData
      );

      res.status(201).json(duration);
    } catch (error) {
      console.error("Error creating duration:", error);
      res.status(500).json({
        error:
          error instanceof Error ? error.message : "Failed to create duration",
      });
    }
  }
);

export default router;
