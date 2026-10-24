<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Checker from '#lib/Checker.svelte';
	import TownMap from '#lib/TownMap.svelte';
	import WellRow from '#lib/WellRow.svelte';
	import { STROKE } from '#lib/chart.js';
	import { count, pct, titleCase } from '#lib/format.js';
	import { LEGEND, loadTowns, NO_DATA, NO_WELLS, ramp } from '#lib/map.js';
	import type { Town } from '#lib/types.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const town = $derived(data.town);
	const name = $derived(titleCase(town.name));
	const watching = $derived(data.wells.filter((w) => w.sodium.watch).length);

	// Colors the locator map once towns.json arrives.
	let towns = $state<Map<string, Town>>(new Map());
	$effect(() => {
		loadTowns().then((ts) => (towns = new Map(ts.map((t) => [t.slug, t]))));
	});

	function fill(slug: string): string {
		const t = towns.get(slug);
		if (!t) return NO_WELLS;
		return t.pct_rising === null ? NO_DATA : ramp(t.pct_rising / 70);
	}

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

<div class="grid items-center gap-10 pt-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
	<div>
		<h1 class="display text-[clamp(44px,7vw,110px)] break-words">{name}</h1>
		{#if town.wells === 0}
			<p class="mt-5 max-w-[30em] text-[19px] text-soft">
				No public wells. {name} gets its water from a reservoir or a regional system, which this site
				does not cover.
			</p>
		{:else}
			<p class="mt-5 max-w-[30em] text-[19px] text-soft">
				<b class="text-amber">{pct(town.pct_rising)}</b> of its wells with a sodium trend are getting
				saltier. <b class="text-amber">{pct(town.pct_over_20)}</b> were over 20 mg/L at their last test.
			</p>
			<dl class="mt-8 flex flex-wrap gap-x-9 gap-y-4">
				<div class="flex flex-col">
					<dt class="text-[13px] text-dim">public wells</dt>
					<dd class="figure order-first text-[52px]">{count(town.wells)}</dd>
				</div>
				<div class="flex flex-col">
					<dt class="text-[13px] text-dim">on watch</dt>
					<dd class="figure order-first text-[52px] text-hot">{count(watching)}</dd>
				</div>
			</dl>
		{/if}
	</div>
	<div>
		<TownMap
			label="Map of {name} and the towns around it"
			{fill}
			selected={town.slug}
			zoom={town.slug}
			onpick={(s) => {
				if (s !== town.slug) goto(resolve('/town/[slug]', { slug: s }));
			}}
		>
			{#snippet tip(slug, townName)}
				{@const t = towns.get(slug)}
				<b class="title block text-lg">{townName}</b>
				<span class="block text-soft">
					{#if t}<b class="text-amber">{pct(t.pct_rising)}</b> of wells rising{:else}No public wells{/if}
				</span>
				{#if slug !== town.slug}<span class="text-dim">Click to open</span>{/if}
			{/snippet}
		</TownMap>
		<p class="mt-3 flex items-center gap-2 text-xs text-dim">
			Wells rising by town: low<i class="block h-2 w-[120px]" style:background={LEGEND}></i>high
		</p>
	</div>
</div>

{#if data.wells.length > 0}
	<section class="pt-20">
		<h2 class="display text-[clamp(32px,3.6vw,52px)] leading-none">Wells</h2>
		<dl class="mt-5 mb-4 flex flex-wrap gap-x-7 gap-y-1.5 text-[13px]">
			{#each CLASSES as [code, meaning] (code)}
				<div class="flex gap-1.5"><dt class="font-semibold">{code}</dt><dd class="text-dim">{meaning}</dd></div>
			{/each}
			<div class="flex gap-1.5">
				<dt class="font-semibold text-hot">watch</dt>
				<dd class="text-dim">at or under 20 mg/L now, projected over it</dd>
			</div>
			<div class="flex items-center gap-1.5">
				<dt class="flex items-center gap-1.5 font-semibold">
					<svg aria-hidden="true" width="20" height="8" viewBox="0 0 20 8">
						<line
							x1="0"
							x2="20"
							y1="4"
							y2="4"
							stroke={STROKE.guideline.color}
							stroke-dasharray={STROKE.guideline.dash}
						/>
					</svg>
					20 mg/L
				</dt>
				<dd class="text-dim">MassDEP guideline for sodium-restricted diets</dd>
			</div>
		</dl>
		<div class="overflow-x-auto">
			<table class="w-full text-sm tabular-nums">
				<thead>
					<tr class="border-b-2 border-amber">
						{#each HEADERS as h (h)}
							<th scope="col" class="py-2 pr-4 text-left font-normal text-dim">{h}</th>
						{/each}
					</tr>
				</thead>
				<tbody>
					{#each data.wells as well, i (well.id)}
						<WellRow {well} index={i} openOnView={i === 0} />
					{/each}
				</tbody>
			</table>
		</div>
	</section>

	<section class="pt-20">
		<h2 class="display mb-6 text-[clamp(32px,3.6vw,52px)] leading-none">What to do</h2>
		<p class="max-w-[40em] text-soft">
			Find the well that serves you and contact the water system in its System column. To see if it
			meets a MassDOT road-salt trigger, pick it below or enter its latest results.
		</p>
		<div class="mt-6">
			<Checker wells={data.wells} />
		</div>
	</section>
{/if}
