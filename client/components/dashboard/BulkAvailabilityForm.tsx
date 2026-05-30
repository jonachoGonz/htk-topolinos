import { useState } from "react";
import { Calendar, Copy } from "lucide-react";
import { toast } from "sonner";
import {
  createBulkAvailability,
  type ProfessionalType,
} from "@/services/supabase";

const DAYS_OF_WEEK = [
  { idx: 0, short: "Lun", full: "Lunes" },
  { idx: 1, short: "Mar", full: "Martes" },
  { idx: 2, short: "Mié", full: "Miércoles" },
  { idx: 3, short: "Jue", full: "Jueves" },
  { idx: 4, short: "Vie", full: "Viernes" },
  { idx: 5, short: "Sáb", full: "Sábado" },
  { idx: 6, short: "Dom", full: "Domingo" },
];

interface BulkAvailabilityFormProps {
  professionalId: string;
  defaultProfessionalType?: ProfessionalType;
  onSuccess: () => void;
}

type DayPreset = "weekdays" | "weekends" | "all" | "custom";

export default function BulkAvailabilityForm({
  professionalId,
  defaultProfessionalType = "kinesiologist",
  onSuccess,
}: BulkAvailabilityFormProps) {
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [preset, setPreset] = useState<DayPreset>("custom");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:30");
  const [capacity, setCapacity] = useState("5");
  const [professionalType, setProfessionalType] =
    useState<ProfessionalType>(defaultProfessionalType);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const applyPreset = (newPreset: DayPreset) => {
    setPreset(newPreset);
    switch (newPreset) {
      case "weekdays":
        setSelectedDays([0, 1, 2, 3, 4]); // Lun-Vie
        break;
      case "weekends":
        setSelectedDays([5, 6]); // Sáb-Dom
        break;
      case "all":
        setSelectedDays([0, 1, 2, 3, 4, 5, 6]); // Lun-Dom
        break;
      case "custom":
        setSelectedDays([]);
        break;
    }
  };

  const toggleDay = (idx: number) => {
    setPreset("custom");
    setSelectedDays((prev) =>
      prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx]
    );
  };

  const handleSubmit = async () => {
    if (selectedDays.length === 0) {
      toast.error("Selecciona al menos un día de la semana");
      return;
    }
    if (!startTime || !endTime) {
      toast.error("Define horario de inicio y fin");
      return;
    }
    if (startTime >= endTime) {
      toast.error("La hora de inicio debe ser anterior a la de fin");
      return;
    }

    setLoading(true);
    const result = await createBulkAvailability(
      professionalId,
      selectedDays,
      startTime,
      endTime,
      parseInt(capacity),
      professionalType,
      notes || undefined
    );

    if (result.success) {
      toast.success(
        `✅ ${result.data?.inserted_count ?? selectedDays.length} horarios creados (${startTime}–${endTime})`
      );
      setSelectedDays([]);
      setNotes("");
      setPreset("custom");
      onSuccess();
    } else {
      toast.error(`Error: ${result.error}`);
    }
    setLoading(false);
  };

  return (
    <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Copy className="w-5 h-5 text-[#00d4ff]" />
        <h2 className="text-lg font-semibold text-white font-lexend">
          Asignación Masiva de Horarios
        </h2>
      </div>
      <p className="text-gray-400 text-sm font-inter mb-5">
        Aplica el mismo horario a varios días de la semana en una sola acción.
      </p>

      {/* Presets */}
      <div className="mb-5">
        <label className="text-xs font-inter text-gray-400 uppercase mb-2 block">
          Plantilla rápida
        </label>
        <div className="flex gap-2 flex-wrap">
          {[
            { value: "weekdays" as DayPreset, label: "Lunes a Viernes" },
            { value: "weekends" as DayPreset, label: "Fin de semana" },
            { value: "all" as DayPreset, label: "Toda la semana" },
            { value: "custom" as DayPreset, label: "Personalizado" },
          ].map((p) => (
            <button
              key={p.value}
              onClick={() => applyPreset(p.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold font-inter transition ${
                preset === p.value
                  ? "bg-[#00d4ff]/20 border border-[#00d4ff]/40 text-[#00d4ff]"
                  : "bg-[#0a0e1a] border border-white/10 text-gray-400 hover:text-white"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Day Checkboxes */}
      <div className="mb-5">
        <label className="text-xs font-inter text-gray-400 uppercase mb-2 block">
          Días seleccionados ({selectedDays.length})
        </label>
        <div className="grid grid-cols-7 gap-2">
          {DAYS_OF_WEEK.map((d) => {
            const isSelected = selectedDays.includes(d.idx);
            return (
              <button
                key={d.idx}
                type="button"
                onClick={() => toggleDay(d.idx)}
                className={`py-3 rounded-lg border text-center font-lexend transition ${
                  isSelected
                    ? "bg-[#00d4ff]/15 border-[#00d4ff]/40 text-[#00d4ff]"
                    : "bg-[#0a0e1a] border-white/10 text-gray-400 hover:border-white/20 hover:text-white"
                }`}
                title={d.full}
              >
                <div className="text-[10px] uppercase tracking-wider">{d.short}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Times + Capacity + Type */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        <div>
          <label className="text-xs font-inter text-gray-400 uppercase mb-1.5 block">
            Inicio
          </label>
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full bg-[#0a0e1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-inter focus:outline-none focus:border-[#00d4ff]/40"
          />
        </div>
        <div>
          <label className="text-xs font-inter text-gray-400 uppercase mb-1.5 block">
            Fin
          </label>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full bg-[#0a0e1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-inter focus:outline-none focus:border-[#00d4ff]/40"
          />
        </div>
        <div>
          <label className="text-xs font-inter text-gray-400 uppercase mb-1.5 block">
            Capacidad
          </label>
          <input
            type="number"
            min="1"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            className="w-full bg-[#0a0e1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-inter focus:outline-none focus:border-[#00d4ff]/40"
          />
        </div>
        <div>
          <label className="text-xs font-inter text-gray-400 uppercase mb-1.5 block">
            Tipo
          </label>
          <select
            value={professionalType}
            onChange={(e) => setProfessionalType(e.target.value as ProfessionalType)}
            className="w-full bg-[#0a0e1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-inter focus:outline-none focus:border-[#00d4ff]/40"
          >
            <option value="kinesiologist">Kinesiólogo</option>
            <option value="nutritionist">Nutricionista</option>
            <option value="therapist">Terapeuta</option>
          </select>
        </div>
      </div>

      {/* Notes */}
      <div className="mb-5">
        <label className="text-xs font-inter text-gray-400 uppercase mb-1.5 block">
          Notas (opcional) — ej: "permite reagendar", "horario verano"
        </label>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Permite reagendar / Horario habitual / etc."
          className="w-full bg-[#0a0e1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-inter focus:outline-none focus:border-[#00d4ff]/40 placeholder-gray-600"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading || selectedDays.length === 0}
        className="w-full py-2.5 bg-[#00d4ff] hover:bg-cyan-300 text-[#05050A] rounded-lg font-bold font-lexend transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <Calendar className="w-4 h-4" />
        {loading ? "Creando..." : `Crear ${selectedDays.length} horario${selectedDays.length === 1 ? "" : "s"}`}
      </button>
    </div>
  );
}
