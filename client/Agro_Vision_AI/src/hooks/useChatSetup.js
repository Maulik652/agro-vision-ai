/**
 * useChatSetup — shared hook for both BuyerChatPage and FarmerChatPage.
 * Connects the /chat socket, fetches conversations, and wires global socket events.
 *
 * The socket is a singleton — we connect once and keep it alive across page
 * navigations. We only disconnect on explicit logout (handled in AuthContext).
 */
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchConversations } from "../services/chatAPI.js";
import { connectChatSocket, getChatSocket } from "../services/chatSocket.js";
import useChatStore from "../store/chatStore.js";

export default function useChatSetup(user) {
  const qc = useQueryClient();
  const { setUserOnline, setUserOffline } = useChatStore();

  /* ── Connect socket once per user session ────────────────── */
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("token");
    const socket = connectChatSocket(token);

    // Avoid re-registering listeners if already connected
    if (socket.hasListeners?.("user_online")) return;

    const onOnline  = ({ userId }) => setUserOnline(userId);
    const onOffline = ({ userId }) => setUserOffline(userId);
    const onNewMsg  = ({ conversationId, message }) => {
      // Only update conversation list badge — ChatWindow handles appending
      // messages for the active conversation via receive_message
      qc.invalidateQueries({ queryKey: ["conversations"] });
    };

    socket.on("user_online",  onOnline);
    socket.on("user_offline", onOffline);
    socket.on("new_message",  onNewMsg);

    // Cleanup listeners only — do NOT disconnect the socket
    // (it's a singleton; disconnecting here would break ChatWindow)
    return () => {
      socket.off("user_online",  onOnline);
      socket.off("user_offline", onOffline);
      socket.off("new_message",  onNewMsg);
    };
  }, [user?._id ?? user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Fetch conversations ─────────────────────────────────── */
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn:  fetchConversations,
    staleTime: 30_000,
    enabled:  !!user,
  });

  return { conversations, isLoading };
}
