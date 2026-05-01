"use client";

import type { CropPlan } from "@/types/interfaces";
import {
	Bar,
	BarChart,
	CartesianGrid,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";

type Props = {
	cropPlan: CropPlan;
};

export function CropPlanChart({ cropPlan }: Props) {
	const data = cropPlan.allocations.map((a) => ({
		name: a.crop.name.length > 14 ? `${a.crop.name.slice(0, 12)}…` : a.crop.name,
		fullName: a.crop.name,
		areaM2: a.allocatedM2,
		revenue: a.monthlyRevenueEur,
	}));

	return (
		<section className="rounded-2xl border border-emerald-900/45 bg-slate-900/50 p-6">
			<h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-600/90">Crop mix</h3>
			<p className="mt-1 text-sm text-slate-500">Allocated growing area (m²) by crop</p>
			<div className="mt-4 h-[280px] w-full">
				<ResponsiveContainer width="100%" height="100%">
					<BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
						<CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
						<XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={{ stroke: "#334155" }} />
						<YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={{ stroke: "#334155" }} />
						<Tooltip
							contentStyle={{
								backgroundColor: "#0f172a",
								border: "1px solid #14532d",
								borderRadius: "8px",
								fontSize: "12px",
							}}
							labelStyle={{ color: "#94a3b8" }}
							formatter={(value) => [
								`${typeof value === "number" ? value.toLocaleString() : String(value)} m²`,
								"Growing area",
							]}
							labelFormatter={(_, payload) => {
								const row = payload?.[0]?.payload as { fullName?: string } | undefined;
								return row?.fullName ?? "";
							}}
						/>
						<Bar dataKey="areaM2" fill="#34d399" radius={[6, 6, 0, 0]} name="areaM2" />
					</BarChart>
				</ResponsiveContainer>
			</div>
			<dl className="mt-4 grid gap-2 border-t border-slate-800 pt-4 text-sm sm:grid-cols-3">
				<div>
					<dt className="text-slate-600">Monthly revenue</dt>
					<dd className="font-medium tabular-nums text-emerald-400">
						€{cropPlan.totalMonthlyRevenueEur.toLocaleString()}
					</dd>
				</div>
				<div>
					<dt className="text-slate-600">Monthly costs</dt>
					<dd className="font-medium tabular-nums text-slate-300">
						€{cropPlan.totalMonthlyCostEur.toLocaleString()}
					</dd>
				</div>
				<div>
					<dt className="text-slate-600">Breakeven</dt>
					<dd className="font-medium tabular-nums text-slate-300">{cropPlan.breakevenMonths} mo</dd>
				</div>
			</dl>
		</section>
	);
}
