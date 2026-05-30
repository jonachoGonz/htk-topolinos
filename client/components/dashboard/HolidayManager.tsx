import { useEffect, useState } from "react";
import { Trash2, Plus, Calendar } from "lucide-react";
import { toast } from "sonner";
import {
  getHolidays,
  createHoliday,
  deleteHoliday,
  type Holiday,
} from "@/services/supabase";

interface HolidayManagerProps {
  professionalId: string;
}

export default function HolidayManager({
  professionalId,
}: HolidayManagerProps) {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    startDate: "",
    endDate: "",
    isRecurring: false,
    recurringType: "yearly" as "yearly" | "monthly",
    notes: "",
  });

  useEffect(() => {
    fetchHolidays();
  }, [professionalId]);

  const fetchHolidays = async () => {
    setIsLoading(true);
    const result = await getHolidays(professionalId);
    if (result.success) {
      setHolidays(result.data || []);
    } else {
      toast.error(`Error al cargar vacaciones: ${result.error}`);
    }
    setIsLoading(false);
  };

  const handleCreate = async () => {
    if (!formData.title || !formData.startDate || !formData.endDate) {
      toast.error("Por favor completa los campos requeridos");
      return;
    }

    setIsCreating(true);
    const result = await createHoliday(
      professionalId,
      formData.title,
      formData.startDate,
      formData.endDate,
      formData.isRecurring,
      formData.isRecurring ? formData.recurringType : undefined,
      formData.notes
    );

    if (result.success) {
      toast.success("Vacación creada correctamente");
      setFormData({
        title: "",
        startDate: "",
        endDate: "",
        isRecurring: false,
        recurringType: "yearly",
        notes: "",
      });
      fetchHolidays();
    } else {
      toast.error(`Error: ${result.error}`);
    }
    setIsCreating(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta vacación?")) {
      return;
    }

    const result = await deleteHoliday(id);
    if (result.success) {
      toast.success("Vacación eliminada");
      fetchHolidays();
    } else {
      toast.error(`Error al eliminar: ${result.error}`);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Create Form */}
      <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white font-lexend mb-4">
          Agregar Vacaciones
        </h2>
        <div className="space-y-4">
          {/* Title */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-inter text-gray-400 uppercase">
              Título de Vacaciones *
            </label>
            <input
              type="text"
              placeholder="Vacaciones de verano, enfermedad, etc."
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="bg-[#0a0e1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-inter focus:outline-none focus:border-[#00d4ff]/40 placeholder-gray-600"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-inter text-gray-400 uppercase">
                Fecha Inicio *
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
                className="bg-[#0a0e1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-inter focus:outline-none focus:border-[#00d4ff]/40"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-inter text-gray-400 uppercase">
                Fecha Fin *
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value })
                }
                className="bg-[#0a0e1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-inter focus:outline-none focus:border-[#00d4ff]/40"
              />
            </div>
          </div>

          {/* Recurring */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isRecurring"
              checked={formData.isRecurring}
              onChange={(e) =>
                setFormData({ ...formData, isRecurring: e.target.checked })
              }
              className="rounded border-gray-300"
            />
            <label
              htmlFor="isRecurring"
              className="text-sm text-gray-400 cursor-pointer"
            >
              Repetir anualmente (Si es feriado/fecha especial)
            </label>
          </div>

          {formData.isRecurring && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-inter text-gray-400 uppercase">
                Tipo de Recurrencia
              </label>
              <select
                value={formData.recurringType}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    recurringType: e.target.value as "yearly" | "monthly",
                  })
                }
                className="bg-[#0a0e1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-inter focus:outline-none focus:border-[#00d4ff]/40"
              >
                <option value="yearly">Anualmente</option>
                <option value="monthly">Mensualmente</option>
              </select>
            </div>
          )}

          {/* Notes */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-inter text-gray-400 uppercase">
              Notas (Opcional)
            </label>
            <textarea
              placeholder="Información adicional sobre las vacaciones..."
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={3}
              className="bg-[#0a0e1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-inter focus:outline-none focus:border-[#00d4ff]/40 placeholder-gray-600 resize-none"
            />
          </div>

          {/* Button */}
          <div className="flex justify-end">
            <button
              onClick={handleCreate}
              disabled={isCreating}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white rounded-lg transition font-semibold text-sm disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Agregar Vacación
            </button>
          </div>
        </div>
      </div>

      {/* Holidays List */}
      <div className="bg-[#0f131a] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-lg font-semibold text-white font-lexend flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Períodos de Vacaciones
          </h2>
        </div>

        {isLoading ? (
          <div className="px-6 py-8 text-center text-gray-500">
            Cargando vacaciones...
          </div>
        ) : holidays.length === 0 ? (
          <div className="px-6 py-8 text-center text-gray-500">
            Sin períodos de vacaciones registrados
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {holidays.map((holiday) => (
              <div
                key={holiday.id}
                className="px-6 py-4 hover:bg-white/[0.02] transition"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white mb-2">
                      {holiday.title}
                    </h3>
                    <p className="text-sm text-gray-400 mb-2">
                      {formatDate(holiday.start_date)} -{" "}
                      {formatDate(holiday.end_date)}
                    </p>
                    {holiday.is_recurring && (
                      <span className="inline-block text-xs bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
                        Repetir {holiday.recurring_type === "yearly" ? "anualmente" : "mensualmente"}
                      </span>
                    )}
                    {holiday.notes && (
                      <p className="text-xs text-gray-500 mt-2">
                        Notas: {holiday.notes}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(holiday.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-red-400 hover:bg-red-500/10 rounded transition text-sm whitespace-nowrap"
                  >
                    <Trash2 className="w-4 h-4" />
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
