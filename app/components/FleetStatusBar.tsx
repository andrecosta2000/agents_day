type Counts = {
	total: number;
	ok: number;
	warning: number;
	critical: number;
	offline: number;
};

type Props = {
	counts: Counts;
};

export function FleetStatusBar({ counts }: Props) {
	return (
		<div className="flex flex-wrap items-center gap-6 rounded-2xl border border-emerald-900/40 bg-slate-900/50 px-6 py-4">
			<div>
				<p className="text-[11px] uppercase tracking-wider text-slate-500">Deployed sites</p>
				<p className="mt-0.5 text-2xl font-bold tabular-nums text-slate-100">{counts.total}</p>
			</div>
			<div className="h-8 w-px bg-slate-800" />
			<div className="flex flex-wrap gap-4">
				<Stat label="All clear" value={counts.ok} color="text-emerald-400" />
				<Stat label="Warning" value={counts.warning} color="text-amber-400" />
				<Stat label="Critical" value={counts.critical} color="text-red-400" />
				{counts.offline > 0 && (
					<Stat label="Offline" value={counts.offline} color="text-slate-500" />
				)}
			</div>
			<div className="ml-auto hidden sm:block">
				<p className="text-[11px] text-slate-600">
					Agents poll every 30 s · auto-resolve up to 3 retries · escalate to PagerDuty
				</p>
			</div>
		</div>
	);
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
	return (
		<div>
			<p className="text-[11px] uppercase tracking-wider text-slate-500">{label}</p>
			<p className={`mt-0.5 text-xl font-bold tabular-nums ${color}`}>{value}</p>
		</div>
	);
}
