// Thin editorial divider with optional kicker — used between landing sections.
interface Props {
  label?: string;
  number?: string;
}
export default function SectionDivider({ label, number }: Props) {
  return (
    <div className="w-full bg-[#0a0e1a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-4">
        {number && (
          <span className="text-[10px] uppercase tracking-[0.18em] text-cyan-400 font-bold">
            {number}
          </span>
        )}
        <div className="htk-divider flex-1" />
        {label && (
          <span className="text-[10px] uppercase tracking-[0.18em] text-gray-500">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}
