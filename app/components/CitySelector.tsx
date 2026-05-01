"use client";

type Props = {
	cities: readonly string[];
	value: string;
	onChange: (city: string) => void;
	disabled?: boolean;
};

export function CitySelector({ cities, value, onChange, disabled }: Props) {
	return (
		<div className="space-y-2">
			<label htmlFor="city-select" className="text-xs font-medium uppercase tracking-wider text-emerald-600/90">
				City
			</label>
			<select
				id="city-select"
				disabled={disabled}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className="w-full rounded-lg border border-emerald-900/60 bg-slate-900/80 px-3 py-2.5 text-sm text-slate-100 outline-none ring-emerald-500/30 transition-shadow focus:ring-2 disabled:opacity-50"
			>
				{cities.map((c) => (
					<option key={c} value={c}>
						{c}
					</option>
				))}
			</select>
		</div>
	);
}
