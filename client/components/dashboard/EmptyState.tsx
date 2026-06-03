import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

interface Props {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export default function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className = "",
}: Props) {
  return (
    <div
      className={`
        flex flex-col items-center justify-center text-center
        py-12 sm:py-16 px-6 rounded-3xl
        bg-white/[0.02] border border-dashed border-white/[0.08]
        ${className}
      `}
    >
      {/* Illustrative icon block */}
      <div className="relative w-20 h-20 mb-5">
        <div className="absolute inset-0 rounded-2xl bg-cyan-400/[0.06] border border-cyan-400/15" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon className="w-9 h-9 text-cyan-400/70" strokeWidth={1.5} />
        </div>
        {/* Decorative dots */}
        <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-cyan-400/40" />
        <span className="absolute -bottom-1 -left-1 w-1 h-1 rounded-full bg-cyan-400/30" />
      </div>

      <h3 className="text-base sm:text-lg font-bold text-white mb-1.5">{title}</h3>
      {description && (
        <p className="text-sm text-gray-400 max-w-sm leading-relaxed">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="
            mt-5 inline-flex items-center px-5 py-2.5
            bg-cyan-400 text-[#0a0e1a] text-sm font-semibold rounded-full
            hover:bg-cyan-300 active:scale-[0.98] transition
          "
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
