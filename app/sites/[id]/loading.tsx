export default function SiteDetailLoading() {
	return (
		<div className="min-h-screen bg-slate-950 text-slate-100">
			<div className="flex shrink-0 items-center justify-between border-b border-emerald-950/50 bg-slate-950 px-4 py-3 md:px-6">
				<div className="h-5 w-32 animate-pulse rounded bg-slate-800" />
			</div>
			<main className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-10">
				<div className="h-4 w-28 animate-pulse rounded bg-slate-800" />
				<div className="mt-8 space-y-8">
					<div className="h-40 animate-pulse rounded-2xl bg-slate-900/70" />
					<div className="grid gap-8 lg:grid-cols-2">
						<div className="h-64 animate-pulse rounded-2xl bg-slate-900/70" />
						<div className="h-64 animate-pulse rounded-2xl bg-slate-900/70" />
					</div>
					<div className="grid gap-8 lg:grid-cols-2">
						<div className="h-80 animate-pulse rounded-2xl bg-slate-900/70" />
						<div className="h-80 animate-pulse rounded-2xl bg-slate-900/70" />
					</div>
					<div className="h-48 animate-pulse rounded-2xl bg-slate-900/70" />
				</div>
			</main>
		</div>
	);
}
