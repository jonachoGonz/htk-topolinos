import { useEffect, useState } from "react";
import { Trash2, Plus, Edit2, Users, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import {
  getAvailability,
  createAvailability,
  deleteAvailability,
  type Availability,
  type ProfessionalType,
} from "@/services/supabase";
import EditAvailabilityModal from "./EditAvailabilityModal";
import BulkAvailabilityForm from "./BulkAvailabilityForm";
import SlotStudentsList from "./SlotStudentsList";

interface AvailabilityManagerProps {
  professionalId: string;
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

export default function AvailabilityManager({
  professionalId,
}: AvailabilityManagerProps) {
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [mode, setMode] = useState<"single" | "bulk">("bulk");
  const [selectedAvailability, setSelectedAvailability] =
    useState<Availability | null>(null);
  const [viewStudentsFor, setViewStudentsFor] = useState<{
    avail: Availability;
    date: string;
  } | null>(null);
  const [formData, setFormData] = useState({
    dayOfWeek: "0",
    startTime: "09:00",
    endTime: "10:30",
    maxCapacity: "5",
    professionalType: "kinesiologist" as ProfessionalType,
  });

  const today = new Date();
  // Convert JS getDay (0=Sun..6=Sat) to DB day_of_week (0=Mon..6=Sun)
  const dbToday = today.getDay() === 0 ? 6 : today.getDay() - 1;
  // Build the YYYY-MM-DD of the most recent occurrence of the slot's day_of_week
  const getNextDateForDay = (dayOfWeek: number): string => {
    const d = new Date();
    const dbCurrent = d.getDay() === 0 ? 6 : d.getDay() - 1;
    let diff = dayOfWeek - dbCurrent;
    if (diff < 0) diff += 7;
    d.setDate(d.getDate() + diff);
    return d.toISOString().split("T")[0];
  };

  useEffect(() => {
    fetchAvailabilities();
  }, [professionalId]);

  const fetchAvailabilities = async () => {
    setIsLoading(true);
    const result = await getAvailability(professionalId);
    if (result.success) {
      setAvailabilities(result.data || []);
    } else {
      toast.error(`Error al cargar disponibilidades: ${result.error}`);
    }
    setIsLoading(false);
  };

  const handleCreate = async () => {
    if (!formData.startTime || !formData.endTime) {
      toast.error("Por favor completa todos los campos");
      return;
    }

    setIsCreating(true);
    const result = await createAvailability(
      professionalId,
      parseInt(formData.dayOfWeek),
      formData.startTime,
      formData.endTime,
      parseInt(formData.maxCapacity),
      formData.professionalType
    );

    if (result.success) {
      toast.success("Disponibilidad creada correctamente");
      setFormData({
        dayOfWeek: "0",
        startTime: "09:00",
        endTime: "10:30",
        maxCapacity: "5",
      });
      fetchAvailabilities();
    } else {
      toast.error(`Error: ${result.error}`);
    }
    setIsCreating(false);
  };

  const handleDelete = async (id: string) => {
    const result = await deleteAvailability(id);
    if (result.success) {
      toast.success("Disponibilidad eliminada");
      fetchAvailabilities();
    } else {
      toast.error(`Error al eliminar: ${result.error}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Mode selector */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode("bulk")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold font-lexend transition ${
            mode === "bulk"
              ? "bg-[#00d4ff]/15 border border-[#00d4ff]/40 text-[#00d4ff]"
              : "bg-[#0a0e1a] border border-white/10 text-gray-400 hover:text-white"
          }`}
        >
          Asignación Masiva (Recomendado)
        </button>
        <button
          onClick={() => setMode("single")}
          className={`px-4 py-2 rounded-lg text-sm font-semibold font-lexend transition ${
            mode === "single"
              ? "bg-[#00d4ff]/15 border border-[#00d4ff]/40 text-[#00d4ff]"
              : "bg-[#0a0e1a] border border-white/10 text-gray-400 hover:text-white"
          }`}
        >
          Día individual
        </button>
      </div>

      {mode === "bulk" && (
        <BulkAvailabilityForm
          professionalId={professionalId}
          onSuccess={fetchAvailabilities}
        />
      )}

      {/* Create Form (single mode) */}
      {mode === "single" && (
      <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white font-lexend mb-4">
          Agregar Disponibilidad
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Day Select */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-inter text-gray-400 uppercase">
              Día
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
              Capacidad
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

          {/* Professional Type */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-inter text-gray-400 uppercase">
              Tipo
            </label>
            <select
              value={formData.professionalType}
              onChange={(e) =>
                setFormData({ ...formData, professionalType: e.target.value as ProfessionalType })
              }
              className="bg-[#0a0e1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-inter focus:outline-none focus:border-[#00d4ff]/40"
            >
              <option value="kinesiologist">Kinesiólogo</option>
              <option value="nutritionist">Nutricionista</option>
              <option value="therapist">Terapeuta</option>
            </select>
          </div>

          {/* Button */}
          <div className="flex flex-col gap-2 justify-end">
            <button
              onClick={handleCreate}
              disabled={isCreating}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-lg transition font-semibold text-sm disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Crear
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Availabilities Table */}
      <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-lg font-semibold text-white font-lexend">
            Disponibilidades
          </h2>
        </div>

        {isLoading ? (
          <div className="px-6 py-8 text-center text-gray-500">
            Cargando disponibilidades...
          </div>
        ) : availabilities.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            Sin disponibilidades creadas. ¡Crea una para empezar!
          </div>
        ) : (
          <>
            {/* Desktop: tabla */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-white/[0.06]">
                  <tr className="text-left text-xs font-inter text-gray-400 uppercase tracking-wider">
                    <th className="px-6 py-3">Día</th>
                    <th className="px-6 py-3">Inicio</th>
                    <th className="px-6 py-3">Fin</th>
                    <th className="px-6 py-3">Tipo</th>
                    <th className="px-6 py-3">Capacidad</th>
                    <th className="px-6 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {availabilities.map((av) => {
                    const isToday = av.day_of_week === dbToday;
                    const typeLabel = av.professional_type === "nutritionist" ? "Nutrición" : av.professional_type === "therapist" ? "Terapia" : "Kinesiología";
                    return (
                      <tr key={av.id} className={`hover:bg-white/[0.02] transition text-white ${isToday ? "bg-[#00d4ff]/[0.04]" : ""}`}>
                        <td className="px-6 py-3 font-medium">
                          {DAYS_OF_WEEK[av.day_of_week]}
                          {isToday && <span className="ml-2 text-[10px] uppercase tracking-wider text-[#00d4ff] font-semibold">• Hoy</span>}
                        </td>
                        <td className="px-6 py-3 text-gray-400">{av.start_time}</td>
                        <td className="px-6 py-3 text-gray-400">{av.end_time}</td>
                        <td className="px-6 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${av.professional_type === "nutritionist" ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" : av.professional_type === "therapist" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"}`}>
                            {typeLabel}
                          </span>
                        </td>
                        <td className="px-6 py-3">{av.max_capacity} personas</td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button onClick={() => setViewStudentsFor({ avail: av, date: getNextDateForDay(av.day_of_week) })}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-emerald-400 hover:bg-emerald-500/10 rounded transition text-sm">
                              <Users className="w-4 h-4" /> Alumnos
                            </button>
                            <button onClick={() => setSelectedAvailability(av)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-blue-400 hover:bg-blue-500/10 rounded transition text-sm">
                              <Edit2 className="w-4 h-4" /> Editar
                            </button>
                            <button onClick={() => handleDelete(av.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-red-400 hover:bg-red-500/10 rounded transition text-sm">
                              <Trash2 className="w-4 h-4" /> Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile: grouped by day-of-week with collapsible day sections */}
            <div className="md:hidden">
              {DAYS_OF_WEEK.map((dayName, dowIdx) => {
                const slotsForDay = availabilities
                  .filter((av) => av.day_of_week === dowIdx)
                  .sort((a, b) => a.start_time.localeCompare(b.start_time));
                if (slotsForDay.length === 0) return null;
                const isToday = dowIdx === dbToday;
                return (
                  <details
                    key={dowIdx}
                    open={isToday}
                    className="group border-b border-white/[0.04] last:border-b-0"
                  >
                    <summary
                      className={`
                        flex items-center justify-between gap-3 px-4 py-3 cursor-pointer
                        list-none [&::-webkit-details-marker]:hidden
                        ${isToday ? "bg-cyan-400/[0.04]" : ""}
                      `}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <ChevronRight className="w-4 h-4 text-gray-500 group-open:rotate-90 transition-transform flex-shrink-0" />
                        <span className="text-sm font-bold text-white">{dayName}</span>
                        {isToday && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-bold bg-cyan-400/15 text-cyan-300 border border-cyan-400/25">
                            Hoy
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] uppercase tracking-[0.14em] text-gray-500 font-semibold">
                        {slotsForDay.length} {slotsForDay.length === 1 ? "slot" : "slots"}
                      </span>
                    </summary>

                    <div className="px-4 pb-3 space-y-2">
                      {slotsForDay.map((av) => {
                        const typeLabel = av.professional_type === "nutritionist" ? "Nutrición" : av.professional_type === "therapist" ? "Terapia" : "Kinesiología";
                        const typeClass = av.professional_type === "nutritionist" ? "bg-purple-500/10 text-purple-300 border-purple-500/25" : av.professional_type === "therapist" ? "bg-amber-500/10 text-amber-300 border-amber-500/25" : "bg-cyan-500/10 text-cyan-300 border-cyan-500/25";
                        return (
                          <article
                            key={av.id}
                            className="bg-[#0a0e1a] border border-white/[0.06] rounded-xl p-3"
                          >
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="text-white font-bold text-sm font-mono whitespace-nowrap">
                                {av.start_time.slice(0,5)} – {av.end_time.slice(0,5)}
                              </span>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-semibold border ${typeClass}`}>
                                {typeLabel}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-400 mb-3">
                              Capacidad: <span className="text-gray-200 font-semibold">{av.max_capacity} personas</span>
                            </p>
                            {/* 44px+ tap targets */}
                            <div className="grid grid-cols-3 gap-2">
                              <button
                                onClick={() => setViewStudentsFor({ avail: av, date: getNextDateForDay(av.day_of_week) })}
                                className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-lg text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 transition active:scale-[0.97] hover:bg-emerald-500/20"
                              >
                                <Users className="w-4 h-4" />
                                <span className="text-[10px] uppercase tracking-wider font-bold">Alumnos</span>
                              </button>
                              <button
                                onClick={() => setSelectedAvailability(av)}
                                className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-lg text-blue-300 bg-blue-500/10 border border-blue-500/25 transition active:scale-[0.97] hover:bg-blue-500/20"
                              >
                                <Edit2 className="w-4 h-4" />
                                <span className="text-[10px] uppercase tracking-wider font-bold">Editar</span>
                              </button>
                              <button
                                onClick={() => handleDelete(av.id)}
                                className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-lg text-red-300 bg-red-500/10 border border-red-500/25 transition active:scale-[0.97] hover:bg-red-500/20"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span className="text-[10px] uppercase tracking-wider font-bold">Eliminar</span>
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </details>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Edit Modal */}
      {selectedAvailability && (
        <EditAvailabilityModal
          availability={selectedAvailability}
          onClose={() => setSelectedAvailability(null)}
          onSuccess={fetchAvailabilities}
        />
      )}

      {/* View students in slot */}
      {viewStudentsFor && (
        <SlotStudentsList
          professionalId={professionalId}
          bookingDate={viewStudentsFor.date}
          startTime={viewStudentsFor.avail.start_time.slice(0, 5)}
          endTime={viewStudentsFor.avail.end_time.slice(0, 5)}
          professionalType={viewStudentsFor.avail.professional_type as any}
          onClose={() => setViewStudentsFor(null)}
        />
      )}
    </div>
  );
}
