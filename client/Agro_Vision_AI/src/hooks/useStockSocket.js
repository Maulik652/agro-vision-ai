/**
 * useStockSocket
 * Subscribes to real-time `stock_update` events.
 * Uses the shared singleton market socket — no new connection per hook.
 */
import { useRef } from "react";
import useMarketSocket from "./useMarketSocket";

export default function useStockSocket(onStockUpdate) {
  const cbRef = useRef(onStockUpdate);
  cbRef.current = onStockUpdate;

  useMarketSocket({
    stock_update: (payload) => cbRef.current?.(payload),
  });
}
