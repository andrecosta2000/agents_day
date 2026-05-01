import { Fragment } from "react";
import type { CropGroup } from "@/lib/section-types";
import { SENSOR_THRESHOLDS, isInRange } from "@/lib/section-types";
import type { SensorKey } from "@/lib/section-types";

const SENSOR_KEYS = Object.keys(SENSOR_THRESHOLDS) as SensorKey[];

function formatValue(key: SensorKey, value: number): string {
	if (key === "lightLux") return `${(value / 1000).toFixed(1)}k`;
	if (key === "ph") return value.toFixed(2);
	if (key === "waterFlowLPerMin") return value.toFixed(1);
	if (key === "humidityPct") return Math.round(value).toString();
	return value.toFixed(1);
}

type Props = {
	group: CropGroup;
};

export function CropSectionPanel({ group }: Props) {
	const totalArea = group.sections.reduce((s, r) => s + r.allocatedM2, 0);
	const hasAlert = group.anomalyCount > 0;
	const latestTs = group.sections.reduce(
		(latest, s) => (s.timestamp > latest ? s.timestamp : latest),
		"",
	);

	return (
		<section
			className={`rounded-2xl border bg-slate-900/50 ${
				hasAlert ? "border-amber-900/50" : "border-emerald-900/40"
			}`}
		>
			{/* Crop header */}
			<div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 px-5 py-4">
				<div>
					<div className="flex items-center gap-2">
						<span
							className={`h-2 w-2 rounded-full ${
								hasAlert ? "bg-amber-400" : "bg-emerald-400 shadow-[0_0_6px_1px_#34d399]"
							}`}
						/>
						<h3 className="font-semibold text-slate-100">{group.cropName}</h3>
					</div>
					<p className="mt-0.5 text-xs text-slate-500">
						{group.sections.length} section{group.sections.length > 1 ? "s" : ""} ·{" "}
						{totalArea.toLocaleString()} m² total ·{" "}
						{latestTs ? `last read ${new Date(latestTs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "no data"}
					</p>
				</div>
				{hasAlert ? (
					<span className="rounded-full bg-amber-950/60 px-2.5 py-1 text-[11px] font-medium text-amber-300">
						{group.anomalyCount} sensor{group.anomalyCount > 1 ? "s" : ""} out of range
					</span>
				) : (
					<span className="rounded-full bg-emerald-950/40 px-2.5 py-1 text-[11px] font-medium text-emerald-400">
						All clear
					</span>
				)}
			</div>

			{/* Sensor column headers */}
			<div className="grid grid-cols-[6rem_1fr] gap-0 overflow-x-auto">
				<div className="border-b border-slate-800/50 bg-slate-950/30 px-4 py-2" />
				<div className="grid grid-cols-5 border-b border-slate-800/50 bg-slate-950/30">
					{SENSOR_KEYS.map((k) => (
						<div key={k} className="px-2 py-2 text-center">
							<p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
								{SENSOR_THRESHOLDS[k].label}
							</p>
							<p className="text-[9px] text-slate-700">
								{SENSOR_THRESHOLDS[k].min}–{SENSOR_THRESHOLDS[k].max}{SENSOR_THRESHOLDS[k].unit}
							</p>
						</div>
					))}
				</div>

				{/* Section rows */}
				{group.sections.map((section) => {
					const sectionHasAlert = SENSOR_KEYS.some((k) => !isInRange(k, section[k] as number));
					return (
						<Fragment key={section.sectionIndex}>
							{/* Section label */}
							<div
								className={`flex flex-col justify-center border-b border-slate-800/40 px-4 py-3 ${
									sectionHasAlert ? "bg-amber-950/10" : ""
								}`}
							>
								<p className="text-xs font-medium text-slate-400">
									Floor {section.sectionIndex}
								</p>
								<p className="text-[10px] text-slate-600">
									{section.allocatedM2.toLocaleString()} m²
								</p>
							</div>

							{/* Sensor cells */}
							<div
								className={`grid grid-cols-5 border-b border-slate-800/40 ${
									sectionHasAlert ? "bg-amber-950/10" : ""
								}`}
							>
								{SENSOR_KEYS.map((k) => {
									const value = section[k] as number;
									const ok = isInRange(k, value);
									return (
										<div
											key={k}
											className={`flex flex-col items-center justify-center px-1 py-3 ${
												ok ? "" : "bg-red-950/25"
											}`}
											title={`${SENSOR_THRESHOLDS[k].label}: ${value}${SENSOR_THRESHOLDS[k].unit} (range ${SENSOR_THRESHOLDS[k].min}–${SENSOR_THRESHOLDS[k].max})`}
										>
											<p
												className={`text-sm font-semibold tabular-nums ${
													ok ? "text-slate-200" : "text-red-400"
												}`}
											>
												{formatValue(k, value)}
											</p>
											<p className="text-[9px] text-slate-600">{SENSOR_THRESHOLDS[k].unit || "—"}</p>
											{!ok && (
												<span className="mt-0.5 text-[9px] font-medium text-red-500">
													{value < SENSOR_THRESHOLDS[k].min ? "low" : "high"}
												</span>
											)}
										</div>
									);
								})}
							</div>
						</Fragment>
					);
				})}
			</div>
		</section>
	);
}
