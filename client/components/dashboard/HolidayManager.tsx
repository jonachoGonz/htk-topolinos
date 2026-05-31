import { useEffect, useState } from "react";
import { Trash2, Plus, Calendar, X, AlertTriangle, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import {
  getHolidays,
  createHoliday,
  deleteHoliday,
  getBookingsAffectedByHoliday,
  cancelBookingsAndNotify,
  type Holiday,
  type AffectedBooking,
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
  const [affectedModal, setAffectedModal] = useState<{
    holiday: Holiday | null;
    bookings: AffectedBooking[];
  } | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [sendingCancellations, setSendingCancellations] = useState(false);
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

      // Check for affected bookings within the date range
      const affectedRes = await getBookingsAffectedByHoliday(
        professionalId, formData.startDate, formData.endDate
      );
      if (affectedRes.success && (affectedRes.data?.length ?? 0) > 0) {
        // Open modal to allow cancel + notify
        const fakeHoliday: Holiday = {
          id: "", professional_id: professionalId,
          title: formData.title,
          start_date: formData.startDate, end_date: formData.endDate,
          is_recurring: formData.isRecurring,
          created_at: new Date().toISOString(),
        };
        setAffectedModal({ holiday: fakeHoliday, bookings: affectedRes.data || [] });
        setCancelReason(formData.title);
      }

      setFormData({
        title: "", startDate: "", endDate: "",
        isRecurring: false, recurringType: "yearly", notes: "",
      });
      fetchHolidays();
    } else {
      toast.error(`Error: ${result.error}`);
    }
    setIsCreating(false);
  };

  const handleCancelAffected = async () => {
    if (!affectedModal) return;
    setSendingCancellations(true);
    const r = await cancelBookingsAndNotify(affectedModal.bookings, cancelReason);
    if (r.success) {
      toast.success(`${r.cancelled} clases canceladas y ${r.notified} alumnos notificados`);
      setAffectedModal(null);
    } else {
      toast.error(`Error: ${r.error}`);
    }
    setSendingCancellations(false);
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

      {/* Affected bookings modal */}
      {affectedModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-[#0a0e1a] border border-white/10 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-3 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-white font-bold font-lexend">Hay clases agendadas en este período</h3>
                  <p className="text-amber-200 text-xs mt-1">
                    {affectedModal.bookings.length} reserva(s) se verá(n) afectada(s). Cancela y notifica a los alumnos para que reagenden.
                  </p>
                </div>
              </div>
              <button onClick={() => setAffectedModal(null)} disabled={sendingCancellations}
                className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {affectedModal.bookings.map((b) => (
                <div key={b.booking_id} className="flex items-center gap-3 p-3 rounded-lg bg-[#0f131a] border border-white/[0.06]">
                  <div className="text-center w-12 flex-shrink-0">
                    <p className="text-[10px] uppercase text-gray-500">
                      {new Date(b.booking_date).toLocaleDateString("es", { weekday: "short" })}
                    </p>
                    <p className="text-sm font-bold text-white">{new Date(b.booking_date).getDate()}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold">{b.student_name || "Alumno"}</p>
                    <p className="text-gray-500 text-xs">{b.start_time.slice(0,5)} – {b.end_time.slice(0,5)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-white/10 p-4 space-y-3">
              <div>
                <label className="block text-[10px] uppercase text-gray-500 font-semibold mb-1">
                  Motivo (se envía al alumno)
                </label>
                <input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full bg-[#0f131a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00d4ff]/40" />
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setAffectedModal(null)} disabled={sendingCancellations}
                  className="px-4 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-white text-sm font-semibold hover:bg-white/[0.08] transition disabled:opacity-40">
                  No cancelar
                </button>
                <button onClick={handleCancelAffected} disabled={sendingCancellations}
                  className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white text-sm font-bold transition flex items-center gap-2 disabled:opacity-40">
                  {sendingCancellations ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Cancelar {affectedModal.bookings.length} y notificar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
