/**
 * useOfferSocket
 * Listens for real-time offer events:
 *   - new_offer, offer_accepted, offer_rejected, offer_counter,
 *     offer_responded, new_order, order_paid, crop_price_update
 * Uses the shared singleton market socket — no new connection per hook.
 */
import { useRef } from "react";
import useMarketSocket from "./useMarketSocket";

const OFFER_EVENTS = [
  "new_offer", "offer_accepted", "offer_rejected",
  "offer_counter", "offer_responded", "new_order",
  "order_paid", "crop_price_update",
];

export default function useOfferSocket(handlers = {}) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const eventMap = {};
  OFFER_EVENTS.forEach((evt) => {
    eventMap[evt] = (payload) => handlersRef.current?.[evt]?.(payload);
  });

  useMarketSocket(eventMap);
}
