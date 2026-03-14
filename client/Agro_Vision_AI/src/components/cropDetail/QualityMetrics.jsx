import { motion as Motion } from "framer-motion";
import { Droplets, PackageCheck, Ruler, ShieldCheck } from "lucide-react";

const MetricBar = ({ icon, label, value, toneClass }) => (
	<div className="rounded-2xl border border-[#d8e9dc] bg-[#fbfffc] p-3">
		<div className="mb-2 flex items-center justify-between gap-2">
			<p className="inline-flex items-center gap-2 text-sm font-semibold text-[#456a4f]">
				{icon ? icon({ size: 15 }) : null}
				{label}
			</p>
			<p className="text-sm font-extrabold text-[#184a27]">{value}%</p>
		</div>
		<div className="h-2.5 overflow-hidden rounded-full bg-[#e5efe7]">
			<Motion.div
				initial={{ width: 0 }}
				animate={{ width: `${Math.max(0, Math.min(100, Number(value || 0)))}%` }}
				transition={{ duration: 0.55, ease: "easeOut" }}
				className={`h-full rounded-full ${toneClass}`}
			/>
		</div>
	</div>
);

const QualityMetrics = ({ metrics }) => {
	if (!metrics) return null;

	return (
		<section className="rounded-3xl border border-[#d7ebda] bg-white p-4 shadow-[0_14px_30px_-22px_rgba(20,78,37,0.42)]">
			<h2 className="mb-3 text-lg font-extrabold text-[#174a26]">Crop Quality Metrics</h2>
			<div className="grid gap-3 sm:grid-cols-2">
				<MetricBar icon={Droplets} label="Moisture Percentage" value={metrics.moisturePercentage} toneClass="bg-blue-500" />
				<MetricBar icon={PackageCheck} label="Grain Purity" value={metrics.grainPurity} toneClass="bg-green-500" />
				<MetricBar icon={Ruler} label="Size Consistency" value={metrics.sizeConsistency} toneClass="bg-emerald-500" />
				<MetricBar icon={ShieldCheck} label="Storage Condition" value={metrics.storageCondition} toneClass="bg-lime-500" />
			</div>
		</section>
	);
};

export default QualityMetrics;
