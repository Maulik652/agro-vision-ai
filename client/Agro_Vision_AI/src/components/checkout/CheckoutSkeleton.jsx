export default function CheckoutSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-3 gap-8 animate-pulse">
      <div className="lg:col-span-2 space-y-4">
        <div className="h-6 bg-slate-100 rounded w-1/3" />
        {[1, 2].map((i) => (
          <div key={i} className="bg-white border border-slate-100 rounded-2xl p-5 space-y-3">
            <div className="h-4 bg-slate-100 rounded w-1/4" />
            <div className="flex gap-4">
              <div className="w-16 h-16 bg-slate-100 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-100 rounded w-1/2" />
                <div className="h-3 bg-slate-100 rounded w-1/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="space-y-4">
        <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex justify-between">
              <div className="h-3 bg-slate-100 rounded w-1/3" />
              <div className="h-3 bg-slate-100 rounded w-1/4" />
            </div>
          ))}
          <div className="h-10 bg-slate-100 rounded-xl mt-4" />
        </div>
      </div>
    </div>
  );
}
