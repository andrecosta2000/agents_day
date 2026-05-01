import type { Incident } from "@/types/interfaces";
import type { SectionReading } from "@/lib/section-types";

type Props = {
	siteId: string;
	sections: SectionReading[];
	incidents: Incident[];
};

function timeSince(iso: string): string {
	const diffMs = Date.now() - new Date(iso).getTime();
	const secs = Math.floor(diffMs / 1000);
	if (secs < 60) return `${secs}s ago`;
	const mins = Math.floor(secs / 60);
	if (mins < 60) return `${mins}m ago`;
	return `${Math.floor(mins / 60)}h ago`;
}

export function AgentStatus({ siteId, sections, incidents }: Props) {
	const open = incidents.filter((i) => i.status !== "resolved");
	const resolving = incidents.filter((i) => i.status === "agent_resolving");
	const escalated = incidents.filter((i) => i.status === "escalated");

	const lastTs = sections.reduce((l, s) => (s.timestamp > l ? s.timestamp : l), "");
	const agentOk = lastTs !== "";

	return (
		<section className="rounded-2xl border border-emerald-900/45 bg-slate-900/50 p-6">
			<h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-600/90">Agent status</h3>
			<p className="mt-1 text-[11px] text-slate-600">Site <span className="font-mono">{siteId}</span></p>

			<div className="mt-5 grid gap-4 sm:grid-cols-2">
				<div className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3">
					<p className="text-[11px] uppercase tracking-wide text-slate-500">Loop</p>
					<div className="mt-1.5 flex items-center gap-2">
						<span className={`h-2 w-2 rounded-full ${agentOk ? "bg-emerald-400 shadow-[0_0_6px_1px_#34d399]" : "bg-slate-600"}`} />
						<span className="text-sm font-medium text-slate-200">{agentOk ? "Running" : "No data"}</span>
					</div>
				</div>
				<div className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3">
					<p className="text-[11px] uppercase tracking-wide text-slate-500">Last check</p>
					<p className="mt-1.5 text-sm font-medium text-slate-200">{lastTs ? timeSince(lastTs) : "—"}</p>
				</div>
				<div className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3">
					<p className="text-[11px] uppercase tracking-wide text-slate-500">Open incidents</p>
					<p className={`mt-1.5 text-lg font-semibold tabular-nums ${open.length > 0 ? "text-red-400" : "text-emerald-400"}`}>
						{open.length}
					</p>
				</div>
				<div className="rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3">
					<p className="text-[11px] uppercase tracking-wide text-slate-500">Auto-resolving</p>
					<p className="mt-1.5 text-lg font-semibold tabular-nums text-amber-400">{resolving.length}</p>
				</div>
			</div>

			{escalated.length > 0 && (
				<div className="mt-4 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3">
					<p className="text-xs font-medium text-red-300">
						⚠ {escalated.length} incident{escalated.length > 1 ? "s" : ""} escalated to PagerDuty
					</p>
				</div>
			)}

			<p className="mt-4 text-[11px] leading-relaxed text-slate-600">
				SiteAgent polls every 30 s across all sections — checks 5 sensors per section, attempts up to 3 automated fixes, then escalates to Orchestrator.
			</p>
		</section>
	);
}
