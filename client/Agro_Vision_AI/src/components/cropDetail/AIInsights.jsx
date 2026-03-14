import { motion as Motion } from "framer-motion";
import { Activity, BarChart3, Brain, Gauge, LineChart, Sparkles } from "lucide-react";

const formatCurrency = (value) =>
	`₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(Number(value || 0))}`;

const formatPercent = (value) => `${Math.round(Number(value || 0) * 100)}%`;

const InsightItem = ({ icon, title, value, subtitle }) => (
	<Motion.article
		initial={{ opacity: 0, y: 14 }}
		animate={{ opacity: 1, y: 0 }}
		className="rounded-2xl border border-[#d8e9dc] bg-[#f9fefb] p-3"
	>
		<p className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-[#5f8669]">
			{icon ? icon({ size: 13 }) : null}
			{title}
		</p>
		<p className="text-lg font-extrabold text-[#1b4f29]">{value}</p>
		{subtitle ? <p className="text-xs text-[#6f8f76]">{subtitle}</p> : null}
	</Motion.article>
);

const AIInsights = ({ insights, source }) => {
	if (!insights) return null;

	return (
		<section className="rounded-3xl border border-[#d7ebda] bg-white p-4 shadow-[0_14px_30px_-22px_rgba(20,78,37,0.42)]">
			<div className="mb-3 flex items-center justify-between gap-3">
				<h2 className="inline-flex items-center gap-2 text-lg font-extrabold text-[#174a26]">
					<Brain size={18} className="text-purple-600" />
					AI Market Insights
				</h2>
				<span className="inline-flex items-center gap-1 rounded-full bg-[#f0f3ff] px-2.5 py-1 text-xs font-semibold text-[#4a5fbd]">
					<Sparkles size={12} />
					{source === "ai-service" ? "Live AI" : "Fallback Model"}
				</span>
			</div>

			<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
				<InsightItem icon={LineChart} title="Current Market Price" value={formatCurrency(insights.current_price)} />
				<InsightItem icon={BarChart3} title="AI Predicted Price" value={formatCurrency(insights.predicted_price)} />
				<InsightItem icon={Gauge} title="Demand Score" value={formatPercent(insights.demand_score)} />
				<InsightItem icon={Activity} title="Market Volatility" value={formatPercent(insights.volatility_index)} />
				<InsightItem icon={Sparkles} title="Confidence Score" value={formatPercent(insights.confidence_score)} />
			</div>
		</section>
	);
};

export default AIInsights;
