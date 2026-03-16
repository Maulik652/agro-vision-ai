import { useAuth } from "../../context/AuthContext";

export default function BuyerProfile() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#f8fafc] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-bold text-slate-900 mb-6">My Profile</h1>

        <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center text-2xl font-bold text-emerald-700">
              {user?.name?.[0]?.toUpperCase() || "B"}
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-900">{user?.name || "Buyer"}</p>
              <p className="text-sm text-slate-500">{user?.email || ""}</p>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            <div className="py-3 flex justify-between text-sm">
              <span className="text-slate-500">Role</span>
              <span className="font-medium text-slate-800 capitalize">{user?.role || "buyer"}</span>
            </div>
            <div className="py-3 flex justify-between text-sm">
              <span className="text-slate-500">Phone</span>
              <span className="font-medium text-slate-800">{user?.phone || "—"}</span>
            </div>
            <div className="py-3 flex justify-between text-sm">
              <span className="text-slate-500">Location</span>
              <span className="font-medium text-slate-800">{user?.location || "—"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
