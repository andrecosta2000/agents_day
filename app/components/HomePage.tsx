"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { Demand, Site } from "@/types/interfaces";
import { AppShell } from "./AppShell";
import { CitySelector } from "./CitySelector";
import { DemandSnippet } from "./DemandSnippet";

const CITIES = ["Lisbon", "Porto"] as const;

const SiteMap = dynamic(() => import("./SiteMap").then((m) => m.SiteMap), {
	ssr: false,
	loading: () => (
		<div className="flex h-full min-h-[320px] items-center justify-center rounded-xl border border-emerald-900/40 bg-slate-900/40 text-sm text-slate-500">
			Loading map…
		</div>
	),
});

export type HomePageProps = {
	city: string;
	sites: Site[];
	demand: Demand[];
};

export function HomePage({ city, sites, demand }: HomePageProps) {
	const router = useRouter();
	const [pending, startTransition] = useTransition();

	function onCityChange(next: string) {
		startTransition(() => {
			router.push(`/?city=${encodeURIComponent(next)}`);
		});
	}

	return (
		<div className="flex min-h-screen flex-col bg-slate-950 font-sans text-slate-100">
			<AppShell />
			<div className="relative flex flex-1 flex-col lg:block lg:min-h-[calc(100vh-3.25rem)]">
				<div className="relative z-500 flex flex-col gap-4 p-4 lg:absolute lg:left-6 lg:top-6 lg:z-1100 lg:w-[min(100%-3rem,22rem)] lg:p-0">
					<div className="rounded-2xl border border-emerald-900/50 bg-slate-950/90 p-5 shadow-xl shadow-black/40 backdrop-blur-md">
						<p className="text-xs uppercase tracking-[0.2em] text-emerald-600/80">Explore</p>
						<h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-50">
							Site candidates
						</h1>
						<p className="mt-2 text-sm leading-relaxed text-slate-500">
							Pick a metro area to load scored vertical-farming locations on the map.
						</p>
						<div className="mt-5 space-y-5">
							<CitySelector
								cities={CITIES}
								value={city}
								onChange={onCityChange}
								disabled={pending}
							/>
							<DemandSnippet demand={demand} cityLabel={city} loading={pending} />
						</div>
						<p className="mt-4 text-[11px] text-slate-600">
							{pending ? "Updating…" : `${sites.length} site${sites.length === 1 ? "" : "s"} in view`}
						</p>
					</div>
				</div>

				<div className="min-h-[420px] flex-1 p-4 pt-0 lg:absolute lg:inset-0 lg:min-h-0 lg:p-4">
					<div className="h-full min-h-[360px] overflow-hidden rounded-2xl border border-emerald-950/60 shadow-inner lg:min-h-[calc(100%-2rem)]">
						<SiteMap
							sites={sites}
							cityKey={city}
							className="h-full w-full [&_.leaflet-container]:h-full [&_.leaflet-container]:min-h-[360px] [&_.leaflet-container]:bg-slate-900"
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
