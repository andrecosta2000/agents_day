import Link from "next/link";
import type { CropGroup } from "@/lib/section-types";
import { groupByCrop } from "@/lib/section-types";
import type { Incident, Site } from "@/types/interfaces";
import type { SectionReading } from "@/lib/section-types";

type HealthStatus = "ok" | "warning" | "critical" | "offline";

function deriveStatus(groups: CropGroup[], incidents: Incident[]): HealthStatus {
	if (groups.length === 0) return "offline";
	const hasEscalated = incidents.some((i) => i.status === "escalated");
	if (hasEscalated) return "critical";
	const hasCriticalIncident = incidents.some(
		(i) => i.severity === "critical" && i.status !== "resolved",
	);
	if (hasCriticalIncident) return "critical";
	const totalAnomalies = groups.reduce((n, g) => n + g.anomalyCount, 0);
	if (totalAnomalies > 0 || incidents.some((i) => i.status !== "resolved")) return "warning";
	return "ok";
}

const statusConfig: Record<HealthStatus, { label: string; dot: string; badge: string; border: string }> = {
	ok:       { label: "All clear", dot: "bg-emerald-400 shadow-[0_0_6px_1px_#34d399]", badge: "bg-emerald-950/50 text-emerald-300", border: "border-emerald-900/40" },
	warning:  { label: "Warning",   dot: "bg-amber-400",                                 badge: "bg-amber-950/50 text-amber-300",    border: "border-amber-900/40"   },
	critical: { label: "Critical",  dot: "bg-red-400 shadow-[0_0_6px_1px_#f87171]",      badge: "bg-red-950/50 text-red-300",        border: "border-red-900/50"     },
	offline:  { label: "Offline",   dot: "bg-slate-600",                                  badge: "bg-slate-800 text-slate-400",       border: "border-slate-800"      },
};

type Props = {
	site: Site;
	sections: SectionReading[];
	incidents: Incident[];
};

export function SiteHealthCard({ site, sections, incidents }: Props) {
	const groups = groupByCrop(sections);
	const status = deriveStatus(groups, incidents);
	const cfg = statusConfig[status];
	const openIncidents = incidents.filter((i) => i.status !== "resolved");
	const lastTs = sections.reduce((l, s) => (s.timestamp > l ? s.timestamp : l), "");

	return (
		<Link
			href={`/operations/${site.id}`}
			className={`group block rounded-2xl border bg-slate-900/50 p-5 transition-all hover:bg-slate-900/80 ${cfg.border}`}
		>
			{/* Header */}
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<p className="truncate font-semibold text-slate-100 group-hover:text-white">{site.name}</p>
					<p className="mt-0.5 text-xs text-slate-500">
						{site.city} · {site.zone} · {site.areaM2.toLocaleString()} m²
					</p>
				</div>
				<span className={`flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${cfg.badge}`}>
					<span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
					{cfg.label}
				</span>
			</div>

			{/* Crop × section summary */}
			{groups.length > 0 ? (
				<ul className="mt-4 space-y-2">
					{groups.map((g) => (
						<li key={g.cropId} className="flex items-center justify-between gap-2 text-xs">
							<div className="flex items-center gap-2 min-w-0">
								<span
									className={`h-1.5 w-1.5 shrink-0 rounded-full ${
										g.anomalyCount > 0 ? "bg-amber-400" : "bg-emerald-400"
									}`}
								/>
								<span className="truncate text-slate-300">{g.cropName}</span>
								<span className="shrink-0 text-slate-600">
									{g.sections.length} floor{g.sections.length > 1 ? "s" : ""}
								</span>
							</div>
							{g.anomalyCount > 0 ? (
								<span className="shrink-0 text-amber-500">
									{g.anomalyCount} alert{g.anomalyCount > 1 ? "s" : ""}
								</span>
							) : (
								<span className="shrink-0 text-slate-600">OK</span>
							)}
						</li>
					))}
				</ul>
			) : (
				<p className="mt-4 text-xs text-slate-600">No section data</p>
			)}

			{/* Footer */}
			<div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-800/80 pt-3 text-[11px] text-slate-500">
				<span>
					{openIncidents.length > 0
						? `${openIncidents.length} open incident${openIncidents.length > 1 ? "s" : ""}`
						: "No open incidents"}
				</span>
				{lastTs && (
					<span className="text-slate-600">
						{new Date(lastTs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
					</span>
				)}
			</div>
		</Link>
	);
}
