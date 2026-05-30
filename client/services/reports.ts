import { supabase } from "./supabase";

export async function generateRevenueReport(startDate: Date, endDate: Date) {
  const { data, error } = await supabase
    .from("payments")
    .select("*, subscriptions(plan_id, plan_templates(name, price))")
    .gte("created_at", startDate.toISOString())
    .lte("created_at", endDate.toISOString());

  if (error) throw error;

  const totalRevenue = data?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
  const byPlan: Record<string, number> = {};

  data?.forEach((payment) => {
    const planName = payment.subscriptions?.plan_templates?.name || "Unknown";
    byPlan[planName] = (byPlan[planName] || 0) + (payment.amount || 0);
  });

  return {
    period: { startDate, endDate },
    totalRevenue,
    transactionCount: data?.length || 0,
    byPlan,
    avgTransactionValue: totalRevenue / (data?.length || 1),
  };
}

export async function getUserMetrics(period = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - period);

  const { data: newUsers } = await supabase
    .from("profiles")
    .select("id")
    .gte("created_at", startDate.toISOString());

  const { data: activeUsers } = await supabase
    .from("bookings")
    .select("student_id")
    .gte("created_at", startDate.toISOString())
    .distinct();

  const { data: totalUsers } = await supabase
    .from("profiles")
    .select("id");

  return {
    period,
    newUsers: newUsers?.length || 0,
    activeUsers: new Set(activeUsers?.map(b => b.student_id)).size,
    totalUsers: totalUsers?.length || 0,
    retentionRate: totalUsers?.length ? (activeUsers?.length || 0) / totalUsers.length : 0,
  };
}

export async function getUtilizationMetrics() {
  const { data: availability } = await supabase
    .from("availability")
    .select("*, bookings(count)");

  const { data: plans } = await supabase
    .from("plan_templates")
    .select("*, subscriptions(count)");

  const totalSlots = availability?.length || 0;
  const bookedSlots = availability?.reduce((sum, a) => sum + (a.bookings?.length || 0), 0) || 0;
  const utilizationRate = totalSlots ? bookedSlots / totalSlots : 0;

  const mostPopularPlan = plans?.reduce((best, p) => {
    const count = p.subscriptions?.length || 0;
    return count > (best.count || 0) ? { ...p, count } : best;
  });

  return {
    totalSlots,
    bookedSlots,
    utilizationRate,
    mostPopularPlan,
  };
}

export async function getProfessionalMetrics(professionalId: string) {
  const { data: availability } = await supabase
    .from("availability")
    .select("*, bookings(count)")
    .eq("professional_id", professionalId);

  const { data: students } = await supabase
    .from("bookings")
    .select("student_id")
    .eq("professional_id", professionalId)
    .distinct();

  const { data: revenue } = await supabase
    .from("payments")
    .select("amount")
    .eq("professional_id", professionalId);

  const totalRevenue = revenue?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

  return {
    totalSlots: availability?.length || 0,
    bookingCount: availability?.reduce((sum, a) => sum + (a.bookings?.length || 0), 0) || 0,
    uniqueStudents: new Set(students?.map(s => s.student_id)).size,
    totalRevenue,
    avgRevenuePerStudent: students?.length ? totalRevenue / students.length : 0,
  };
}

export function exportToCSV(data: any[], filename: string) {
  const csv = [
    Object.keys(data[0] || {}).join(","),
    ...data.map(row =>
      Object.values(row)
        .map(v => (typeof v === "string" ? `"${v}"` : v))
        .join(",")
    ),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToPDF(data: any[], title: string) {
  // Simple PDF generation - in production use library like pdfkit or jsPDF
  const text = [
    title,
    new Date().toLocaleDateString(),
    "",
    ...data.map(row =>
      Object.entries(row)
        .map(([k, v]) => `${k}: ${v}`)
        .join(" | ")
    ),
  ].join("\n");

  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
