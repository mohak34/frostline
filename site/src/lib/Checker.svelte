<!--
	MassDOT_Checker, inside the town page's Action_Box. The result is computed in the browser
	from the three inputs on every change; there is no form, no submit, and no request. Picking
	one of the town's wells fills both numbers with its latest results.
-->
<script lang="ts">
	import { mgl, titleCase } from '#lib/format.js';
	import { DIETS, evaluate, parseAmount, resultText, type Diet } from '#lib/massdot.js';
	import type { Well } from '#lib/types.js';

	let { wells }: { wells: Well[] } = $props();

	type Amount = ReturnType<typeof parseAmount>;
	type Key = (typeof FIELDS)[number]['key'];

	const FIELDS = [
		{ key: 'sodium', id: 'checker-sodium', label: 'Latest sodium (mg/L)' },
		{ key: 'chloride', id: 'checker-chloride', label: 'Latest chloride (mg/L)' }
	] as const;

	let text: Record<Key, string> = $state({ sodium: '', chloride: '' });
	let amounts: Record<Key, Amount> = $state({ sodium: null, chloride: null });
	let diet: Diet = $state('none');
	let picked = $state('');

	// An invalid entry counts as empty (Req 12.11).
	const num = (a: Amount): number | null => (a === 'invalid' ? null : a);
	const result = $derived(evaluate(num(amounts.sodium), num(amounts.chloride), diet));

	function fillFrom(id: string): void {
		const well = wells.find((w) => w.id === id);
		if (!well) return;
		for (const { key } of FIELDS) {
			const v = well[key].latest;
			text[key] = v === null ? '' : String(v);
			amounts[key] = v;
		}
	}
</script>

<div class="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
	<div class="flex flex-col gap-4">
		<div class="flex flex-col gap-1">
			<label for="checker-well" class="text-sm text-dim">Well</label>
			<select
				id="checker-well"
				class="w-full max-w-[520px] border border-line bg-black px-3 py-2.5 focus:border-amber focus:outline-none"
				bind:value={picked}
				onchange={() => fillFrom(picked)}
			>
				<option value="">Pick a well, or type the numbers yourself</option>
				{#each wells as w (w.id)}
					<option value={w.id}>
						{titleCase(w.name)}, sodium {mgl(w.sodium.latest)}, chloride {mgl(w.chloride.latest)}
					</option>
				{/each}
			</select>
		</div>
		<div class="flex flex-wrap gap-x-5 gap-y-3">
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
						class="w-40 border border-line bg-black px-3 py-2 text-lg tabular-nums focus:border-amber focus:outline-none aria-invalid:border-hot"
						aria-invalid={invalid ? 'true' : undefined}
						aria-describedby={invalid ? `${f.id}-error` : undefined}
						value={text[f.key]}
						oninput={(e) => {
							picked = '';
							text[f.key] = e.currentTarget.value;
							amounts[f.key] = parseAmount(e.currentTarget.value, e.currentTarget.validity.badInput);
						}}
					/>
					{#if invalid}
						<p id="{f.id}-error" class="text-sm text-hot">Enter a number 0 or greater</p>
					{/if}
				</div>
			{/each}
			<div class="flex flex-col gap-1">
				<label for="checker-diet" class="text-sm text-dim">Doctor-ordered sodium diet</label>
				<select
					id="checker-diet"
					class="w-48 border border-line bg-black px-3 py-2.5 focus:border-amber focus:outline-none"
					bind:value={diet}
				>
					{#each DIETS as d (d.value)}
						<option value={d.value}>{d.label}</option>
					{/each}
				</select>
			</div>
		</div>
	</div>
	<p
		role="status"
		class={[
			'self-start border-l-3 pl-5',
			result.kind === 'met' && 'title border-hot text-2xl text-hot',
			result.kind === 'clear' && 'title border-amber text-2xl',
			result.kind === 'missing' && 'border-line py-1 text-dim'
		]}
	>
		{resultText(result)}
	</p>
</div>
