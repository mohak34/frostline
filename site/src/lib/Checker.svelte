<!--
	MassDOT_Checker on the town page. The result is computed in the browser from the inputs on
	every change; there is no form, no submit, and no request. Picking one of the town's wells
	fills both numbers with its latest results. Each gauge marks the MassDOT lines, and the line
	for the chosen diet lights up.
-->
<script lang="ts">
	import { mgl, titleCase } from '#lib/format.js';
	import {
		CHLORIDE_LINE,
		DIETS,
		evaluate,
		parseAmount,
		reasonText,
		resultText,
		SODIUM_LINE,
		type Diet
	} from '#lib/massdot.js';
	import type { Well } from '#lib/types.js';

	let { wells }: { wells: Well[] } = $props();

	type Amount = ReturnType<typeof parseAmount>;
	type Key = 'sodium' | 'chloride';
	interface Mark {
		at: number;
		label: string;
		active: boolean;
	}
	interface Gauge {
		key: Key;
		id: string;
		label: string;
		fill: string;
		/** Smallest top of the scale, in mg/L. */
		floor: number;
		marks: Mark[];
	}

	let text: Record<Key, string> = $state({ sodium: '', chloride: '' });
	let amounts: Record<Key, Amount> = $state({ sodium: null, chloride: null });
	let diet = $state<Diet>('none');
	let picked = $state('');

	// An invalid entry counts as empty (Req 12.11).
	const num = (a: Amount): number | null => (a === 'invalid' ? null : a);
	const sodium = $derived(num(amounts.sodium));
	const chloride = $derived(num(amounts.chloride));
	const result = $derived(evaluate(sodium, chloride, diet));
	const reason = $derived(reasonText(sodium, chloride, diet));

	const gauges: Gauge[] = $derived([
		{
			key: 'sodium',
			id: 'checker-sodium',
			label: 'Sodium',
			fill: 'bg-amber',
			floor: 60,
			marks: [
				{ at: SODIUM_LINE.under1000, label: 'diet under 1,000', active: diet === 'under1000' },
				{ at: SODIUM_LINE.under2000, label: 'diet under 2,000', active: diet === 'under2000' }
			]
		},
		{
			key: 'chloride',
			id: 'checker-chloride',
			label: 'Chloride',
			fill: 'bg-soft',
			floor: 300,
			marks: [{ at: CHLORIDE_LINE, label: 'any diet', active: true }]
		}
	]);

	/** Sodium must go over its line; chloride meets its line at the line. */
	const crossed = (key: Key, v: number | null, at: number): boolean =>
		v !== null && (key === 'chloride' ? v >= at : v > at);

	function fillFrom(id: string): void {
		const well = wells.find((w) => w.id === id);
		if (!well) return;
		for (const key of ['sodium', 'chloride'] as const) {
			const v = well[key].latest;
			text[key] = v === null ? '' : String(v);
			amounts[key] = v;
		}
	}
</script>

<div class="flex max-w-[640px] flex-col gap-6">
	<div class="flex flex-col gap-1">
		<label for="checker-well" class="text-sm text-dim">Well</label>
		<select
			id="checker-well"
			class="w-full border border-line bg-black px-3 py-2.5 focus:border-amber focus:outline-none"
			bind:value={picked}
			onchange={() => fillFrom(picked)}
		>
			<option value="">Pick a well, or type the numbers below</option>
			{#each wells as w (w.id)}
				<option value={w.id}>
					{titleCase(w.name)}, sodium {mgl(w.sodium.latest)}, chloride {mgl(w.chloride.latest)}
				</option>
			{/each}
		</select>
	</div>

	<fieldset class="flex flex-col gap-1">
		<legend class="mb-1 text-sm text-dim">Doctor-ordered sodium diet</legend>
		<div class="inline-flex w-fit flex-wrap border border-line">
			{#each DIETS as d (d.value)}
				<label
					class="cursor-pointer px-3.5 py-2 text-sm text-dim has-checked:bg-ember has-checked:text-white has-checked:shadow-[inset_0_-2px_var(--color-amber)] has-focus-visible:outline-2 has-focus-visible:outline-hot"
				>
					<input type="radio" name="checker-diet" class="sr-only" value={d.value} bind:group={diet} />
					{d.label}
				</label>
			{/each}
		</div>
	</fieldset>

	{#each gauges as g (g.key)}
		{@const v = num(amounts[g.key])}
		{@const top = Math.max(g.floor, (v ?? 0) * 1.15)}
		{@const invalid = amounts[g.key] === 'invalid'}
		<div class="flex flex-col gap-2">
			<div class="flex items-end justify-between gap-4">
				<label for={g.id} class="font-semibold">{g.label}</label>
				<span class="flex items-center gap-2 text-sm text-dim">
					<input
						id={g.id}
						type="number"
						step="any"
						min="0"
						inputmode="decimal"
						class="w-28 border border-line bg-black px-2.5 py-1.5 text-right text-base text-white tabular-nums focus:border-amber focus:outline-none aria-invalid:border-hot"
						aria-invalid={invalid ? 'true' : undefined}
						aria-describedby={invalid ? `${g.id}-error` : undefined}
						value={text[g.key]}
						oninput={(e) => {
							picked = '';
							text[g.key] = e.currentTarget.value;
							amounts[g.key] = parseAmount(e.currentTarget.value, e.currentTarget.validity.badInput);
						}}
					/>
					mg/L
				</span>
			</div>
			{#if invalid}
				<p id="{g.id}-error" class="text-right text-sm text-hot">Enter a number 0 or greater</p>
			{/if}
			<div class="relative mb-7 h-4 border border-line bg-[#111]" aria-hidden="true">
				<i
					class={['absolute inset-y-0 left-0 motion-safe:transition-[width] motion-safe:duration-500', g.fill]}
					style:width="{((v ?? 0) / top) * 100}%"
				></i>
				{#each g.marks as m (m.at)}
					{@const hit = m.active && crossed(g.key, v, m.at)}
					<i
						class={[
							'absolute -inset-y-1.5 border-l-[1.5px] border-dashed',
							hit ? 'border-hot' : m.active ? 'border-white' : 'border-dim'
						]}
						style:left="{(m.at / top) * 100}%"
					></i>
					<span
						class={[
							'absolute top-5 -translate-x-1/2 text-xs whitespace-nowrap',
							hit ? 'font-semibold text-hot' : m.active ? 'text-white' : 'text-dim'
						]}
						style:left="{(m.at / top) * 100}%">{m.at}, {m.label}</span
					>
				{/each}
			</div>
		</div>
	{/each}

	<div
		role="status"
		class={['border-l-3 pl-5', result.kind === 'met' ? 'border-hot' : result.kind === 'clear' ? 'border-amber' : 'border-line']}
	>
		<p
			class={[
				result.kind === 'met' && 'title text-2xl text-hot',
				result.kind === 'clear' && 'title text-2xl',
				result.kind === 'missing' && 'text-dim'
			]}
		>
			{resultText(result)}
		</p>
		{#if reason}
			<p class="mt-1.5 text-soft">{reason}</p>
		{/if}
	</div>
</div>
