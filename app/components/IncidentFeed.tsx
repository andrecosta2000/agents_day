"use client";

import { useState } from "react";
import { resolveIncident } from "@/lib/api";
import type { Incident, SeverityLevel } from "@/types/interfaces";

type Props = {
	siteId: string;
	initialIncidents: Incident[];
};

const severityStyle: Record<SeverityLevel, string> = {
	low: "bg-slate-700 text-slate-200",
	medium: "bg-amber-900/60 text-amber-200",
	high: "bg-orange-900/60 text-orange-200",
	critical: "bg-red-950/70 text-red-200",
};

export function IncidentFeed({ siteId, initialIncidents }: Props) {
	const [items, setItems] = useState(initialIncidents);
	const [busyId, setBusyId] = useState<string | null>(null);

	async function onResolve(id: string) {
		setBusyId(id);
		try {
			await resolveIncident(id);
			setItems((prev) =>
				prev.map((inc) =>
					inc.id === id ? { ...inc, status: "resolved" as const, updatedAt: new Date().toISOString() } : inc,
				),
			);
		} finally {
			setBusyId(null);
		}
	}

	return (
		<section className="rounded-2xl border border-emerald-900/45 bg-slate-900/50 p-6">
			<h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-600/90">Live incidents</h3>
			<p className="mt-1 text-sm text-slate-500">
				Site <span className="font-mono text-slate-400">{siteId}</span>
			</p>

			{items.length === 0 ? (
				<p className="mt-6 text-sm text-slate-500">No incidents recorded for this site.</p>
			) : (
				<ul className="mt-6 space-y-4">
					{items.map((inc) => {
						const open = inc.status !== "resolved";
						return (
							<li
								key={inc.id}
								className="rounded-xl border border-slate-800 bg-slate-950/50 p-4"
							>
								<div className="flex flex-wrap items-start justify-between gap-2">
									<span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${severityStyle[inc.severity]}`}>
										{inc.severity}
									</span>
									<span className="text-[11px] uppercase tracking-wide text-slate-600">{inc.status.replace("_", " ")}</span>
								</div>
								<p className="mt-2 text-sm text-slate-200">{inc.description}</p>
								<p className="mt-2 text-[11px] text-slate-600">
									{new Date(inc.createdAt).toLocaleString()} · sensors: {inc.sensorSnapshot.tempC}°C,{" "}
									{inc.sensorSnapshot.humidityPct}% RH
								</p>
								{inc.agentActions.length > 0 ? (
									<ul className="mt-2 border-l border-slate-800 pl-3 text-[11px] text-slate-500">
										{inc.agentActions.map((a, i) => (
											<li key={`${a.timestamp}-${i}`}>
												{a.action} → <span className="text-slate-400">{a.result}</span>
											</li>
										))}
									</ul>
								) : null}
								{open ? (
									<button
										type="button"
										disabled={busyId === inc.id}
										onClick={() => void onResolve(inc.id)}
										className="mt-3 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-600 disabled:opacity-50"
									>
										{busyId === inc.id ? "Resolving…" : "Mark resolved"}
									</button>
								) : null}
							</li>
						);
					})}
				</ul>
			)}
		</section>
	);
}
