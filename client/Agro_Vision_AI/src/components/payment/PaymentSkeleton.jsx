export default function PaymentSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-5 gap-8 animate-pulse">
      {/* Left */}
      <div className="lg:col-span-3 space-y-5">
        <div className="h-5 bg-slate-100 rounded w-1/3" />
        {[1, 2].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
            <div className="h-4 bg-slate-100 rounded w-1/4" />
            {[1, 2].map((j) => (
              <div key={j} className="flex gap-4">
                <div className="w-14 h-14 bg-slate-100 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-slate-100 rounded w-1/2" />
                  <div className="h-3 bg-slate-100 rounded w-1/3" />
                </div>
                <div className="h-4 bg-slate-100 rounded w-16" />
              </div>
            ))}
          </div>
        ))}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 h-28" />
      </div>
      {/* Right */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex justify-between">
              <div className="h-3 bg-slate-100 rounded w-1/3" />
              <div className="h-3 bg-slate-100 rounded w-1/4" />
            </div>
          ))}
          <div className="h-12 bg-slate-100 rounded-xl mt-4" />
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-slate-100 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
