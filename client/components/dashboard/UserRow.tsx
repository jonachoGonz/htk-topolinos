import { CheckCircle, XCircle } from "lucide-react";

export type AttendanceStatus = "confirmed" | "absent" | "pending";

export interface Patient {
  id: string;
  name: string;
  studentId: string;
  diagnosis?: string;
  alert?: string;
  status: AttendanceStatus;
  initials: string;
  avatarColor: string;
  online?: boolean;
}

interface UserRowProps {
  patient: Patient;
  onStatusChange: (id: string, status: AttendanceStatus) => void;
  onDismiss: (id: string) => void;
}

const statusConfig: Record<
  AttendanceStatus,
  { label: string; classes: string; showCheck: boolean }
> = {
  confirmed: {
    label: "Confirmado",
    classes:
      "border border-emerald-500/40 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20",
    showCheck: true,
  },
  absent: {
    label: "Ausente",
    classes:
      "bg-rose-950/80 border border-rose-800/50 text-rose-400 hover:bg-rose-900/80",
    showCheck: false,
  },
  pending: {
    label: "Confirmación pendiente",
    classes:
      "bg-[#1a1f2e] border border-white/10 text-gray-400 hover:bg-white/10",
    showCheck: false,
  },
};

// Cycle through statuses on click
const nextStatus: Record<AttendanceStatus, AttendanceStatus> = {
  confirmed: "absent",
  absent: "pending",
  pending: "confirmed",
};

export default function UserRow({ patient, onStatusChange, onDismiss }: UserRowProps) {
  const { id, name, studentId, diagnosis, alert, status, initials, avatarColor, online } = patient;
  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-3 py-3.5 border-b border-white/[0.05] last:border-0">
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold font-lexend"
          style={{ backgroundColor: avatarColor }}
        >
          {initials}
        </div>
        {online !== false && (
          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#0f131a]" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="text-white text-sm font-semibold font-inter truncate">
          {name}
        </div>
        {alert ? (
          <div className="text-orange-400 text-xs font-inter">{alert}</div>
        ) : (
          <div className="text-gray-500 text-xs font-inter">
            ID: {studentId}
            {diagnosis && ` • ${diagnosis}`}
          </div>
        )}
      </div>

      {/* Status button */}
      <button
        onClick={() => onStatusChange(id, nextStatus[status])}
        className={`
          flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold font-inter
          transition-all duration-150 whitespace-nowrap flex-shrink-0
          ${config.classes}
        `}
      >
        {config.showCheck && <CheckCircle className="w-3 h-3" />}
        {config.label}
      </button>

      {/* Dismiss button */}
      <button
        onClick={() => onDismiss(id)}
        className="flex-shrink-0 text-gray-600 hover:text-gray-400 transition"
        aria-label="Dismiss"
      >
        <XCircle className="w-5 h-5" />
      </button>
    </div>
  );
}
