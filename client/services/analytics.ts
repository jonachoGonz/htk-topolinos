import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

/**
 * Analytics Metrics Interfaces
 */
export interface RevenueMetrics {
  totalRevenue: number;
  successfulPayments: number;
  failedPayments: number;
  successRate: number;
  refundedAmount: number;
}

export interface UserMetrics {
  activeStudents: number;
  newStudentsThisMonth: number;
  totalTeachers: number;
  churnRate: number;
}

export interface UtilizationMetrics {
  avgSessionsPerStudent: number;
  sessionCompletionRate: number;
  peakBookingDay: string;
  teacherUtilization: number;
}

export interface PlanDistribution {
  planName: string;
  activeCount: number;
  revenue: number;
}

export interface DateRangeMetrics {
  startDate: string;
  endDate: string;
  revenue: RevenueMetrics;
  users: UserMetrics;
  utilization: UtilizationMetrics;
  planDistribution: PlanDistribution[];
}

/**
 * Get revenue metrics for a date range
 */
export async function getRevenueMetrics(
  startDate: string,
  endDate: string
): Promise<{ success: boolean; data?: RevenueMetrics; error?: string }> {
  try {
    // Get payments data
    const { data: payments, error: payError } = await supabase
      .from("payments")
      .select("*")
      .gte("created_at", startDate)
      .lte("created_at", endDate);

    if (payError) throw payError;

    if (!payments || payments.length === 0) {
      return {
        success: true,
        data: {
          totalRevenue: 0,
          successfulPayments: 0,
          failedPayments: 0,
          successRate: 0,
          refundedAmount: 0,
        },
      };
    }

    const successful = payments.filter((p) => p.status === "succeeded");
    const failed = payments.filter((p) => p.status === "failed");
    const refunded = payments.filter((p) => p.status === "refunded");

    const totalRevenue = successful.reduce((sum, p) => sum + (p.amount || 0), 0);
    const refundedAmount = refunded.reduce((sum, p) => sum + (p.amount || 0), 0);
    const successRate =
      payments.length > 0
        ? ((successful.length / payments.length) * 100)
        : 0;

    return {
      success: true,
      data: {
        totalRevenue: totalRevenue / 100, // Convert from cents
        successfulPayments: successful.length,
        failedPayments: failed.length,
        successRate: Math.round(successRate * 100) / 100,
        refundedAmount: refundedAmount / 100,
      },
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Get user metrics
 */
export async function getUserMetrics(
  startDate: string,
  endDate: string
): Promise<{ success: boolean; data?: UserMetrics; error?: string }> {
  try {
    // Get active students with subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("is_active", true);

    if (subError) throw subError;

    // Get new students this month
    const { data: newStudents, error: newError } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "student")
      .gte("created_at", startDate)
      .lte("created_at", endDate);

    if (newError) throw newError;

    // Get total teachers
    const { data: teachers, error: teachError } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "teacher");

    if (teachError) throw teachError;

    const activeStudents = subscriptions?.length || 0;
    const newStudentsCount = newStudents?.length || 0;
    const totalTeachers = teachers?.length || 0;

    // Estimate churn rate (students without active subscriptions)
    const { data: allStudents, error: allError } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "student");

    if (allError) throw allError;

    const totalStudents = allStudents?.length || 1;
    const churnRate = ((totalStudents - activeStudents) / totalStudents) * 100;

    return {
      success: true,
      data: {
        activeStudents,
        newStudentsThisMonth: newStudentsCount,
        totalTeachers,
        churnRate: Math.round(churnRate * 100) / 100,
      },
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Get utilization metrics
 */
export async function getUtilizationMetrics(
  startDate: string,
  endDate: string
): Promise<{ success: boolean; data?: UtilizationMetrics; error?: string }> {
  try {
    // Get bookings data
    const { data: bookings, error: bookError } = await supabase
      .from("bookings")
      .select("*")
      .gte("created_at", startDate)
      .lte("created_at", endDate);

    if (bookError) throw bookError;

    if (!bookings || bookings.length === 0) {
      return {
        success: true,
        data: {
          avgSessionsPerStudent: 0,
          sessionCompletionRate: 0,
          peakBookingDay: "N/A",
          teacherUtilization: 0,
        },
      };
    }

    // Count unique students
    const uniqueStudents = new Set(bookings.map((b) => b.student_id)).size || 1;
    const avgSessions = Math.round((bookings.length / uniqueStudents) * 100) / 100;

    // Calculate completion rate
    const completed = bookings.filter((b) => b.status === "completed").length;
    const completionRate = Math.round((completed / bookings.length) * 100);

    // Find peak day
    const dayCount: Record<string, number> = {};
    bookings.forEach((b) => {
      const date = new Date(b.created_at).toLocaleDateString("es-ES", {
        weekday: "long",
      });
      dayCount[date] = (dayCount[date] || 0) + 1;
    });

    const peakDay = Object.entries(dayCount).sort((a, b) => b[1] - a[1])[0];
    const peakBookingDay = peakDay ? peakDay[0] : "N/A";

    // Calculate teacher utilization
    const uniqueTeachers = new Set(bookings.map((b) => b.professional_id)).size || 1;
    const teacherUtilization =
      Math.round((uniqueTeachers / Math.max(1, uniqueTeachers)) * 100);

    return {
      success: true,
      data: {
        avgSessionsPerStudent: avgSessions,
        sessionCompletionRate: completionRate,
        peakBookingDay,
        teacherUtilization,
      },
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Get plan distribution metrics
 */
export async function getPlanDistribution(
  startDate: string,
  endDate: string
): Promise<{ success: boolean; data?: PlanDistribution[]; error?: string }> {
  try {
    // Get all active plans with their metadata
    const { data: plans, error: planError } = await supabase
      .from("subscriptions")
      .select("*, plans(*)")
      .eq("is_active", true)
      .gte("created_at", startDate)
      .lte("created_at", endDate);

    if (planError) throw planError;

    if (!plans || plans.length === 0) {
      return { success: true, data: [] };
    }

    // Group by plan and calculate metrics
    const distribution: Record<string, PlanDistribution> = {};

    plans.forEach((sub) => {
      const planName = sub.plans?.name || "Plan Unknown";
      const price = sub.plans?.price_per_month || 0;

      if (!distribution[planName]) {
        distribution[planName] = {
          planName,
          activeCount: 0,
          revenue: 0,
        };
      }

      distribution[planName].activeCount += 1;
      distribution[planName].revenue += price;
    });

    return {
      success: true,
      data: Object.values(distribution).sort((a, b) => b.revenue - a.revenue),
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

/**
 * Get complete analytics for date range
 */
export async function getAnalytics(
  startDate: string,
  endDate: string
): Promise<{ success: boolean; data?: DateRangeMetrics; error?: string }> {
  try {
    const [revenueResult, usersResult, utilizationResult, plansResult] =
      await Promise.all([
        getRevenueMetrics(startDate, endDate),
        getUserMetrics(startDate, endDate),
        getUtilizationMetrics(startDate, endDate),
        getPlanDistribution(startDate, endDate),
      ]);

    if (
      !revenueResult.success ||
      !usersResult.success ||
      !utilizationResult.success ||
      !plansResult.success
    ) {
      throw new Error("Failed to fetch analytics data");
    }

    return {
      success: true,
      data: {
        startDate,
        endDate,
        revenue: revenueResult.data!,
        users: usersResult.data!,
        utilization: utilizationResult.data!,
        planDistribution: plansResult.data || [],
      },
    };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
