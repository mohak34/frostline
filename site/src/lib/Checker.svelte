<!--
	MassDOT_Checker, inside the town page's Action_Box. The result is computed in the browser
	from the three inputs on every change; there is no form, no submit, and no request.
-->
<script lang="ts">
	import { DIETS, evaluate, parseAmount, resultText, type Diet } from '#lib/massdot.js';

	type Amount = ReturnType<typeof parseAmount>;

	const FIELDS = [
		{ key: 'sodium', id: 'checker-sodium', label: 'Latest sodium (mg/L)' },
		{ key: 'chloride', id: 'checker-chloride', label: 'Latest chloride (mg/L)' }
	] as const;

	let amounts: Record<(typeof FIELDS)[number]['key'], Amount> = $state({
		sodium: null,
		chloride: null
	});
	let diet: Diet = $state('none');

	// An invalid entry counts as empty (Req 12.11).
	const num = (a: Amount): number | null => (a === 'invalid' ? null : a);
	const result = $derived(evaluate(num(amounts.sodium), num(amounts.chloride), diet));
</script>

<div class="flex flex-wrap gap-x-6 gap-y-3">
	{#each FIELDS as f (f.key)}
		{@const invalid = amounts[f.key] === 'invalid'}
		<div class="flex flex-col gap-1">
			<label for={f.id} class="text-sm text-dim">{f.label}</label>
			<input
				id={f.id}
				type="number"
				step="any"
				min="0"
				inputmode="decimal"
				class="w-40 border border-line bg-black px-3 py-2 tabular-nums focus:border-amber focus:outline-none aria-invalid:border-hot"
				aria-invalid={invalid ? 'true' : undefined}
				aria-describedby={invalid ? `${f.id}-error` : undefined}
				oninput={(e) =>
					(amounts[f.key] = parseAmount(e.currentTarget.value, e.currentTarget.validity.badInput))}
			/>
			{#if invalid}
				<p id="{f.id}-error" class="text-sm text-hot">Enter a number 0 or greater</p>
			{/if}
		</div>
	{/each}
	<div class="flex flex-col gap-1">
		<label for="checker-diet" class="text-sm text-dim">Doctor-ordered sodium diet</label>
		<select id="checker-diet" class="w-48 border border-line bg-black px-3 py-2 focus:border-amber focus:outline-none" bind:value={diet}>
			{#each DIETS as d (d.value)}
				<option value={d.value}>{d.label}</option>
			{/each}
		</select>
	</div>
</div>
<p role="status" class="mt-4 font-semibold">{resultText(result)}</p>
