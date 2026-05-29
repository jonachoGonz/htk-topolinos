import { useEffect, useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  getAvailability,
  createAvailability,
  deleteAvailability,
  type Availability,
} from "@/services/supabase";

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
  const [formData, setFormData] = useState({
    dayOfWeek: "0",
    startTime: "09:00",
    endTime: "10:30",
    maxCapacity: "5",
  });

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
      parseInt(formData.maxCapacity)
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
      {/* Create Form */}
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
              Hora Inicio
            </label>
            <input
              type="time"
              value={formData.startTime}
              onChange={(e) =>
                setFormData({ ...formData, startTime: e.target.value })
              }
              className="bg-[#0a0e1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-inter focus:outline-none focus:border-[#00d4ff]/40"
            />
          </div>

          {/* End Time */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-inter text-gray-400 uppercase">
              Hora Fin
            </label>
            <input
              type="time"
              value={formData.endTime}
              onChange={(e) =>
                setFormData({ ...formData, endTime: e.target.value })
              }
              className="bg-[#0a0e1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-inter focus:outline-none focus:border-[#00d4ff]/40"
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-white/[0.06]">
                <tr className="text-left text-xs font-inter text-gray-400 uppercase tracking-wider">
                  <th className="px-6 py-3">Día</th>
                  <th className="px-6 py-3">Inicio</th>
                  <th className="px-6 py-3">Fin</th>
                  <th className="px-6 py-3">Capacidad</th>
                  <th className="px-6 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {availabilities.map((av) => (
                  <tr
                    key={av.id}
                    className="hover:bg-white/[0.02] transition text-white"
                  >
                    <td className="px-6 py-3 font-medium">
                      {DAYS_OF_WEEK[av.day_of_week]}
                    </td>
                    <td className="px-6 py-3 text-gray-400">
                      {av.start_time}
                    </td>
                    <td className="px-6 py-3 text-gray-400">{av.end_time}</td>
                    <td className="px-6 py-3">{av.max_capacity} personas</td>
                    <td className="px-6 py-3">
                      <button
                        onClick={() => handleDelete(av.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-red-400 hover:bg-red-500/10 rounded transition text-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
