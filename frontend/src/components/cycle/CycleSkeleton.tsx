export function CycleSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <div className="h-7 w-48 bg-neutral-800 rounded" />
          <div className="h-4 w-64 bg-neutral-800 rounded" />
        </div>
        <div className="flex gap-3">
          <div className="h-9 w-28 bg-neutral-800 rounded-lg" />
          <div className="h-9 w-24 bg-neutral-800 rounded-lg" />
          <div className="h-9 w-20 bg-neutral-800 rounded-lg" />
        </div>
      </div>

      {/* Circle skeleton */}
      <div className="flex justify-center mb-8">
        <div className="w-48 h-48 rounded-full bg-neutral-800 border-4 border-neutral-700" />
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-neutral-900 rounded-2xl border border-neutral-800 p-4 space-y-2">
            <div className="h-3 w-16 bg-neutral-800 rounded" />
            <div className="h-6 w-24 bg-neutral-800 rounded" />
            <div className="h-3 w-20 bg-neutral-800 rounded" />
          </div>
        ))}
      </div>

      {/* Calendar skeleton */}
      <div className="bg-neutral-900 rounded-2xl border border-neutral-800 p-4 space-y-3">
        <div className="h-3 w-24 bg-neutral-800 rounded" />
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="aspect-square bg-neutral-800 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
