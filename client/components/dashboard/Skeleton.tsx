// Skeleton primitives for loading states. Honors prefers-reduced-motion via CSS.
interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`htk-skel ${className}`} aria-hidden="true" />;
}

export function SkeletonText({
  lines = 3,
  className = "",
}: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="htk-skel h-3 rounded"
          style={{ width: `${i === lines - 1 ? 60 : 90 + Math.random() * 10}%` }}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 space-y-4 ${className}`}
      aria-hidden="true"
    >
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-2/3 rounded" />
          <Skeleton className="h-2.5 w-1/3 rounded" />
        </div>
      </div>
      <SkeletonText lines={3} />
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div
      className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-4 sm:p-5 space-y-3"
      aria-hidden="true"
    >
      <Skeleton className="w-8 h-8 rounded-lg" />
      <Skeleton className="h-7 w-16 rounded" />
      <Skeleton className="h-2.5 w-24 rounded" />
    </div>
  );
}
