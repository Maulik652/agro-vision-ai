import { ArrowRight, Sparkles } from "lucide-react";

const formatCurrency = (value) =>
	`₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(Number(value || 0))}`;

const SimilarCrops = ({ crops = [], onViewCrop }) => (
	<section className="rounded-3xl border border-[#d7ebda] bg-white p-4 shadow-[0_14px_30px_-22px_rgba(20,78,37,0.42)]">
		<h2 className="mb-3 text-lg font-extrabold text-[#174a26]">Similar Crops</h2>

		{crops.length ? (
			<div className="flex gap-3 overflow-x-auto pb-1">
				{crops.map((crop) => (
					<article key={crop.id} className="w-67.5 shrink-0 overflow-hidden rounded-2xl border border-[#d9eadd] bg-[#fafffb]">
						<div className="h-32 bg-[#e9f5ec]">
							{crop.image ? (
								<img src={crop.image} alt={crop.cropName} className="h-full w-full object-cover" />
							) : null}
						</div>
						<div className="space-y-2 p-3">
							<p className="text-base font-extrabold text-[#1b4f29]">{crop.cropName}</p>
							<p className="text-sm font-semibold text-[#2f6e3e]">{formatCurrency(crop.pricePerKg)} / kg</p>
							<p className="text-xs text-[#5f8268]">Category: {crop.category || "General"}</p>
							<p className="inline-flex items-center gap-1 rounded-full bg-[#f0f4ff] px-2 py-1 text-xs font-semibold text-[#4b61ba]">
								<Sparkles size={12} />
								AI Match {Math.round(Number(crop.aiRecommendation || 0) * 100)}%
							</p>
							<button
								type="button"
								onClick={() => onViewCrop?.(crop.id)}
								className="mt-1 inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-green-700"
							>
								View Details
								<ArrowRight size={13} />
							</button>
						</div>
					</article>
				))}
			</div>
		) : (
			<div className="rounded-xl border border-dashed border-[#d7e8da] bg-[#f8fdf9] p-4 text-sm text-[#5c8065]">
				No similar crops available currently.
			</div>
		)}
	</section>
);

export default SimilarCrops;
