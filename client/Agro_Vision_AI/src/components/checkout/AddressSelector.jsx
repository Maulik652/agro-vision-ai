import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin, Plus, Pencil, Trash2, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { fetchAddresses, createAddress, updateAddress, deleteAddress } from "../../services/checkoutAPI.js";
import useCheckoutStore from "../../store/checkoutStore.js";
import AddAddressModal from "./AddAddressModal.jsx";

export default function AddressSelector() {
  const qc = useQueryClient();
  const { selectedAddressId, setSelectedAddress } = useCheckoutStore();
  const [modal, setModal] = useState({ open: false, editing: null });

  const { data: addresses = [], isLoading } = useQuery({
    queryKey: ["addresses"],
    queryFn: fetchAddresses,
    staleTime: 60_000,
  });

  // Auto-select default address on load
  useEffect(() => {
    if (!selectedAddressId && addresses.length) {
      const def = addresses.find((a) => a.isDefault) ?? addresses[0];
      setSelectedAddress(def._id);
    }
  }, [addresses, selectedAddressId, setSelectedAddress]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["addresses"] });

  const saveMutation = useMutation({
    mutationFn: (data) =>
      modal.editing
        ? updateAddress(modal.editing._id, data)
        : createAddress(data),
    onSuccess: (addr) => {
      invalidate();
      setModal({ open: false, editing: null });
      if (!modal.editing) setSelectedAddress(addr._id);
      toast.success(modal.editing ? "Address updated" : "Address added");
    },
    onError: () => toast.error("Failed to save address"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAddress,
    onSuccess: () => { invalidate(); toast.success("Address removed"); },
    onError: () => toast.error("Failed to delete address"),
  });

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2].map((i) => (
          <div key={i} className="h-20 bg-slate-100 rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-800 font-semibold text-sm flex items-center gap-2">
          <MapPin size={15} className="text-green-700" /> Delivery Address
        </h3>
        <button
          onClick={() => setModal({ open: true, editing: null })}
          className="flex items-center gap-1.5 text-xs text-green-700 hover:text-green-800 font-medium"
        >
          <Plus size={13} /> Add New
        </button>
      </div>

      {addresses.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-slate-400 text-sm mb-3">No saved addresses</p>
          <button
            onClick={() => setModal({ open: true, editing: null })}
            className="px-4 py-2 rounded-xl bg-green-700 text-white text-xs font-semibold hover:bg-green-800 transition-all"
          >
            Add Address
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {addresses.map((addr) => {
            const selected = selectedAddressId === addr._id;
            return (
              <div
                key={addr._id}
                onClick={() => setSelectedAddress(addr._id)}
                className={`relative flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selected
                    ? "border-green-600 bg-green-50"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <CheckCircle2
                  size={18}
                  className={`mt-0.5 shrink-0 ${selected ? "text-green-600" : "text-slate-300"}`}
                  fill={selected ? "currentColor" : "none"}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-slate-800 text-sm font-semibold">{addr.fullName}</p>
                  <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">
                    {addr.street}, {addr.city}, {addr.state} — {addr.postalCode}
                  </p>
                  <p className="text-slate-400 text-xs">{addr.phone}</p>
                  {addr.isDefault && (
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[10px] font-semibold">
                      Default
                    </span>
                  )}
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); setModal({ open: true, editing: addr }); }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(addr._id); }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddAddressModal
        open={modal.open}
        onClose={() => setModal({ open: false, editing: null })}
        onSave={(data) => saveMutation.mutate(data)}
        saving={saveMutation.isPending}
        initial={modal.editing}
      />
    </div>
  );
}
