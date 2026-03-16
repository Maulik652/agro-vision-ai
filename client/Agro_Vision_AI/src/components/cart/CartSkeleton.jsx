/** Loading skeleton for the cart page */
export default function CartSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-8 animate-pulse">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Items skeleton */}
        <div className="lg:col-span-2 space-y-4">
          {/* Farmer group header */}
          <div className="h-5 w-40 bg-slate-200 rounded-lg" />
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-4 p-4 bg-white rounded-2xl border border-slate-100">
              <div className="w-20 h-20 rounded-xl bg-slate-200 shrink-0" />
              <div className="flex-1 space-y-3">
                <div className="h-4 w-32 bg-slate-200 rounded" />
                <div className="h-3 w-24 bg-slate-100 rounded" />
                <div className="flex justify-between items-center">
                  <div className="h-8 w-28 bg-slate-100 rounded-lg" />
                  <div className="h-6 w-20 bg-slate-200 rounded" />
                </div>
              </div>
            </div>
          ))}
          {/* Second farmer group */}
          <div className="h-5 w-36 bg-slate-200 rounded-lg mt-4" />
          <div className="flex gap-4 p-4 bg-white rounded-2xl border border-slate-100">
            <div className="w-20 h-20 rounded-xl bg-slate-200 shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="h-4 w-28 bg-slate-200 rounded" />
              <div className="h-3 w-20 bg-slate-100 rounded" />
              <div className="flex justify-between items-center">
                <div className="h-8 w-28 bg-slate-100 rounded-lg" />
                <div className="h-6 w-20 bg-slate-200 rounded" />
              </div>
            </div>
          </div>
        </div>

        {/* Summary skeleton */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
          <div className="h-5 w-32 bg-slate-200 rounded" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex justify-between">
              <div className="h-4 w-24 bg-slate-100 rounded" />
              <div className="h-4 w-16 bg-slate-200 rounded" />
            </div>
          ))}
          <div className="h-px bg-slate-100" />
          <div className="flex justify-between">
            <div className="h-5 w-20 bg-slate-200 rounded" />
            <div className="h-6 w-24 bg-slate-300 rounded" />
          </div>
          <div className="h-12 w-full bg-slate-200 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
