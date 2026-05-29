import { useState } from "react";
import { Save, X } from "lucide-react";
import { toast } from "sonner";
import { createProgressRecord } from "@/services/supabase";
import { useAuth } from "@/contexts/AuthContext";

interface ProgressRecordFormProps {
  patientId: string;
  patientName: string;
  onSuccess?: () => void;
  onClose?: () => void;
}

export default function ProgressRecordForm({
  patientId,
  patientName,
  onSuccess,
  onClose,
}: ProgressRecordFormProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notes, setNotes] = useState("");
  const [metrics, setMetrics] = useState<Record<string, string>>({});

  const handleAddMetric = () => {
    setMetrics({ ...metrics, [`metric_${Date.now()}`]: "" });
  };

  const handleRemoveMetric = (key: string) => {
    const newMetrics = { ...metrics };
    delete newMetrics[key];
    setMetrics(newMetrics);
  };

  const handleMetricChange = (key: string, value: string) => {
    setMetrics({ ...metrics, [key]: value });
  };

  const handleSubmit = async () => {
    if (!notes.trim()) {
      toast.error("Por favor escribe alguna nota");
      return;
    }

    if (!user?.id) {
      toast.error("Usuario no autenticado");
      return;
    }

    setIsSubmitting(true);
    const metricsObj: Record<string, any> = {};
    Object.entries(metrics).forEach(([key, value]) => {
      if (value.trim()) {
        metricsObj[key] = value;
      }
    });

    const result = await createProgressRecord(
      patientId,
      user.id,
      notes,
      Object.keys(metricsObj).length > 0 ? metricsObj : undefined
    );

    if (result.success) {
      toast.success("Nota de progreso guardada");
      setNotes("");
      setMetrics({});
      onSuccess?.();
    } else {
      toast.error(`Error: ${result.error}`);
    }
    setIsSubmitting(false);
  };

  return (
    <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white font-lexend">
            Nota de Progreso
          </h2>
          <p className="text-gray-400 text-sm font-inter mt-1">
            Paciente: {patientName}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Notes Textarea */}
      <div className="space-y-2">
        <label className="text-xs font-inter text-gray-400 uppercase tracking-wider">
          Notas de Sesión
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Describe el progreso, ejercicios realizados, observaciones..."
          rows={5}
          className="w-full bg-[#0a0e1a] border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 font-inter focus:outline-none focus:border-[#00d4ff]/40 resize-none"
        />
      </div>

      {/* Metrics */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-inter text-gray-400 uppercase tracking-wider">
            Métricas Adicionales (Opcional)
          </label>
          <button
            onClick={handleAddMetric}
            className="text-xs text-[#00d4ff] hover:text-[#00d4ff]/80 transition flex items-center gap-1"
          >
            + Agregar
          </button>
        </div>

        {Object.entries(metrics).map(([key, value]) => (
          <div key={key} className="flex items-center gap-2">
            <input
              type="text"
              value={value}
              onChange={(e) => handleMetricChange(key, e.target.value)}
              placeholder="Ej: Flexibilidad: 85%"
              className="flex-1 bg-[#0a0e1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 font-inter focus:outline-none focus:border-[#00d4ff]/40"
            />
            <button
              onClick={() => handleRemoveMetric(key)}
              className="text-gray-400 hover:text-red-400 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2 border-t border-white/[0.06]">
        {onClose && (
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm font-semibold font-lexend text-gray-300 border border-white/10 rounded-lg hover:bg-white/5 transition"
          >
            Cancelar
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-lg transition font-semibold text-sm disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          Guardar
        </button>
      </div>
    </div>
  );
}
