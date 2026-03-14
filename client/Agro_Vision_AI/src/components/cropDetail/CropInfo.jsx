import { CalendarDays, Droplets, Leaf, MapPin, Package, Scale, ShieldCheck, Star } from "lucide-react";

const formatCurrency = (value) =>
	`₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(Number(value || 0))}`;

const formatDate = (value) => {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "N/A";
	return date.toLocaleDateString("en-IN", {
		day: "2-digit",
		month: "short",
		year: "numeric"
	});
};

const InfoCard = ({ icon, label, value, valueClass = "text-[#1b4e29]" }) => (
	<div className="rounded-2xl border border-[#d7e9da] bg-[#f7fcf8] p-3.5">
		<p className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#5f8669]">
			{icon ? icon({ size: 13 }) : null}
			{label}
		</p>
		<p className={`text-sm font-extrabold ${valueClass}`}>{value}</p>
	</div>
);

const CropInfo = ({ crop }) => {
	if (!crop) return null;

	const locationText = [crop.location?.city || "", crop.location?.state || ""].filter(Boolean).join(", ") || "N/A";

	return (
		<section className="rounded-3xl border border-[#d7ebda] bg-white p-4 shadow-[0_14px_30px_-22px_rgba(20,78,37,0.42)]">
			<div className="mb-3">
				<h1 className="text-2xl font-black tracking-tight text-[#184a27] sm:text-3xl">{crop.cropName}</h1>
				<p className="text-sm font-medium text-[#5d7f64]">Category: {crop.category || "General"}</p>
			</div>

			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				<InfoCard icon={Scale} label="Price Per Kg" value={formatCurrency(crop.pricePerKg)} />
				<InfoCard icon={Package} label="Available Quantity" value={`${Number(crop.quantityAvailable || 0).toLocaleString("en-IN")} kg`} />
				<InfoCard icon={CalendarDays} label="Harvest Date" value={formatDate(crop.harvestDate)} />
				<InfoCard icon={Droplets} label="Moisture Level" value={`${Number(crop.moistureLevel || 0).toFixed(1)}%`} />
				<InfoCard icon={Star} label="Quality Grade" value={crop.qualityGrade || "B"} />
				<InfoCard
					icon={ShieldCheck}
					label="Organic Certification"
					value={crop.organicCertified ? "Certified Organic" : "Standard Produce"}
					valueClass={crop.organicCertified ? "text-green-700" : "text-amber-700"}
				/>
				<InfoCard icon={MapPin} label="Location" value={locationText} />
				<InfoCard icon={Leaf} label="Listing Age" value={formatDate(crop.createdAt)} />
			</div>
		</section>
	);
};

export default CropInfo;
