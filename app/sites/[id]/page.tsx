import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/app/components/AppShell";
import { CropPlanChart } from "@/app/components/CropPlanChart";
import { IncidentFeed } from "@/app/components/IncidentFeed";
import { RoiDashboard } from "@/app/components/RoiDashboard";
import { SiteDetailPanel } from "@/app/components/SiteDetailPanel";
import { getIncidents, getSiteReport } from "@/lib/api";

type Props = {
	params: Promise<{ id: string }>;
};

export default async function SiteDetailPage({ params }: Props) {
	const { id } = await params;
	const [report, incidents] = await Promise.all([getSiteReport(id), getIncidents(id)]);

	if (!report) {
		notFound();
	}

	return (
		<div className="min-h-screen bg-slate-950 font-sans text-slate-100">
			<AppShell />
			<main className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-10">
				<Link
					href="/"
					className="inline-flex items-center gap-2 text-sm text-emerald-600/90 transition-colors hover:text-emerald-400"
				>
					← Back to map
				</Link>

				<div className="mt-8 space-y-8">
					<SiteDetailPanel report={report} />
					<div className="grid gap-8 lg:grid-cols-2">
						<CropPlanChart cropPlan={report.cropPlan} />
						<RoiDashboard roi={report.roi} />
					</div>
					<IncidentFeed siteId={id} initialIncidents={incidents} />
				</div>
			</main>
		</div>
	);
}
