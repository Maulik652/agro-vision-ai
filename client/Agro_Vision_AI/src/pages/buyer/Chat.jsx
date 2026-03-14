import React from "react";

const Chat = () => {
  return (
    <div className="mx-auto max-w-6xl p-4">
      <h1 className="text-2xl font-bold text-slate-100">Buyer Chat</h1>
      <p className="mt-2 text-slate-300">This is a placeholder for buyer chat functionality.</p>
      <div className="mt-6 rounded-xl border border-white/20 bg-slate-900/60 p-6">
        <p className="text-slate-400">Real-time chat features via Socket.IO will be implemented here.</p>
      </div>
    </div>
  );
};

export default Chat;
