import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { exportToCSV, exportToPDF, generateRevenueReport } from "@/services/reports";
import { toast } from "sonner";

export function AnalyticsExport() {
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date(),
  });

  const handleExportCSV = async () => {
    try {
      setLoading(true);
      const report = await generateRevenueReport(dateRange.start, dateRange.end);
      const data = [
        {
          "Total Revenue": report.totalRevenue,
          "Transaction Count": report.transactionCount,
          "Avg Value": report.avgTransactionValue,
          "Period": `${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`,
        },
        ...Object.entries(report.byPlan).map(([plan, revenue]) => ({
          Plan: plan,
          Revenue: revenue,
        })),
      ];
      exportToCSV(data, `revenue-report-${Date.now()}.csv`);
      toast.success("Reporte exportado a CSV");
    } catch (error) {
      toast.error("Error al exportar reporte");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setLoading(true);
      const report = await generateRevenueReport(dateRange.start, dateRange.end);
      exportToPDF([report], `Revenue Report ${dateRange.start.toLocaleDateString()}`);
      toast.success("Reporte exportado a PDF");
    } catch (error) {
      toast.error("Error al exportar reporte");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <div>
          <label className="text-sm font-medium">Desde</label>
          <input
            type="date"
            value={dateRange.start.toISOString().split("T")[0]}
            onChange={(e) =>
              setDateRange({
                ...dateRange,
                start: new Date(e.target.value),
              })
            }
            className="border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Hasta</label>
          <input
            type="date"
            value={dateRange.end.toISOString().split("T")[0]}
            onChange={(e) =>
              setDateRange({
                ...dateRange,
                end: new Date(e.target.value),
              })
            }
            className="border rounded px-3 py-2"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handleExportCSV}
          disabled={loading}
          variant="outline"
          className="gap-2"
        >
          <Download className="w-4 h-4" />
          Exportar CSV
        </Button>
        <Button
          onClick={handleExportPDF}
          disabled={loading}
          variant="outline"
          className="gap-2"
        >
          <FileText className="w-4 h-4" />
          Exportar PDF
        </Button>
      </div>

      {loading && <p className="text-sm text-gray-500">Generando reporte...</p>}
    </div>
  );
}
