import React from "react";
import { BellRing, PhoneCall, Send } from "lucide-react";

const urgencyClass = (urgency) => {
  if (urgency === "high") {
    return "bg-[#ffe8d2] text-[#874300]";
  }

  if (urgency === "medium") {
    return "bg-[#fff3d8] text-[#6f5d12]";
  }

  return "bg-[#e8f5e9] text-[#2b6f3d]";
};

const BuyerAlertsPanel = ({ alerts = [] }) => {
  return (
    <section className="rounded-3xl border border-[#d7ebd9] bg-white p-4 shadow-[0_16px_30px_-24px_rgba(25,89,40,0.62)]">
      <h3 className="inline-flex items-center gap-2 text-lg font-black text-[#1f4f2a]">
        <BellRing size={18} />
        Smart Buyer Alerts
      </h3>

      <div className="mt-3 space-y-3">
        {alerts.length ? alerts.slice(0, 4).map((alert) => (
          <article key={alert.id} className="rounded-2xl border border-[#d7ebd9] bg-[#f9fff9] p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-[#265f35]">{alert.message}</p>
                <p className="mt-1 text-xs text-[#55735c]">Offer price Rs {alert.offerPrice}/kg</p>
              </div>
              <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${urgencyClass(alert.urgency)}`}>
                {String(alert.urgency || "medium").toUpperCase()}
              </span>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <a
                href={alert.phone ? `tel:${alert.phone}` : "#"}
                className="inline-flex items-center gap-1 rounded-xl border border-[#cbe0ce] bg-white px-3 py-1.5 text-xs font-semibold text-[#2f6f40]"
              >
                <PhoneCall size={13} />
                Call Buyer
              </a>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-xl bg-[#2e7d32] px-3 py-1.5 text-xs font-semibold text-white"
              >
                <Send size={13} />
                Send Offer
              </button>
            </div>
          </article>
        )) : (
          <div className="rounded-2xl border border-dashed border-[#cadfcd] bg-[#f7fff8] p-4 text-sm text-[#5a7960]">
            Buyer alerts will appear as soon as demand signals become active for your crop.
          </div>
        )}
      </div>
    </section>
  );
};

export default BuyerAlertsPanel;
