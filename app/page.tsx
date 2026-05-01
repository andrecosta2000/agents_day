import { getProduceDemand, getSites } from "@/lib/api";
import { HomePage, SUPPORTED_CITIES, type SupportedCity } from "./components/HomePage";

function resolveCity(raw: string | undefined): SupportedCity {
	if (!raw) return "Lisbon";
	const lower = raw.trim().toLowerCase();
	const hit = SUPPORTED_CITIES.find((c) => c.toLowerCase() === lower);
	return hit ?? "Lisbon";
}

type Props = {
	searchParams: Promise<{ city?: string }>;
};

export default async function Page({ searchParams }: Props) {
	const sp = await searchParams;
	const city = resolveCity(sp.city);
	const [sites, demand] = await Promise.all([getSites(city), getProduceDemand(city)]);
	return <HomePage city={city} sites={sites} demand={demand} />;
}
