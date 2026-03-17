import React from "react";
import { Star } from "lucide-react";

const StarRating = ({ rating = 0, max = 5, size = 14, interactive = false, onChange }) => (
  <div className="flex items-center gap-0.5">
    {Array.from({ length: max }, (_, i) => (
      <Star
        key={i}
        size={size}
        className={`${i < Math.round(rating) ? "text-amber-400 fill-amber-400" : "text-slate-300"} ${interactive ? "cursor-pointer hover:text-amber-400 transition-colors" : ""}`}
        onClick={() => interactive && onChange && onChange(i + 1)}
      />
    ))}
  </div>
);

export default StarRating;
