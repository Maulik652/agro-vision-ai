/**
 * useAdvisorySocket
 * Subscribes to real-time advisory events using the shared market socket.
 *   - new_advisory       → a new advisory was published by an expert
 *   - advisory_broadcast → urgent alert broadcast from expert
 *   - alert_notification → alias used by buyer side
 */
import { useRef } from "react";
import useMarketSocket from "./useMarketSocket";

export default function useAdvisorySocket({ onNewAdvisory, onBroadcast } = {}) {
  const cbRef = useRef({ onNewAdvisory, onBroadcast });
  cbRef.current = { onNewAdvisory, onBroadcast };

  useMarketSocket({
    new_advisory:       (payload) => cbRef.current.onNewAdvisory?.(payload),
    advisory_broadcast: (payload) => cbRef.current.onBroadcast?.(payload),
    alert_notification: (payload) => cbRef.current.onBroadcast?.(payload),
  });
}
