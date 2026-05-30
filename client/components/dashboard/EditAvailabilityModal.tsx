import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import {
  updateAvailability,
  type Availability,
} from "@/services/supabase";

interface EditAvailabilityModalProps {
  availability: Availability;
  onClose: () => void;
  onSuccess: () => void;
}

const DAYS_OF_WEEK = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
];

export default function EditAvailabilityModal({
  availability,
  onClose,
  onSuccess,
}: EditAvailabilityModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    dayOfWeek: availability.day_of_week.toString(),
    startTime: availability.start_time,
    endTime: availability.end_time,
    maxCapacity: availability.max_capacity.toString(),
  });

  const handleSave = async () => {
    if (!formData.startTime || !formData.endTime) {
      toast.error("Por favor completa todos los campos");
      return;
    }

    // Validate time format
    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!timeRegex.test(formData.startTime)) {
      toast.error("Formato de hora inicio inválido (HH:MM)");
      return;
    }
    if (!timeRegex.test(formData.endTime)) {
      toast.error("Formato de hora fin inválido (HH:MM)");
      return;
    }

    // Validate times order
    const start = parseInt(formData.startTime.replace(":", ""));
    const end = parseInt(formData.endTime.replace(":", ""));
    if (start >= end) {
      toast.error("La hora de inicio debe ser anterior a la hora de fin");
      return;
    }

    setIsSaving(true);
    const result = await updateAvailability(
      availability.id,
      parseInt(formData.dayOfWeek),
      formData.startTime,
      formData.endTime,
      parseInt(formData.maxCapacity)
    );

    if (result.success) {
      toast.success("Disponibilidad actualizada correctamente");
      onSuccess();
      onClose();
    } else {
      toast.error(`Error: ${result.error}`);
    }
    setIsSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-white font-lexend">
            Editar Disponibilidad
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="space-y-4">
          {/* Day Select */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-inter text-gray-400 uppercase">
              Día de la Semana
            </label>
            <select
              value={formData.dayOfWeek}
              onChange={(e) =>
                setFormData({ ...formData, dayOfWeek: e.target.value })
              }
              className="bg-[#0a0e1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-inter focus:outline-none focus:border-[#00d4ff]/40"
            >
              {DAYS_OF_WEEK.map((day, idx) => (
                <option key={idx} value={idx}>
                  {day}
                </option>
              ))}
            </select>
          </div>

          {/* Start Time */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-inter text-gray-400 uppercase">
              Hora Inicio (HH:MM)
            </label>
            <input
              type="text"
              placeholder="09:00"
              pattern="^([01]\d|2[0-3]):[0-5]\d$"
              value={formData.startTime}
              onChange={(e) =>
                setFormData({ ...formData, startTime: e.target.value })
              }
              className="bg-[#0a0e1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-inter focus:outline-none focus:border-[#00d4ff]/40 placeholder-gray-600"
            />
          </div>

          {/* End Time */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-inter text-gray-400 uppercase">
              Hora Fin (HH:MM)
            </label>
            <input
              type="text"
              placeholder="10:30"
              pattern="^([01]\d|2[0-3]):[0-5]\d$"
              value={formData.endTime}
              onChange={(e) =>
                setFormData({ ...formData, endTime: e.target.value })
              }
              className="bg-[#0a0e1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-inter focus:outline-none focus:border-[#00d4ff]/40 placeholder-gray-600"
            />
          </div>

          {/* Capacity */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-inter text-gray-400 uppercase">
              Capacidad Máxima
            </label>
            <input
              type="number"
              min="1"
              value={formData.maxCapacity}
              onChange={(e) =>
                setFormData({ ...formData, maxCapacity: e.target.value })
              }
              className="bg-[#0a0e1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-inter focus:outline-none focus:border-[#00d4ff]/40"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition font-semibold text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 px-4 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-lg transition font-semibold text-sm disabled:opacity-50"
          >
            {isSaving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
