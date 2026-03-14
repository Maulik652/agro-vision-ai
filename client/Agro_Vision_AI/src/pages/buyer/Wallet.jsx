import React from "react";

const Wallet = () => {
  return (
    <div className="mx-auto max-w-6xl p-4">
      <h1 className="text-2xl font-bold text-slate-100">Wallet</h1>
      <p className="mt-2 text-slate-300">Placeholder for buyer wallet overview.</p>
      <div className="mt-6 rounded-xl border border-white/20 bg-slate-900/60 p-6">
        <p className="text-slate-400">Balance, pending, and transaction data will show here.</p>
      </div>
    </div>
  );
};

export default Wallet;
