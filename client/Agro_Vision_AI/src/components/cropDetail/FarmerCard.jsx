import { BadgeCheck, MessageCircle, MapPin, ShieldCheck, ShoppingBag, Star, UserRound } from "lucide-react";

const FarmerCard = ({ farmer, onChatFarmer, onViewFarmerProfile }) => {
	if (!farmer) return null;

	return (
		<section className="rounded-3xl border border-[#d7ebda] bg-white p-4 shadow-[0_14px_30px_-22px_rgba(20,78,37,0.42)]">
			<h2 className="mb-3 text-lg font-extrabold text-[#174a26]">Farmer Profile</h2>

			<div className="mb-3 rounded-2xl bg-[#f5fbf7] p-3">
				<p className="inline-flex items-center gap-2 text-sm font-bold text-[#1f582f]">
					<UserRound size={16} />
					{farmer.name || "Farmer"}
				</p>
				<p className="mt-1 inline-flex items-center gap-2 text-sm text-[#4f7458]">
					<MapPin size={15} />
					{farmer.farmLocation || "N/A"}
				</p>
			</div>

			<div className="grid gap-2 sm:grid-cols-2">
				<div className="rounded-xl border border-[#dcecdf] bg-[#fbfffc] p-3">
					<p className="text-xs font-semibold uppercase tracking-wide text-[#668a6f]">Farmer Rating</p>
					<p className="mt-1 inline-flex items-center gap-1 text-lg font-extrabold text-[#1f582f]">
						<Star size={15} className="text-amber-500" fill="currentColor" />
						{Number(farmer.rating || 0).toFixed(1)}
					</p>
				</div>
				<div className="rounded-xl border border-[#dcecdf] bg-[#fbfffc] p-3">
					<p className="text-xs font-semibold uppercase tracking-wide text-[#668a6f]">Total Sales</p>
					<p className="mt-1 inline-flex items-center gap-1 text-lg font-extrabold text-[#1f582f]">
						<ShoppingBag size={15} />
						₹{Number(farmer.totalSales || 0).toLocaleString("en-IN")}
					</p>
				</div>
			</div>

			<div className="mt-3 rounded-xl border border-[#dcecdf] bg-[#fbfffc] p-3">
				<p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#668a6f]">Certifications</p>
				<div className="flex flex-wrap gap-2">
					{Array.isArray(farmer.certifications) && farmer.certifications.length ? (
						farmer.certifications.map((cert) => (
							<span key={cert} className="inline-flex items-center gap-1 rounded-full bg-[#ecf7ef] px-2.5 py-1 text-xs font-semibold text-[#2d6f3e]">
								<BadgeCheck size={12} />
								{cert}
							</span>
						))
					) : (
						<span className="inline-flex items-center gap-1 rounded-full bg-[#f4f8f5] px-2.5 py-1 text-xs font-semibold text-[#6f8b75]">
							<ShieldCheck size={12} />
							No certification listed
						</span>
					)}
				</div>
			</div>

			<div className="mt-4 flex flex-wrap gap-2">
				<button
					type="button"
					onClick={onChatFarmer}
					className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-green-700"
				>
					<MessageCircle size={15} />
					Chat Farmer
				</button>
				<button
					type="button"
					onClick={onViewFarmerProfile}
					className="rounded-xl border border-[#cfe2d3] bg-[#f8fff9] px-4 py-2.5 text-sm font-semibold text-[#2d6f3e] transition hover:bg-[#e9f7ec]"
				>
					View Farmer Profile
				</button>
			</div>
		</section>
	);
};

export default FarmerCard;
