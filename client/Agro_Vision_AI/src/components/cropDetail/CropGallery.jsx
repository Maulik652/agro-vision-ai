import { useMemo, useState } from "react";
import { motion as Motion } from "framer-motion";
import { Expand, Image as ImageIcon, X } from "lucide-react";

const optimizeCloudinary = (url) => {
	if (!url || typeof url !== "string") return "";
	if (!url.includes("res.cloudinary.com")) return url;
	if (url.includes("/upload/f_auto,q_auto/")) return url;
	return url.replace("/upload/", "/upload/f_auto,q_auto,w_1200/");
};

const CropGallery = ({ images = [], cropName = "Crop" }) => {
	const normalizedImages = useMemo(() => {
		const valid = Array.isArray(images) ? images.filter(Boolean) : [];
		return valid.length ? valid.map(optimizeCloudinary) : [""];
	}, [images]);

	const [selectedIndex, setSelectedIndex] = useState(0);
	const [fullscreenOpen, setFullscreenOpen] = useState(false);

	const activeImage = normalizedImages[selectedIndex] || "";

	return (
		<section className="space-y-3 rounded-3xl border border-[#d7ebda] bg-white p-4 shadow-[0_14px_30px_-22px_rgba(20,78,37,0.42)]">
			<div className="relative overflow-hidden rounded-2xl border border-[#d5e8d8] bg-[#eff8f1]">
				{activeImage ? (
					<div className="group relative h-87.5 sm:h-105">
						<img
							src={activeImage}
							alt={`${cropName} preview`}
							className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
						/>
						<button
							type="button"
							onClick={() => setFullscreenOpen(true)}
							className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-xl bg-black/65 px-3 py-2 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-black/75"
						>
							<Expand size={14} />
							Full Screen
						</button>
					</div>
				) : (
					<div className="grid h-87.5 place-items-center sm:h-105">
						<div className="text-center text-[#588064]">
							<ImageIcon size={30} className="mx-auto mb-2" />
							<p className="text-sm font-semibold">No crop image available</p>
						</div>
					</div>
				)}
			</div>

			<div className="flex gap-2 overflow-x-auto pb-1">
				{normalizedImages.map((image, index) => (
					<button
						key={`${image}-${index}`}
						type="button"
						onClick={() => setSelectedIndex(index)}
						className={`relative h-20 w-24 shrink-0 overflow-hidden rounded-xl border transition ${
							index === selectedIndex
								? "border-green-500 ring-2 ring-green-100"
								: "border-[#d6e7d8]"
						}`}
					>
						{image ? (
							<img src={image} alt={`${cropName} ${index + 1}`} className="h-full w-full object-cover" />
						) : (
							<div className="grid h-full place-items-center bg-[#f2f8f3] text-[#7a9b82]">
								<ImageIcon size={16} />
							</div>
						)}
					</button>
				))}
			</div>

			{fullscreenOpen && (
				<Motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					className="fixed inset-0 z-50 grid place-items-center bg-black/90 p-5"
				>
					<button
						type="button"
						onClick={() => setFullscreenOpen(false)}
						className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
					>
						<X size={18} />
					</button>
					{activeImage ? (
						<img src={activeImage} alt={`${cropName} fullscreen`} className="max-h-[90vh] max-w-[95vw] rounded-2xl object-contain" />
					) : (
						<div className="text-white">No image available</div>
					)}
				</Motion.div>
			)}
		</section>
	);
};

export default CropGallery;
