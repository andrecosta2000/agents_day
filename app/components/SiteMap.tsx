"use client";

import type { Site } from "@/types/interfaces";
import Link from "next/link";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";

const CITY_CENTERS: Record<string, [number, number]> = {
	lisbon: [38.7223, -9.1393],
	porto: [41.1579, -8.6291],
};

function scoreFill(score: number): string {
	if (score >= 85) return "#34d399";
	if (score >= 75) return "#fbbf24";
	return "#fb923c";
}

function centerForSites(cityKey: string, sites: Site[]): [number, number] {
	if (sites.length === 0) {
		return CITY_CENTERS[cityKey] ?? CITY_CENTERS.lisbon;
	}
	const lat = sites.reduce((a, s) => a + s.lat, 0) / sites.length;
	const lng = sites.reduce((a, s) => a + s.lng, 0) / sites.length;
	return [lat, lng];
}

type Props = {
	sites: Site[];
	cityKey: string;
	className?: string;
};

export function SiteMap({ sites, cityKey, className }: Props) {
	const center = centerForSites(cityKey.toLowerCase(), sites);
	const zoom = sites.length <= 1 ? 12 : 11;

	const mapKey = `${cityKey}:${sites.map((s) => s.id).join(",")}`;

	return (
		<div className={className}>
			<MapContainer
				key={mapKey}
				center={center}
				zoom={zoom}
				className="h-full min-h-[280px] w-full rounded-xl [&_.leaflet-control-attribution]:text-[10px] [&_.leaflet-control-attribution]:bg-slate-900/80"
				scrollWheelZoom
			>
				<TileLayer
					attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
					url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
				/>
				{sites.map((site) => (
					<CircleMarker
						key={site.id}
						center={[site.lat, site.lng]}
						radius={10 + site.score / 25}
						pathOptions={{
							color: "#064e3b",
							weight: 2,
							fillColor: scoreFill(site.score),
							fillOpacity: 0.85,
						}}
					>
						<Popup>
							<div className="min-w-[160px] text-slate-900">
								<p className="font-semibold">{site.name}</p>
								<p className="text-xs text-slate-600">
									Score {site.score} · {site.zone}
								</p>
								<Link
									href={`/sites/${site.id}`}
									className="mt-2 inline-block text-sm font-medium text-emerald-700 underline"
								>
									Open report →
								</Link>
							</div>
						</Popup>
					</CircleMarker>
				))}
			</MapContainer>
		</div>
	);
}
