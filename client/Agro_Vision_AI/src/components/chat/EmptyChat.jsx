import { MessageSquare } from "lucide-react";

export default function EmptyChat({ message = "Select a conversation to start chatting" }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
      <div className="w-20 h-20 rounded-full bg-green-50 flex items-center justify-center mb-4">
        <MessageSquare size={36} className="text-green-400" />
      </div>
      <p className="text-slate-600 font-medium mb-1">No conversation selected</p>
      <p className="text-slate-400 text-sm max-w-xs">{message}</p>
    </div>
  );
}
