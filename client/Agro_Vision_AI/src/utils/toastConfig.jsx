import toast from "react-hot-toast";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";

const baseStyle =
  "flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl backdrop-blur-md border border-slate-200 bg-white/80 text-slate-800";

export const showSuccess = (message) =>
  toast.custom((t) => (
    <div
      className={`${baseStyle} ${
        t.visible ? "animate-enter" : "animate-leave"
      }`}
    >
      <CheckCircle className="text-green-600" size={20} />
      <span className="font-medium">{message}</span>
    </div>
  ));

export const showError = (message) =>
  toast.custom((t) => (
    <div
      className={`${baseStyle} ${
        t.visible ? "animate-enter" : "animate-leave"
      }`}
    >
      <XCircle className="text-red-500" size={20} />
      <span className="font-medium">{message}</span>
    </div>
  ));

export const showWarning = (message) =>
  toast.custom((t) => (
    <div
      className={`${baseStyle} ${
        t.visible ? "animate-enter" : "animate-leave"
      }`}
    >
      <AlertTriangle className="text-amber-500" size={20} />
      <span className="font-medium">{message}</span>
    </div>
  ));