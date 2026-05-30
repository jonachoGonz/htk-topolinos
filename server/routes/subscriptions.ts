import { Router, Request, Response } from "express";
import { PlanService } from "../services/PlanService";
import { SubscriptionResponse, Subscription } from "../../shared/api";

const router = Router();
const planService = new PlanService();

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

const verifyAuth = (req: AuthRequest, res: Response): boolean => {
  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
};

// Get current active subscription
router.get("/current", async (req: AuthRequest, res: Response) => {
  try {
    if (!verifyAuth(req, res)) return;

    const subscription = await planService.getActiveSubscription(req.user!.id);

    if (!subscription) {
      return res.status(404).json({ error: "No active subscription" });
    }

    const plan = await planService.getPlanTemplate(
      subscription.plan_template_id
    );

    const response: SubscriptionResponse = {
      subscription,
      plan_template: plan,
      sessions_remaining: subscription.sessions_total - subscription.sessions_used,
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching current subscription:", error);
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to fetch subscription",
    });
  }
});

// Get all subscriptions for student
router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    if (!verifyAuth(req, res)) return;

    const subscriptions = await planService.getStudentSubscriptions(
      req.user!.id
    );

    // Enrich with plan data
    const enriched = await Promise.all(
      subscriptions.map(async (sub) => {
        const plan = await planService.getPlanTemplate(
          sub.plan_template_id
        );
        return {
          ...sub,
          plan,
          sessions_remaining: sub.sessions_total - sub.sessions_used,
        };
      })
    );

    res.json(enriched);
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to fetch subscriptions",
    });
  }
});

// Get subscription by ID
router.get("/:subscriptionId", async (req: AuthRequest, res: Response) => {
  try {
    if (!verifyAuth(req, res)) return;

    const { subscriptionId } = req.params;

    const { data: subscription, error } = await (planService as any).supabase
      .from("subscriptions")
      .select("*")
      .eq("id", subscriptionId)
      .single();

    if (error || !subscription) {
      return res.status(404).json({ error: "Subscription not found" });
    }

    // Verify ownership
    if (subscription.student_id !== req.user!.id) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const plan = await planService.getPlanTemplate(
      subscription.plan_template_id
    );

    const response: SubscriptionResponse = {
      subscription,
      plan_template: plan,
      sessions_remaining:
        subscription.sessions_total - subscription.sessions_used,
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching subscription:", error);
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "Failed to fetch subscription",
    });
  }
});

export default router;
