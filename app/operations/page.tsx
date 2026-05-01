import { AppShell } from "@/app/components/AppShell";
import { FleetStatusBar } from "@/app/components/FleetStatusBar";
import { SiteHealthCard } from "@/app/components/SiteHealthCard";
import { getDeployedSites, getIncidents, getSectionReadings } from "@/lib/api";
import { groupByCrop } from "@/lib/section-types";
import type { Incident, Site } from "@/types/interfaces";
import type { SectionReading } from "@/lib/section-types";

type SiteRow = {
	site: Site;
	sections: SectionReading[];
	incidents: Incident[];
};

type HealthKey = "ok" | "warning" | "critical" | "offline";
const STATUS_ORDER: Record<HealthKey, number> = { critical: 0, warning: 1, offline: 2, ok: 3 };

function deriveStatusKey(sections: SectionReading[], incidents: Incident[]): HealthKey {
	if (sections.length === 0) return "offline";
	if (incidents.some((i) => i.status === "escalated" || (i.severity === "critical" && i.status !== "resolved")))
		return "critical";
	const groups = groupByCrop(sections);
	const hasAnomalies = groups.some((g) => g.anomalyCount > 0);
	if (hasAnomalies || incidents.some((i) => i.status !== "resolved")) return "warning";
	return "ok";
}

export default async function OperationsPage() {
	const sites = await getDeployedSites();

	const rows: SiteRow[] = await Promise.all(
		sites.map(async (site) => {
			const [sections, incidents] = await Promise.all([
				getSectionReadings(site.id),
				getIncidents(site.id),
			]);
			return { site, sections, incidents };
		}),
	);

	rows.sort(
		(a, b) =>
			STATUS_ORDER[deriveStatusKey(a.sections, a.incidents)] -
			STATUS_ORDER[deriveStatusKey(b.sections, b.incidents)],
	);

	const counts = rows.reduce(
		(acc, { sections, incidents }) => {
			acc[deriveStatusKey(sections, incidents)]++;
			return acc;
		},
		{ ok: 0, warning: 0, critical: 0, offline: 0 },
	);

	return (
		<div className="min-h-screen bg-slate-950 font-sans text-slate-100">
			<AppShell />
			<main className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-10">
				<div className="mb-2">
					<h1 className="text-2xl font-semibold tracking-tight text-slate-50">Operations</h1>
					<p className="mt-1 text-sm text-slate-500">
						Real-time health of all deployed vertical farming sites, by crop and section.
					</p>
				</div>

				<div className="mt-6">
					<FleetStatusBar counts={{ total: rows.length, ...counts }} />
				</div>

				{rows.length === 0 ? (
					<div className="mt-16 text-center">
						<p className="text-slate-500">No deployed sites found.</p>
						<p className="mt-1 text-xs text-slate-600">Sites will appear here once they go live.</p>
					</div>
				) : (
					<div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{rows.map(({ site, sections, incidents }) => (
							<SiteHealthCard
								key={site.id}
								site={site}
								sections={sections}
								incidents={incidents}
							/>
						))}
					</div>
				)}
			</main>
		</div>
	);
}
