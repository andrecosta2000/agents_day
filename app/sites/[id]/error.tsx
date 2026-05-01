"use client";

import Link from "next/link";
import { useEffect } from "react";

type Props = {
	error: Error & { digest?: string };
	reset: () => void;
};

export default function SiteDetailError({ error, reset }: Props) {
	useEffect(() => {
		console.error("[SiteDetailPage error]", error);
	}, [error]);

	return (
		<div className="min-h-screen bg-slate-950 text-slate-100">
			<div className="flex shrink-0 items-center border-b border-emerald-950/50 bg-slate-950 px-4 py-3 md:px-6">
				<Link href="/" className="text-lg font-semibold tracking-tight text-emerald-400 hover:text-emerald-300">
					UrbanFarm
				</Link>
			</div>
			<main className="mx-auto flex max-w-lg flex-col items-center px-4 py-32 text-center">
				<p className="text-5xl">⚠</p>
				<h1 className="mt-6 text-xl font-semibold text-slate-100">Something went wrong</h1>
				<p className="mt-3 text-sm leading-relaxed text-slate-500">
					Failed to load the site report. The service may be temporarily unavailable.
				</p>
				{error.message && (
					<p className="mt-3 rounded-lg bg-red-950/40 px-4 py-2 text-xs text-red-300">
						{error.message}
					</p>
				)}
				<div className="mt-8 flex gap-4">
					<button
						type="button"
						onClick={reset}
						className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-600"
					>
						Try again
					</button>
					<Link
						href="/"
						className="rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-slate-600 hover:text-slate-100"
					>
						Back to map
					</Link>
				</div>
			</main>
		</div>
	);
}
