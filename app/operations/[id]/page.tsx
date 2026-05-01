import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/app/components/AppShell";
import { AgentStatus } from "@/app/components/AgentStatus";
import { CropSectionPanel } from "@/app/components/CropSectionPanel";
import { IncidentFeed } from "@/app/components/IncidentFeed";
import { getDeployedSites, getIncidents, getSectionReadings } from "@/lib/api";
import { groupByCrop } from "@/lib/section-types";

type Props = {
	params: Promise<{ id: string }>;
};

export default async function SiteOperationsPage({ params }: Props) {
	const { id } = await params;

	const [sites, sections, incidents] = await Promise.all([
		getDeployedSites(),
		getSectionReadings(id),
		getIncidents(id),
	]);

	const site = sites.find((s) => s.id === id);
	if (!site) notFound();

	const cropGroups = groupByCrop(sections);
	const totalSections = sections.length;
	const totalArea = sections.reduce((s, r) => s + r.allocatedM2, 0);
	const totalAnomalies = cropGroups.reduce((n, g) => n + g.anomalyCount, 0);

	return (
		<div className="min-h-screen bg-slate-950 font-sans text-slate-100">
			<AppShell />
			<main className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-10">

				{/* Breadcrumb */}
				<div className="flex flex-wrap items-center gap-3">
					<Link href="/operations" className="text-sm text-emerald-600/90 transition-colors hover:text-emerald-400">
						← Fleet
					</Link>
					<span className="text-slate-700">/</span>
					<span className="text-sm text-slate-400">{site.name}</span>
				</div>

				{/* Site header */}
				<div className="mt-6 flex flex-wrap items-end justify-between gap-4">
					<div>
						<h1 className="text-2xl font-semibold tracking-tight text-slate-50">{site.name}</h1>
						<p className="mt-1 text-sm text-slate-500">
							{site.city} · {site.zone} · {site.areaM2.toLocaleString()} m² footprint
						</p>
					</div>
					<div className="flex flex-wrap gap-4 text-right text-sm">
						<div>
							<p className="text-[11px] uppercase tracking-wide text-slate-600">Crops</p>
							<p className="font-semibold text-slate-200">{cropGroups.length}</p>
						</div>
						<div>
							<p className="text-[11px] uppercase tracking-wide text-slate-600">Sections</p>
							<p className="font-semibold text-slate-200">{totalSections}</p>
						</div>
						<div>
							<p className="text-[11px] uppercase tracking-wide text-slate-600">Growing area</p>
							<p className="font-semibold text-slate-200">{totalArea.toLocaleString()} m²</p>
						</div>
						{totalAnomalies > 0 && (
							<div>
								<p className="text-[11px] uppercase tracking-wide text-slate-600">Alerts</p>
								<p className="font-semibold text-amber-400">{totalAnomalies}</p>
							</div>
						)}
					</div>
				</div>

				{/* Agent status + crop overview side by side */}
				<div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
					<div>
						{cropGroups.length === 0 ? (
							<div className="flex items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/40 p-12 text-sm text-slate-500">
								No section data available for this site.
							</div>
						) : (
							<div className="space-y-5">
								<p className="text-xs font-medium uppercase tracking-wider text-slate-600">
									Sections by crop
								</p>
								{cropGroups.map((group) => (
									<CropSectionPanel key={group.cropId} group={group} />
								))}
							</div>
						)}
					</div>

					<div className="space-y-6">
						<AgentStatus siteId={id} sections={sections} incidents={incidents} />
					</div>
				</div>

				{/* Incident feed */}
				<div className="mt-8">
					<IncidentFeed siteId={id} initialIncidents={incidents} />
				</div>

				<div className="mt-6 text-right">
					<Link href={`/sites/${id}`} className="text-sm text-emerald-600/90 transition-colors hover:text-emerald-400">
						View feasibility report →
					</Link>
				</div>
			</main>
		</div>
	);
}
