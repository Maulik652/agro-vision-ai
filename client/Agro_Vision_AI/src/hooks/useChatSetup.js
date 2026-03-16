/**
 * useChatSetup — shared hook for both BuyerChatPage and FarmerChatPage.
 * Connects the socket, fetches conversations, and wires global socket events.
 */
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchConversations } from "../services/chatAPI.js";
import { connectChatSocket, disconnectChatSocket, getChatSocket } from "../services/chatSocket.js";
import useChatStore from "../store/chatStore.js";

export default function useChatSetup(user) {
  const qc = useQueryClient();
  const { setUserOnline, setUserOffline, appendMessage } = useChatStore();

  /* ── Connect socket on mount ─────────────────────────────── */
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("token");
    const socket = connectChatSocket(token);

    socket.on("user_online",  ({ userId }) => setUserOnline(userId));
    socket.on("user_offline", ({ userId }) => setUserOffline(userId));

    // new_message: update conversation list badge from outside active window
    socket.on("new_message", ({ conversationId, message }) => {
      appendMessage(conversationId, message);
      qc.invalidateQueries({ queryKey: ["conversations"] });
    });

    return () => {
      socket.off("user_online");
      socket.off("user_offline");
      socket.off("new_message");
      disconnectChatSocket();
    };
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Fetch conversations ─────────────────────────────────── */
  const { data: conversations = [], isLoading } = useQuery({
    queryKey: ["conversations"],
    queryFn:  fetchConversations,
    staleTime: 60_000,
    enabled:  !!user,
  });

  return { conversations, isLoading };
}
