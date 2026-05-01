export default function OperationsLoading() {
	return (
		<div className="min-h-screen bg-slate-950 text-slate-100">
			<div className="flex shrink-0 items-center border-b border-emerald-950/50 bg-slate-950 px-4 py-3 md:px-6">
				<div className="h-5 w-48 animate-pulse rounded bg-slate-800" />
			</div>
			<main className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-10">
				<div className="h-7 w-36 animate-pulse rounded bg-slate-800" />
				<div className="mt-6 h-20 animate-pulse rounded-2xl bg-slate-900/70" />
				<div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{[...Array(3)].map((_, i) => (
						<div key={i} className="h-48 animate-pulse rounded-2xl bg-slate-900/70" />
					))}
				</div>
			</main>
		</div>
	);
}
