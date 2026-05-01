"use client";

import type { Site } from "@/types/interfaces";
import Link from "next/link";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";

// Default map centers — extended to match Member 1's getSupportedCities()
const CITY_CENTERS: Record<string, [number, number]> = {
	lisbon:          [38.7223, -9.1393],
	porto:           [41.1579, -8.6291],
	"new york":      [40.7128, -74.006],
	chicago:         [41.8781, -87.6298],
	"los angeles":   [34.0522, -118.2437],
	"san francisco": [37.7749, -122.4194],
	boston:          [42.3601, -71.0589],
	seattle:         [47.6062, -122.3321],
	madrid:          [40.4168, -3.7038],
	barcelona:       [41.3851, 2.1734],
	berlin:          [52.52, 13.405],
	amsterdam:       [52.3676, 4.9041],
	paris:           [48.8566, 2.3522],
	london:          [51.5074, -0.1278],
	dubai:           [25.2048, 55.2708],
};

function scoreFill(score: number): string {
	if (score >= 85) return "#34d399";
	if (score >= 75) return "#fbbf24";
	return "#fb923c";
}

function scoreLabel(score: number): string {
	if (score >= 85) return "High";
	if (score >= 75) return "Medium";
	return "Low";
}

function centerForSites(cityKey: string, sites: Site[]): [number, number] {
	if (sites.length === 0) {
		return CITY_CENTERS[cityKey] ?? [20, 0];
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
	const key = cityKey.toLowerCase();
	const center = centerForSites(key, sites);
	const zoom = sites.length === 0 ? 11 : sites.length <= 1 ? 13 : 12;
	const mapKey = `${cityKey}:${sites.map((s) => s.id).join(",")}`;

	return (
		<div className={className}>
			<MapContainer
				key={mapKey}
				center={center}
				zoom={zoom}
				className="h-full min-h-[280px] w-full rounded-xl [&_.leaflet-control-attribution]:bg-slate-900/80 [&_.leaflet-control-attribution]:text-[10px]"
				scrollWheelZoom
				aria-label={`Map of vertical farming site candidates in ${cityKey}`}
			>
				<TileLayer
					attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
					url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
				/>
				{sites.length === 0 ? null : (
					sites.map((site) => (
						<CircleMarker
							key={site.id}
							center={[site.lat, site.lng]}
							radius={10 + site.score / 20}
							pathOptions={{
								color: "#064e3b",
								weight: 2,
								fillColor: scoreFill(site.score),
								fillOpacity: 0.88,
							}}
						>
							<Popup>
								<div className="min-w-[170px] text-slate-900">
									<p className="font-semibold leading-snug">{site.name}</p>
									<p className="mt-0.5 text-xs text-slate-500">
										{site.zone} · {site.areaM2.toLocaleString()} m²
									</p>
									<div className="mt-2 flex items-center gap-2">
										<span
											className="rounded-full px-2 py-0.5 text-[11px] font-medium"
											style={{
												backgroundColor: scoreFill(site.score) + "33",
												color: scoreFill(site.score),
											}}
										>
											{scoreLabel(site.score)} — {site.score}
										</span>
									</div>
									<Link
										href={`/sites/${site.id}`}
										className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-emerald-700 underline hover:text-emerald-600"
									>
										Open report →
									</Link>
								</div>
							</Popup>
						</CircleMarker>
					))
				)}
			</MapContainer>

			{sites.length === 0 && (
				<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
					<div className="rounded-xl bg-slate-950/70 px-5 py-3 text-center backdrop-blur-sm">
						<p className="text-sm font-medium text-slate-400">No sites indexed for {cityKey}</p>
						<p className="mt-1 text-xs text-slate-600">Sites will appear when the API is live</p>
					</div>
				</div>
			)}
		</div>
	);
}
