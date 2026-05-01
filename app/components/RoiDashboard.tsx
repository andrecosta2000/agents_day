import type { Roi } from "@/types/interfaces";

type Props = {
	roi: Roi;
};

function Card({
	label,
	value,
	highlight,
}: {
	label: string;
	value: string;
	highlight?: boolean;
}) {
	return (
		<div
			className={`rounded-xl border px-4 py-3 ${
				highlight
					? "border-emerald-600/40 bg-emerald-950/30"
					: "border-slate-800 bg-slate-950/40"
			}`}
		>
			<p className="text-[11px] uppercase tracking-wide text-slate-500">{label}</p>
			<p className={`mt-1 text-lg font-semibold tabular-nums ${highlight ? "text-emerald-400" : "text-slate-100"}`}>
				{value}
			</p>
		</div>
	);
}

export function RoiDashboard({ roi }: Props) {
	const fmt = (n: number) => `€${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

	return (
		<section className="rounded-2xl border border-emerald-900/45 bg-slate-900/50 p-6">
			<h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-600/90">ROI dashboard</h3>
			<p className="mt-1 text-sm text-slate-500">Monthly economics & investment outlook</p>
			<div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
				<Card label="Monthly net profit" value={fmt(roi.monthlyNetProfitEur)} highlight />
				<Card label="Annual net profit" value={fmt(roi.annualNetProfitEur)} />
				<Card label="Est. investment" value={fmt(roi.estimatedInvestmentEur)} />
				<Card label="Monthly revenue" value={fmt(roi.monthlyRevenueEur)} />
				<Card label="HVAC / mo" value={fmt(roi.monthlyHvacCostEur)} />
				<Card label="Energy / mo" value={fmt(roi.monthlyEnergyCostEur)} />
				<Card label="Water / mo" value={fmt(roi.monthlyWaterCostEur)} />
				<Card label="Breakeven" value={`${roi.breakevenYears} yrs`} highlight />
			</div>
		</section>
	);
}
