export function CardSkeleton() {
  return (
    <div className="glass-card p-6 space-y-3">
      <div className="skeleton h-4 w-24" />
      <div className="skeleton h-8 w-32" />
      <div className="skeleton h-3 w-16" />
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="glass-card divide-y divide-current/[0.08]">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 p-4">
          <div className="skeleton w-12 h-12 rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-4 w-3/4" />
            <div className="skeleton h-3 w-1/2" />
          </div>
          <div className="skeleton h-4 w-16" />
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <div className="glass-card p-6">
      <div className="skeleton h-5 w-32 mb-4" />
      <div className="skeleton rounded-lg" style={{ height }} />
    </div>
  );
}
