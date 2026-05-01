import type { SensorReading } from "@/types/interfaces";

// Thresholds from agents/README.md
const SENSORS = [
	{ key: "tempC",              label: "Temperature", unit: "°C",    min: 18,   max: 28,    decimals: 1 },
	{ key: "humidityPct",        label: "Humidity",    unit: "%",     min: 60,   max: 80,    decimals: 0 },
	{ key: "ph",                 label: "pH",          unit: "",      min: 5.5,  max: 6.5,   decimals: 2 },
	{ key: "waterFlowLPerMin",   label: "Water flow",  unit: "L/min", min: 2,    max: 10,    decimals: 1 },
	{ key: "lightLux",           label: "Light",       unit: "lux",   min: 5000, max: 20000, decimals: 0 },
] as const;

type SensorKey = (typeof SENSORS)[number]["key"];

function inRange(value: number, min: number, max: number): boolean {
	return value >= min && value <= max;
}

function positionPct(value: number, min: number, max: number): number {
	const padded = (max - min) * 0.15;
	const lo = min - padded;
	const hi = max + padded;
	return Math.min(100, Math.max(0, ((value - lo) / (hi - lo)) * 100));
}

function normalBandPct(min: number, max: number): { left: number; width: number } {
	const padded = (max - min) * 0.15;
	const lo = min - padded;
	const hi = max + padded;
	const total = hi - lo;
	return {
		left: ((min - lo) / total) * 100,
		width: ((max - min) / total) * 100,
	};
}

type Props = {
	reading: SensorReading;
};

export function SensorGauges({ reading }: Props) {
	return (
		<section className="rounded-2xl border border-emerald-900/45 bg-slate-900/50 p-6">
			<h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-600/90">Live sensors</h3>
			<p className="mt-1 text-[11px] text-slate-600">
				Last reading {new Date(reading.timestamp).toLocaleString()} · green band = normal range
			</p>
			<ul className="mt-5 space-y-5">
				{SENSORS.map(({ key, label, unit, min, max, decimals }) => {
					const value = reading[key as SensorKey] as number;
					const ok = inRange(value, min, max);
					const pos = positionPct(value, min, max);
					const band = normalBandPct(min, max);

					return (
						<li key={key}>
							<div className="mb-1.5 flex items-baseline justify-between gap-2">
								<span className="text-sm font-medium text-slate-300">{label}</span>
								<span
									className={`tabular-nums text-sm font-semibold ${ok ? "text-emerald-400" : "text-red-400"}`}
								>
									{value.toFixed(decimals)}{unit}
									{!ok && (
										<span className="ml-1.5 rounded-full bg-red-950/60 px-1.5 py-0.5 text-[10px] font-medium text-red-300">
											out of range
										</span>
									)}
								</span>
							</div>
							<div className="relative h-3 overflow-hidden rounded-full bg-slate-800">
								{/* normal range band */}
								<div
									className="absolute inset-y-0 rounded-full bg-emerald-900/60"
									style={{ left: `${band.left}%`, width: `${band.width}%` }}
								/>
								{/* current value marker */}
								<div
									className={`absolute top-1/2 h-5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-md ${
										ok ? "bg-emerald-400" : "bg-red-400"
									}`}
									style={{ left: `${pos}%` }}
								/>
							</div>
							<div className="mt-0.5 flex justify-between text-[10px] text-slate-600">
								<span>min {min}{unit}</span>
								<span>max {max}{unit}</span>
							</div>
						</li>
					);
				})}
			</ul>
		</section>
	);
}
