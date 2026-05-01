import type { Demand } from "@/types/interfaces";

type Props = {
	demand: Demand[];
	cityLabel: string;
	loading?: boolean;
};

const trendConfig = {
	rising:  { label: "↑ rising",  cls: "text-emerald-400" },
	stable:  { label: "→ stable",  cls: "text-slate-400" },
	falling: { label: "↓ falling", cls: "text-orange-400" },
} as const;

function ConfidenceBar({ value }: { value: number }) {
	const pct = Math.round(value * 100);
	return (
		<div className="mt-1 flex items-center gap-1.5" title={`Confidence: ${pct}%`}>
			<div className="h-1 w-16 overflow-hidden rounded-full bg-slate-800">
				<div
					className="h-full rounded-full bg-emerald-600/70"
					style={{ width: `${pct}%` }}
				/>
			</div>
			<span className="text-[10px] text-slate-600">{pct}%</span>
		</div>
	);
}

export function DemandSnippet({ demand, cityLabel, loading }: Props) {
	return (
		<div className="rounded-xl border border-emerald-900/40 bg-slate-900/60 p-4 backdrop-blur-sm">
			<h3 className="text-xs font-medium uppercase tracking-wider text-emerald-600/90">
				Produce demand · {cityLabel}
			</h3>
			{loading ? (
				<p className="mt-3 text-sm text-slate-500">Loading…</p>
			) : demand.length === 0 ? (
				<p className="mt-3 text-sm text-slate-500">No demand data for this city.</p>
			) : (
				<ul className="mt-3 divide-y divide-slate-800/80">
					{demand.map((row) => {
						const trend = row.trend ? trendConfig[row.trend] : null;
						return (
							<li key={row.crop} className="py-2 first:pt-0 last:pb-0">
								<div className="flex items-start justify-between gap-2">
									<span className="text-sm font-medium text-slate-200">{row.crop}</span>
									<span className="shrink-0 text-right text-xs text-slate-400">
										{row.demandKgPerMonth.toLocaleString()} kg/mo
										<span className="text-slate-600"> · </span>€{row.pricePerKg}/kg
									</span>
								</div>
								<div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
									{trend && (
										<span className={`text-[11px] font-medium ${trend.cls}`}>
											{trend.label}
										</span>
									)}
									{row.confidence !== undefined && (
										<ConfidenceBar value={row.confidence} />
									)}
								</div>
								{row.rationale && (
									<p className="mt-1 text-[11px] leading-relaxed text-slate-600">
										{row.rationale}
									</p>
								)}
							</li>
						);
					})}
				</ul>
			)}
		</div>
	);
}
