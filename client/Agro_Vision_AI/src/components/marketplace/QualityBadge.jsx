import { BadgeCheck, Droplets } from "lucide-react";

const QualityBadge = ({ organicCertified = false, qualityGrade = "B", moistureLevel = 0 }) => {
  const gradeTone =
    qualityGrade === "A"
      ? "bg-emerald-100 text-emerald-700"
      : qualityGrade === "B"
        ? "bg-amber-100 text-amber-700"
        : "bg-rose-100 text-rose-700";

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${gradeTone}`}>
        Grade {qualityGrade || "B"}
      </span>

      {organicCertified ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
          <BadgeCheck size={12} />
          Organic
        </span>
      ) : null}

      <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-700">
        <Droplets size={12} />
        {Number(moistureLevel || 0).toFixed(1)}%
      </span>
    </div>
  );
};

export default QualityBadge;
