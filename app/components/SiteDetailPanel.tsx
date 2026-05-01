import type { SiteReport } from "@/types/interfaces";

const MONTHS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"] as const;

type Props = {
	report: SiteReport;
};

export function SiteDetailPanel({ report }: Props) {
	const { site, zoning, climate, hvacCosts, solar, waterSources } = report;

	return (
		<div className="space-y-6">
			<section className="rounded-2xl border border-emerald-900/45 bg-slate-900/50 p-6">
				<h2 className="text-lg font-semibold text-slate-50">{site.name}</h2>
				<p className="mt-1 text-sm text-slate-500">
					{site.city} · {site.zone} zoning · score{" "}
					<span className="font-medium text-emerald-400">{site.score}</span>
				</p>
				<dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
					<div>
						<dt className="text-slate-600">Footprint</dt>
						<dd className="font-medium text-slate-200">{site.areaM2.toLocaleString()} m²</dd>
					</div>
					<div>
						<dt className="text-slate-600">Max height</dt>
						<dd className="font-medium text-slate-200">{site.maxHeightM} m</dd>
					</div>
					<div>
						<dt className="text-slate-600">Coordinates</dt>
						<dd className="font-medium tabular-nums text-slate-200">
							{site.lat.toFixed(4)}, {site.lng.toFixed(4)}
						</dd>
					</div>
				</dl>
			</section>

			<div className="grid gap-6 lg:grid-cols-2">
				<section className="rounded-2xl border border-emerald-900/45 bg-slate-900/50 p-6">
					<h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-600/90">Zoning</h3>
					<p className="mt-2 text-sm text-slate-300">
						Type <span className="text-emerald-400">{zoning.type}</span> · cap{" "}
						{zoning.maxHeightM} m · ~€{zoning.estimatedPricePerM2}/m²
					</p>
					<ul className="mt-3 list-inside list-disc text-sm text-slate-500">
						{zoning.restrictions.map((r) => (
							<li key={r}>{r}</li>
						))}
					</ul>
				</section>

				<section className="rounded-2xl border border-emerald-900/45 bg-slate-900/50 p-6">
					<h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-600/90">Climate</h3>
					<p className="mt-2 text-sm text-slate-300">
						Annual avg {climate.annualAvgTempC}°C · {climate.annualAvgHumidityPct}% RH
					</p>
					<div className="mt-4 flex h-16 items-end gap-0.5">
						{climate.monthlyAvgTempC.map((t, i) => {
							const h = Math.min(100, Math.max(8, ((t + 5) / 35) * 100));
							return (
								<div key={MONTHS[i]} className="flex flex-1 flex-col items-center gap-1">
									<div
										className="w-full max-w-[10px] rounded-t bg-linear-to-t from-emerald-900 to-emerald-500"
										style={{ height: `${h}%` }}
										title={`${t}°C`}
									/>
									<span className="text-[9px] text-slate-600">{MONTHS[i]}</span>
								</div>
							);
						})}
					</div>
					<p className="mt-2 text-[11px] text-slate-600">Monthly temperature profile (°C)</p>
				</section>
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				<section className="rounded-2xl border border-emerald-900/45 bg-slate-900/50 p-6">
					<h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-600/90">HVAC (by crop)</h3>
					<div className="mt-3 overflow-x-auto">
						<table className="w-full text-left text-sm">
							<thead>
								<tr className="border-b border-slate-800 text-slate-500">
									<th className="pb-2 pr-2 font-medium">Crop ID</th>
									<th className="pb-2 pr-2 font-medium">kWh / mo</th>
									<th className="pb-2 font-medium">€ / mo</th>
								</tr>
							</thead>
							<tbody>
								{hvacCosts.map((row) => (
									<tr key={row.cropId} className="border-b border-slate-800/60 text-slate-300">
										<td className="py-2 pr-2 font-mono text-xs">{row.cropId}</td>
										<td className="py-2 pr-2 tabular-nums">{row.monthlyKwh.toLocaleString()}</td>
										<td className="py-2 tabular-nums">{row.monthlyCostEur.toLocaleString()}</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				</section>

				<section className="rounded-2xl border border-emerald-900/45 bg-slate-900/50 p-6">
					<h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-600/90">Solar</h3>
					<dl className="mt-3 space-y-2 text-sm">
						<div className="flex justify-between gap-4">
							<dt className="text-slate-500">Annual generation</dt>
							<dd className="tabular-nums text-slate-200">{solar.annualKwhGeneration.toLocaleString()} kWh</dd>
						</div>
						<div className="flex justify-between gap-4">
							<dt className="text-slate-500">Install cost</dt>
							<dd className="tabular-nums text-slate-200">€{solar.installationCostEur.toLocaleString()}</dd>
						</div>
						<div className="flex justify-between gap-4">
							<dt className="text-slate-500">Grid cost / yr</dt>
							<dd className="tabular-nums text-slate-200">€{solar.annualGridCostEur.toLocaleString()}</dd>
						</div>
						<div className="flex justify-between gap-4">
							<dt className="text-slate-500">ROI</dt>
							<dd className="tabular-nums text-emerald-400">{solar.roiYears} yrs</dd>
						</div>
						<div className="flex justify-between gap-4">
							<dt className="text-slate-500">Recommendation</dt>
							<dd className="font-medium capitalize text-slate-200">{solar.recommendation}</dd>
						</div>
					</dl>
				</section>
			</div>

			<section className="rounded-2xl border border-emerald-900/45 bg-slate-900/50 p-6">
				<h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-600/90">Water sources</h3>
				<ul className="mt-3 divide-y divide-slate-800 text-sm">
					{waterSources.map((w) => (
						<li key={`${w.name}-${w.distanceM}`} className="flex flex-wrap justify-between gap-2 py-2">
							<span className="text-slate-300">
								<span className="capitalize text-emerald-600/90">{w.type}</span> · {w.name}
							</span>
							<span className="tabular-nums text-slate-500">{Math.round(w.distanceM)} m away</span>
						</li>
					))}
				</ul>
			</section>
		</div>
	);
}
