import { useState, memo } from "react";
import { motion } from "framer-motion";
import { Trash2, Plus, Minus, Package, AlertCircle } from "lucide-react";

const PLACEHOLDER = "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&q=80";

const CartItem = memo(function CartItem({ item, onRemove, onQtyChange, disabled }) {
  const [imgErr, setImgErr] = useState(false);
  const [localQty, setLocalQty] = useState(item.quantity);

  const isOutOfStock = item.availableStock === 0;
  const isLowStock   = item.availableStock > 0 && item.availableStock <= 10;
  const subtotal     = (item.pricePerKg * item.quantity).toLocaleString("en-IN");

  const handleDecrease = () => {
    if (localQty <= 1 || disabled) return;
    const next = localQty - 1;
    setLocalQty(next);
    onQtyChange(item.crop, next);
  };

  const handleIncrease = () => {
    if (disabled || localQty >= item.availableStock) return;
    const next = localQty + 1;
    setLocalQty(next);
    onQtyChange(item.crop, next);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.22 }}
      className={`flex gap-4 p-4 bg-white border rounded-2xl transition-all ${
        isOutOfStock
          ? "border-red-100 opacity-60"
          : "border-slate-100 hover:border-slate-200 hover:shadow-sm"
      }`}
    >
      {/* Image */}
      <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0 relative">
        <img
          src={imgErr || !item.cropImage ? PLACEHOLDER : item.cropImage}
          alt={item.cropName}
          onError={() => setImgErr(true)}
          loading="lazy"
          className="w-full h-full object-cover"
        />
        {isOutOfStock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white text-[9px] font-bold">OUT OF STOCK</span>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-slate-800 font-semibold text-sm leading-tight truncate">
              {item.cropName}
            </h3>
            <span className="flex items-center gap-1 text-slate-400 text-[10px] mt-0.5">
              <Package size={9} />
              {item.availableStock?.toLocaleString()} {item.unit ?? "kg"} available
            </span>
            {isLowStock && (
              <span className="flex items-center gap-1 text-amber-500 text-[10px] mt-0.5">
                <AlertCircle size={9} /> Low stock
              </span>
            )}
          </div>
          <button
            onClick={() => onRemove(item.crop)}
            disabled={disabled}
            aria-label={`Remove ${item.cropName}`}
            className="text-slate-300 hover:text-red-400 transition-colors p-1 shrink-0 disabled:opacity-40"
          >
            <Trash2 size={14} />
          </button>
        </div>

        {/* Qty + Price row */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handleDecrease}
              disabled={disabled || localQty <= 1}
              aria-label="Decrease quantity"
              className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200 disabled:opacity-30 transition-all flex items-center justify-center"
            >
              <Minus size={11} />
            </button>
            <span className="text-slate-800 text-sm font-semibold w-10 text-center tabular-nums">
              {localQty}
            </span>
            <button
              onClick={handleIncrease}
              disabled={disabled || localQty >= item.availableStock}
              aria-label="Increase quantity"
              className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200 disabled:opacity-30 transition-all flex items-center justify-center"
            >
              <Plus size={11} />
            </button>
            <span className="text-slate-400 text-xs">{item.unit ?? "kg"}</span>
          </div>
          <div className="text-right">
            <p className="text-green-700 font-bold text-base tabular-nums">₹{subtotal}</p>
            <p className="text-slate-400 text-[10px]">
              ₹{item.pricePerKg}/{item.unit ?? "kg"}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

export default CartItem;
