import {
  CreatePaymentRequest,
  CreatePaymentResponse,
  PaymentStatusResponse,
  PlanTemplate,
  PlanDuration,
  SubscriptionResponse,
} from "../../shared/api";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Plans API
export async function getPlans(): Promise<PlanTemplate[]> {
  const res = await fetch(`${API_URL}/api/plans`);
  if (!res.ok) throw new Error("Failed to fetch plans");
  return res.json();
}

export async function getPlanDetails(
  planId: string
): Promise<{ plan: PlanTemplate; durations: PlanDuration[] }> {
  const res = await fetch(`${API_URL}/api/plans/${planId}`);
  if (!res.ok) throw new Error("Failed to fetch plan details");
  return res.json();
}

// Payments API
export async function createPaymentIntent(
  token: string,
  request: CreatePaymentRequest
): Promise<CreatePaymentResponse> {
  const res = await fetch(`${API_URL}/api/payments/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to create payment");
  }
  return res.json();
}

export async function getPaymentStatus(
  token: string,
  paymentId: string
): Promise<PaymentStatusResponse> {
  const res = await fetch(`${API_URL}/api/payments/status/${paymentId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error("Failed to fetch payment status");
  return res.json();
}

// Subscriptions API
export async function getCurrentSubscription(
  token: string
): Promise<SubscriptionResponse> {
  const res = await fetch(`${API_URL}/api/subscriptions/current`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to fetch subscription");
  }
  return res.json();
}

export async function getSubscriptions(
  token: string
): Promise<(SubscriptionResponse & { plan: PlanTemplate })[]> {
  const res = await fetch(`${API_URL}/api/subscriptions/`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error("Failed to fetch subscriptions");
  return res.json();
}

export async function getSubscriptionById(
  token: string,
  subscriptionId: string
): Promise<SubscriptionResponse> {
  const res = await fetch(
    `${API_URL}/api/subscriptions/${subscriptionId}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  if (!res.ok) throw new Error("Failed to fetch subscription");
  return res.json();
}
