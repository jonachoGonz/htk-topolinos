import { useEffect, useState } from "react";
import { Check, X, User, Loader2, CreditCard, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  getBookingsForSlot,
  confirmBookingAttendance,
} from "@/services/supabase";

interface SlotStudentsListProps {
  professionalId: string;
  bookingDate: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string;
  professionalType?: "kinesiologist" | "nutritionist" | "therapist";
  onClose: () => void;
}

interface SlotBooking {
  id: string;
  student_id: string;
  attended?: boolean;
  charged_from_plan?: boolean;
  professional_type?: string;
  student?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export default function SlotStudentsList({
  professionalId,
  bookingDate,
  startTime,
  endTime,
  professionalType = "kinesiologist",
  onClose,
}: SlotStudentsListProps) {
  const [bookings, setBookings] = useState<SlotBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchBookings();
  }, [professionalId, bookingDate, startTime]);

  const fetchBookings = async () => {
    setLoading(true);
    const result = await getBookingsForSlot(professionalId, bookingDate, startTime);
    if (result.success) {
      setBookings(result.data || []);
    } else {
      toast.error(`Error: ${result.error}`);
    }
    setLoading(false);
  };

  const handleAttendance = async (bookingId: string, attended: boolean) => {
    setUpdating(bookingId);
    const result = await confirmBookingAttendance(bookingId, attended);
    if (result.success) {
      if (attended && result.consumedFromPlan) {
        toast.success("Asistencia confirmada y 1 clase descontada del plan");
      } else if (attended) {
        if (professionalType === "nutritionist") {
          toast.success("Asistencia confirmada (nutricionista — no consume del plan)");
        } else {
          toast.success("Asistencia confirmada (sin plan disponible para descontar)");
        }
      } else {
        toast.success("Asistencia marcada como ausente");
      }
      fetchBookings();
    } else {
      toast.error(`Error: ${result.error}`);
    }
    setUpdating(null);
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-[#0a0e1a] border border-white/10 rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#0a0e1a] border-b border-white/10 p-5 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-white font-montserrat">
              Alumnos inscritos
            </h3>
            <p className="text-sm text-gray-400 font-inter mt-1">
              {bookingDate} • {startTime} a {endTime}
            </p>
            {professionalType === "nutritionist" && (
              <div className="mt-2 flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <p className="text-amber-300 text-xs font-inter">
                  Sesión de nutrición: no se descuenta del plan del alumno.
                </p>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
            aria-label="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {loading ? (
            <div className="py-8 flex items-center justify-center text-gray-500">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Cargando alumnos...
            </div>
          ) : bookings.length === 0 ? (
            <div className="py-8 text-center text-gray-500 font-inter text-sm">
              No hay alumnos inscritos en este horario.
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map((b) => {
                const isUpdating = updating === b.id;
                const studentName = b.student?.full_name || "Sin nombre";
                return (
                  <div
                    key={b.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-[#0f131a] border border-white/[0.06]"
                  >
                    <div className="w-10 h-10 rounded-full bg-[#00d4ff]/10 border border-[#00d4ff]/20 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-[#00d4ff]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold font-lexend text-sm truncate">
                        {studentName}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {b.attended === true && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <Check className="w-3 h-3" />
                            Asistió
                          </span>
                        )}
                        {b.attended === false && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                            <X className="w-3 h-3" />
                            Ausente
                          </span>
                        )}
                        {b.charged_from_plan && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            <CreditCard className="w-3 h-3" />
                            Cobrada del plan
                          </span>
                        )}
                        {b.professional_type === "nutritionist" && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            Nutrición
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAttendance(b.id, true)}
                        disabled={isUpdating || b.attended === true}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                        title="Confirmar asistencia"
                      >
                        {isUpdating ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        Asistió
                      </button>
                      <button
                        onClick={() => handleAttendance(b.id, false)}
                        disabled={isUpdating || b.attended === false}
                        className="px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold hover:bg-red-500/20 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                        title="Marcar como ausente"
                      >
                        <X className="w-3.5 h-3.5" />
                        Ausente
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[#0a0e1a] border-t border-white/10 p-4 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-white text-sm font-semibold hover:bg-white/[0.08] transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
