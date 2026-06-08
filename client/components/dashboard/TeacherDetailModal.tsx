import { X } from "lucide-react";
import TeacherProfileForm from "./TeacherProfileForm";

interface TeacherDetailModalProps {
  teacherId: string;
  teacherName: string;
  onClose: () => void;
}

/**
 * Modal admin para editar profesionales del centro. Envuelve el
 * TeacherProfileForm existente (que el propio profesor usa desde su tab
 * "Mi Perfil") para no duplicar lógica. Cuando el admin cambia datos del
 * profesional desde acá, se persisten en la misma fila de profiles.
 */
export default function TeacherDetailModal({
  teacherId, teacherName, onClose,
}: TeacherDetailModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center p-2 sm:p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-[#0a0e1a] border border-white/10 rounded-xl max-w-4xl w-full max-h-[95vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-[#0a0e1a] border-b border-white/10 p-4 flex items-start justify-between">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.18em] text-emerald-300 font-inter">
              Profesional
            </p>
            <h3 className="text-lg font-bold text-white font-montserrat truncate">
              {teacherName}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="text-gray-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <TeacherProfileForm teacherId={teacherId} />
        </div>
      </div>
    </div>
  );
}
