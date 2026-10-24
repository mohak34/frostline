<script lang="ts">
	import Checker from '#lib/Checker.svelte';
	import WellRow from '#lib/WellRow.svelte';
	import { STROKE } from '#lib/chart.js';
	import { count, pct, titleCase } from '#lib/format.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const town = $derived(data.town);
	const name = $derived(titleCase(town.name));

	const HEADERS = ['Well', 'System', 'Class', 'Latest sodium (mg/L)', 'Trend', 'Watch', 'History'];
	const CLASSES = [
		['COM', 'community'],
		['NC', 'transient non-community'],
		['NTNC', 'non-transient non-community']
	] as const;
</script>

<svelte:head>
	<title>{name} | Winter Water Watch</title>
</svelte:head>

<h1 class="text-xl font-bold">{name}</h1>

<dl class="grid grid-cols-[auto_1fr] gap-x-4 py-3 tabular-nums">
	<dt class="text-dim">Wells</dt>
	<dd>{count(town.wells)}</dd>
	<dt class="text-dim">Rising</dt>
	<dd>{pct(town.pct_rising)} <span class="text-dim">of wells with a sodium trend</span></dd>
	<dt class="text-dim">Over 20 mg/L</dt>
	<dd>{pct(town.pct_over_20)} <span class="text-dim">of wells with a latest sodium result</span></dd>
</dl>

<section class="py-3">
	<h2 class="font-bold">Wells</h2>
	<div class="overflow-x-auto">
		<table class="w-full text-sm tabular-nums">
			<thead>
				<tr class="border-b border-[#404040]">
					{#each HEADERS as h (h)}
						<th scope="col" class="py-1 pr-3 text-left font-normal text-dim">{h}</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each data.wells as well, i (well.id)}
					<WellRow {well} index={i} />
				{/each}
			</tbody>
		</table>
	</div>
	<dl class="mt-3 grid grid-cols-[auto_1fr] gap-x-4 text-sm">
		{#each CLASSES as [code, meaning] (code)}
			<dt>{code}</dt>
			<dd class="text-dim">{meaning}</dd>
		{/each}
		<dt>watch</dt>
		<dd class="text-dim">latest sodium at or under 20 mg/L and projected to go over 20 mg/L</dd>
		<dt class="flex items-center gap-2">
			<svg aria-hidden="true" width="24" height="8" viewBox="0 0 24 8">
				<line
					x1="0"
					x2="24"
					y1="4"
					y2="4"
					stroke={STROKE.guideline.color}
					stroke-dasharray={STROKE.guideline.dash}
				/>
			</svg>
			20 mg/L
		</dt>
		<dd class="text-dim">MassDEP sodium guideline for people on sodium-restricted diets</dd>
	</dl>
</section>

<section class="py-3">
	<h2 class="font-bold">What to do</h2>
	<p class="pb-3">
		Find the row for the well that serves you and contact the water system in its System column.
	</p>
	<Checker />
</section>
