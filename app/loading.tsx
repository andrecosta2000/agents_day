export default function HomeLoading() {
	return (
		<div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
			<div className="flex shrink-0 items-center justify-between border-b border-emerald-950/50 bg-slate-950 px-4 py-3 md:px-6">
				<div className="h-5 w-32 animate-pulse rounded bg-slate-800" />
			</div>
			<div className="relative flex flex-1 flex-col lg:block">
				<div className="relative z-500 flex flex-col gap-4 p-4 lg:absolute lg:left-6 lg:top-6 lg:z-1100 lg:w-[min(100%-3rem,22rem)] lg:p-0">
					<div className="rounded-2xl border border-emerald-900/50 bg-slate-950/90 p-5 shadow-xl shadow-black/40">
						<div className="h-3 w-16 animate-pulse rounded bg-slate-800" />
						<div className="mt-2 h-6 w-40 animate-pulse rounded bg-slate-800" />
						<div className="mt-2 h-4 w-56 animate-pulse rounded bg-slate-800" />
						<div className="mt-5 space-y-3">
							<div className="h-10 w-full animate-pulse rounded-lg bg-slate-800/80" />
							<div className="h-32 w-full animate-pulse rounded-xl bg-slate-800/60" />
						</div>
					</div>
				</div>
				<div className="min-h-[420px] flex-1 p-4 pt-0 lg:absolute lg:inset-0 lg:min-h-0 lg:p-4">
					<div className="h-full min-h-[360px] animate-pulse rounded-2xl bg-slate-900" />
				</div>
			</div>
		</div>
	);
}
