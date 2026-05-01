import type { Demand } from "@/types/interfaces";

type Props = {
	demand: Demand[];
	cityLabel: string;
	loading?: boolean;
};

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
				<ul className="mt-3 space-y-2">
					{demand.map((row) => (
						<li
							key={row.crop}
							className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2 last:border-0 last:pb-0"
						>
							<span className="text-sm font-medium text-slate-200">{row.crop}</span>
							<span className="text-right text-xs text-slate-400">
								{row.demandKgPerMonth.toLocaleString()} kg/mo
								<span className="text-slate-600"> · </span>€{row.pricePerKg}/kg
							</span>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
