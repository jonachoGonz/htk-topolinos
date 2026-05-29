import { AlertCircle, Check, X } from "lucide-react";

export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDangerous?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  icon?: "warning" | "info" | "success";
}

export default function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  isDangerous = false,
  isLoading = false,
  onConfirm,
  onCancel,
  icon = "info",
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  const iconMap = {
    warning: <AlertCircle className="w-6 h-6 text-amber-400" />,
    info: <AlertCircle className="w-6 h-6 text-blue-400" />,
    success: <Check className="w-6 h-6 text-emerald-400" />,
  };

  const confirmBgColor = isDangerous
    ? "bg-red-500 hover:bg-red-600"
    : "bg-[#0284c7] hover:bg-[#0369a1]";

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-[#0f131a] border border-white/10 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              {iconMap[icon]}
              <h2 className="text-lg font-bold text-white font-lexend">
                {title}
              </h2>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            <p className="text-gray-300 text-sm font-inter leading-relaxed">
              {message}
            </p>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-white/10 flex gap-3 justify-end">
            <button
              onClick={onCancel}
              disabled={isLoading}
              className="px-4 py-2 rounded-lg border border-white/10 text-gray-300 text-sm font-semibold font-lexend hover:bg-white/5 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={`px-4 py-2 rounded-lg text-white text-sm font-semibold font-lexend transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${confirmBgColor}`}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  {confirmLabel}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
