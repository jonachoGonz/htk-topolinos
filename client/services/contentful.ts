/**
 * Contentful CMS Service — HTK Center
 *
 * To activate the real Contentful integration:
 * 1. Run: pnpm add contentful
 * 2. Set env vars: VITE_CONTENTFUL_SPACE_ID and VITE_CONTENTFUL_ACCESS_TOKEN
 * 3. Uncomment the real implementation below and remove the mock
 */

// --- Real Contentful (uncomment to activate) ---
// import { createClient } from 'contentful'
// const client = createClient({
//   space: import.meta.env.VITE_CONTENTFUL_SPACE_ID,
//   accessToken: import.meta.env.VITE_CONTENTFUL_ACCESS_TOKEN,
// })

export interface CancellationPolicy {
  title: string;
  description: string;
  highlight: string; // bold portion of the description
  hoursNotice: number;
}

export interface ActivePlan {
  name: string;
  sessionsTotal: number;
  sessionsUsed: number;
  verified: boolean;
}

/**
 * Fetch the cancellation policy from Contentful.
 * Real: client.getEntry<CancellationPolicy>('cancellationPolicy')
 */
export async function getCancellationPolicy(): Promise<CancellationPolicy> {
  await new Promise((r) => setTimeout(r, 120));
  return {
    title: "POLÍTICA DE CANCELACIÓN",
    description:
      "Para asegurar la calidad del servicio a todos nuestros usuarios, las cancelaciones deben realizarse con al menos",
    highlight: "12 horas de anticipación.",
    hoursNotice: 12,
  };
}

/**
 * Fetch the student's active plan from Contentful.
 * Real: client.getEntries({ content_type: 'studentPlan', 'fields.userId': userId })
 */
export async function getActivePlan(): Promise<ActivePlan> {
  await new Promise((r) => setTimeout(r, 120));
  return {
    name: "Plan Anual Pro",
    sessionsTotal: 8,
    sessionsUsed: 0,
    verified: true,
  };
}
