import { getProduceDemand, getSites } from "@/lib/api";
import { HomePage } from "./components/HomePage";

const ALLOWED = ["Lisbon", "Porto"] as const;

function resolveCity(raw: string | undefined): (typeof ALLOWED)[number] {
	if (!raw) return "Lisbon";
	const lower = raw.trim().toLowerCase();
	const hit = ALLOWED.find((c) => c.toLowerCase() === lower);
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
