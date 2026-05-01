"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
	{ href: "/", label: "Explore", match: (p: string) => p === "/" },
	{ href: "/operations", label: "Operations", match: (p: string) => p.startsWith("/operations") },
] as const;

export function AppShell() {
	const pathname = usePathname();

	return (
		<header className="flex shrink-0 items-center justify-between border-b border-emerald-950/50 bg-slate-950 px-4 py-3 md:px-6">
			<div className="flex items-center gap-6">
				<Link href="/" className="group flex items-baseline gap-2">
					<span className="text-lg font-semibold tracking-tight text-emerald-400 transition-colors group-hover:text-emerald-300">
						UrbanFarm
					</span>
					<span className="text-sm font-medium text-slate-500">Optimizer</span>
				</Link>

				<nav className="flex items-center gap-1" aria-label="Main navigation">
					{NAV.map(({ href, label, match }) => {
						const active = match(pathname);
						return (
							<Link
								key={href}
								href={href}
								className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
									active
										? "bg-emerald-950/60 text-emerald-300"
										: "text-slate-500 hover:bg-slate-900 hover:text-slate-300"
								}`}
								aria-current={active ? "page" : undefined}
							>
								{label}
							</Link>
						);
					})}
				</nav>
			</div>

			<p className="hidden text-xs text-slate-600 sm:block">Vertical farming site intelligence</p>
		</header>
	);
}
