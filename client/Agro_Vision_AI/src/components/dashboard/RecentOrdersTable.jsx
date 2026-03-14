import React from "react";
import { motion } from "framer-motion";
import { Clock3 } from "lucide-react";

const RecentOrdersTable = ({ orders = [] }) => {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="overflow-hidden rounded-2xl border border-white/20 bg-white/10 p-4 shadow-xl"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Recent Orders</h2>
        <span className="text-xs text-slate-300">Live orders are updated every minute</span>
      </div>
      <div className="overflow-auto">
        <table className="min-w-full text-left text-sm text-slate-200">
          <thead className="border-b border-white/20 text-xs uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-3 py-2">Order ID</th>
              <th className="px-3 py-2">Crop</th>
              <th className="px-3 py-2">Farmer</th>
              <th className="px-3 py-2">Qty</th>
              <th className="px-3 py-2">Price</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">ETA</th>
            </tr>
          </thead>
          <tbody>
            {orders.length ? orders.map((order) => (
              <tr key={order.orderId} className="border-b border-white/10 hover:bg-blue-900/10">
                <td className="px-3 py-2 font-medium text-white">{order.orderId}</td>
                <td className="px-3 py-2">{order.crop}</td>
                <td className="px-3 py-2">{order.farmer}</td>
                <td className="px-3 py-2">{order.quantity}</td>
                <td className="px-3 py-2">Rs {order.price}</td>
                <td className="px-3 py-2">{order.status}</td>
                <td className="flex items-center gap-1 px-3 py-2 text-xs text-slate-300"><Clock3 className="h-3.5 w-3.5" />{order.deliveryETA}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={7} className="px-3 py-5 text-center text-sm text-slate-400">No recent orders found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.section>
  );
};

export default RecentOrdersTable;
