/** Placeholder berdenyut untuk loading state. */
export function Skeleton({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return <div style={style} className={`animate-pulse rounded-md bg-white/10 ${className}`} />;
}

/** Kartu skeleton generik (border + bg seperti kartu konten). */
export function SkeletonCard({ className = "", children }: { className?: string; children?: React.ReactNode }) {
  return <div className={`rounded-2xl border border-white/10 bg-white/[0.03] p-4 ${className}`}>{children}</div>;
}
