export default function OrdersSkeleton() {
  return (
    <div className="space-y-4">
      {/* Stats skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 bg-white rounded-2xl border border-slate-100 animate-pulse" />
        ))}
      </div>
      {/* Card skeletons */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-slate-100 overflow-hidden animate-pulse">
          <div className="h-12 bg-slate-50 border-b border-slate-100" />
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-slate-100 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-40 bg-slate-200 rounded" />
                <div className="h-3 w-28 bg-slate-100 rounded" />
                <div className="h-3 w-20 bg-slate-100 rounded" />
              </div>
              <div className="space-y-1 text-right">
                <div className="h-3 w-12 bg-slate-100 rounded ml-auto" />
                <div className="h-6 w-20 bg-slate-200 rounded" />
              </div>
            </div>
            <div className="h-8 bg-slate-100 rounded-xl" />
            <div className="flex justify-end">
              <div className="h-8 w-28 bg-slate-200 rounded-xl" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
