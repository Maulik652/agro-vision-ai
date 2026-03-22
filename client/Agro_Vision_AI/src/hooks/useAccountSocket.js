/**
 * useAccountSocket
 * Listens for admin-initiated account changes on the shared socket:
 *   - account_status_changed → show toast + force logout if suspended/blocked
 *   - account_role_changed   → show toast + force logout (role change requires re-login)
 *   - admin_broadcast        → show a persistent toast notification
 *
 * Mount this once at the top of each role's layout/dashboard.
 */
import { useEffect } from "react";
import { io } from "socket.io-client";
import toast from "react-hot-toast";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

let _socket = null;

function getSocket() {
  if (!_socket || _socket.disconnected) {
    const token = localStorage.getItem("token");
    _socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
    });
  }
  return _socket;
}

export default function useAccountSocket() {
  useEffect(() => {
    const socket = getSocket();

    const handleStatusChange = ({ status, message }) => {
      if (status === "suspended" || status === "blocked") {
        toast.error(message || "Your account has been restricted.", {
          duration: 8000,
          id: "account-status",
        });
        // Force logout after a short delay so user can read the message
        setTimeout(() => {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.href = "/login";
        }, 3000);
      } else if (status === "active") {
        toast.success(message || "Your account has been reactivated.", {
          duration: 5000,
          id: "account-status",
        });
      }
    };

    const handleRoleChange = ({ role, message }) => {
      toast(message || `Your role has been changed to ${role}. Please log in again.`, {
        icon: "🔄",
        duration: 6000,
        id: "account-role",
      });
      setTimeout(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }, 3000);
    };

    const handleAdminBroadcast = ({ title, message }) => {
      toast(
        (t) => (
          <div className="flex flex-col gap-1 max-w-xs">
            <p className="font-semibold text-slate-800 text-sm">{title}</p>
            <p className="text-xs text-slate-600">{message}</p>
          </div>
        ),
        {
          duration: 10000,
          id: `broadcast-${Date.now()}`,
          icon: "📢",
        }
      );
    };

    socket.on("account_status_changed", handleStatusChange);
    socket.on("account_role_changed", handleRoleChange);
    socket.on("admin_broadcast", handleAdminBroadcast);

    return () => {
      socket.off("account_status_changed", handleStatusChange);
      socket.off("account_role_changed", handleRoleChange);
      socket.off("admin_broadcast", handleAdminBroadcast);
    };
  }, []);
}
