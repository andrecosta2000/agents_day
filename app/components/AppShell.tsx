import Link from "next/link";

type Props = {
	title?: string;
	subtitle?: string;
};

export function AppShell({ title = "UrbanFarm", subtitle = "Optimizer" }: Props) {
	return (
		<header className="flex shrink-0 items-center justify-between border-b border-emerald-950/50 bg-slate-950 px-4 py-3 md:px-6">
			<Link href="/" className="group flex items-baseline gap-2">
				<span className="text-lg font-semibold tracking-tight text-emerald-400 transition-colors group-hover:text-emerald-300">
					{title}
				</span>
				<span className="text-sm font-medium text-slate-500">{subtitle}</span>
			</Link>
			<p className="hidden text-xs text-slate-600 sm:block">Vertical farming site intelligence</p>
		</header>
	);
}
