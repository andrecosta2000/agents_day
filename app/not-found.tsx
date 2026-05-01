import Link from "next/link";

export default function NotFound() {
	return (
		<div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-center text-slate-100">
			<p className="text-6xl font-bold tabular-nums text-emerald-800">404</p>
			<h1 className="mt-4 text-xl font-semibold">Site not found</h1>
			<p className="mt-3 max-w-sm text-sm leading-relaxed text-slate-500">
				The site ID you requested doesn&apos;t exist in our database, or it hasn&apos;t been scored yet.
			</p>
			<Link
				href="/"
				className="mt-8 rounded-lg bg-emerald-700 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-600"
			>
				Back to map
			</Link>
		</div>
	);
}
