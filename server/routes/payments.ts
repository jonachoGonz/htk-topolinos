import { Router, Request, Response, NextFunction } from "express";
import { StripeProvider } from "../payments/StripeProvider";
import { PlanService } from "../services/PlanService";
import {
  CreatePaymentRequest,
  CreatePaymentResponse,
  PaymentStatusResponse,
  Payment,
} from "../../shared/api";

const router = Router();
const stripeProvider = new StripeProvider({
  apiKey: process.env.STRIPE_SECRET_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  currency: "clp",
});
const planService = new PlanService();

interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

// Middleware to verify auth (simplified - in production, use proper JWT verification)
const verifyAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  // In production, verify JWT token here
  // For now, assume authenticated
  req.user = { id: "student-id", role: "student" };
  next();
};

// Create Payment Intent
router.post(
  "/create",
  verifyAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const { plan_template_id, duration_months, promo_code } =
        req.body as CreatePaymentRequest;
      const studentId = req.user?.id;

      if (!studentId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Validate plan exists
      const plan = await planService.getPlanTemplate(plan_template_id);
      if (!plan) {
        return res.status(404).json({ error: "Plan not found" });
      }

      // Validate promo code if provided
      let promoData = null;
      if (promo_code) {
        promoData = await planService.validatePromoCode(
          promo_code,
          plan_template_id
        );
        if (!promoData) {
          return res.status(400).json({ error: "Invalid promo code" });
        }
      }

      // Calculate final price
      const amount = await planService.calculatePlanPrice(
        plan,
        duration_months,
        promoData
      );

      // Create payment record in DB
      const payment = await planService.createPayment({
        student_id: studentId,
        plan_template_id,
        duration_months,
        promo_code_id: promoData?.id,
        amount,
        currency: "CLP",
        provider: "stripe",
        provider_transaction_id: "", // Will be updated after Stripe intent
        status: "pending",
      });

      // Create Stripe payment intent
      const paymentIntent = await stripeProvider.createPaymentIntent(
        studentId,
        { plan_template_id, duration_months, promo_code },
        amount
      );

      // Update payment with Stripe transaction ID
      await planService.updatePaymentStatus(payment.id, "pending");
      await (planService as any).supabase
        .from("payments")
        .update({ provider_transaction_id: paymentIntent.payment_id })
        .eq("id", payment.id);

      const response: CreatePaymentResponse = {
        payment_id: payment.id,
        client_secret: paymentIntent.client_secret,
        amount,
        currency: "CLP",
      };

      res.json(response);
    } catch (error) {
      console.error("Payment creation error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Payment creation failed",
      });
    }
  }
);

// Get Payment Status
router.get(
  "/status/:paymentId",
  verifyAuth,
  async (req: AuthRequest, res: Response) => {
    try {
      const { paymentId } = req.params;

      // Fetch payment from DB
      const { data: payment, error } = await (planService as any).supabase
        .from("payments")
        .select("*")
        .eq("id", paymentId)
        .single();

      if (error || !payment) {
        return res.status(404).json({ error: "Payment not found" });
      }

      // Verify ownership
      if (payment.student_id !== req.user?.id) {
        return res.status(403).json({ error: "Forbidden" });
      }

      // Verify with Stripe
      const status = await stripeProvider.verifyPayment(
        payment.provider_transaction_id
      );

      // Update DB if status changed
      if (status.status !== payment.status) {
        await planService.updatePaymentStatus(paymentId, status.status);
      }

      const response: PaymentStatusResponse = {
        payment_id: paymentId,
        status: status.status,
      };

      res.json(response);
    } catch (error) {
      console.error("Payment status error:", error);
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to get payment status",
      });
    }
  }
);

// Stripe Webhook Handler
router.post("/webhook/stripe", async (req: Request, res: Response) => {
  try {
    const sig = req.headers["stripe-signature"] as string;

    if (!sig) {
      return res.status(400).json({ error: "Missing signature" });
    }

    // In production, verify signature with:
    // const event = stripe.webhooks.constructEvent(
    //   req.body,
    //   sig,
    //   process.env.STRIPE_WEBHOOK_SECRET!
    // );

    const event = req.body;
    await stripeProvider.handleWebhook(event);

    // Handle payment success
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object;

      // Find and update payment record
      const payment = await planService.getPaymentByTransactionId(
        paymentIntent.id
      );

      if (payment) {
        await planService.updatePaymentStatus(payment.id, "succeeded");

        // Create subscription
        const plan = await planService.getPlanTemplate(
          payment.plan_template_id
        );
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + payment.duration_months);

        await planService.createSubscription({
          student_id: payment.student_id,
          plan_template_id: payment.plan_template_id,
          payment_id: payment.id,
          sessions_total:
            plan.sessions_per_month * payment.duration_months,
          sessions_used: 0,
          start_date: startDate.toISOString().split("T")[0],
          end_date: endDate.toISOString().split("T")[0],
          is_active: true,
          auto_renew: false,
        });

        // Increment promo usage if applied
        if (payment.promo_code_id) {
          await planService.incrementPromoCodeUsage(payment.promo_code_id);
        }
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(400).json({
      error: error instanceof Error ? error.message : "Webhook processing failed",
    });
  }
});

export default router;
