<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Checker from '#lib/Checker.svelte';
	import Icon from '#lib/Icon.svelte';
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

	// Colors the locator map once towns.json arrives; until then only this town is lit.
	let towns = $state<Map<string, Town>>(new Map());
	$effect(() => {
		loadTowns().then((ts) => (towns = new Map(ts.map((t) => [t.slug, t]))));
	});
	let hovered = $state<string | null>(null);
	const hoveredTown = $derived(hovered === null ? undefined : towns.get(hovered));

	function fill(slug: string): string {
		const t = towns.get(slug);
		if (!t) return slug === town.slug ? '#f2a93b' : NO_WELLS;
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

<a href={resolve('/')} class="inline-flex items-center gap-1 text-sm text-dim hover:text-white">
	<Icon name="arrow_back" size={18} /> All towns
</a>

<div class="mt-6 grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
	<div>
		<h1 class="display text-[clamp(44px,7vw,110px)] break-words">{name}</h1>
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
	</div>
	<div>
		<TownMap
			label="Map of Massachusetts towns, {name} outlined"
			{fill}
			selected={town.slug}
			onhover={(s) => (hovered = s)}
			onpick={(s) => {
				if (s !== town.slug && towns.has(s)) goto(resolve('/town/[slug]', { slug: s }));
			}}
		/>
		<div class="mt-3 flex min-h-[28px] flex-wrap items-center gap-x-5 gap-y-2 text-sm text-soft">
			<span>
				{#if hovered && hovered !== town.slug}
					{#if hoveredTown}
						Open {titleCase(hoveredTown.name)}:
						<b class="text-amber">{pct(hoveredTown.pct_rising)}</b> rising
					{:else}
						No public wells there
					{/if}
				{:else}
					Wells rising by town. Click one to open it.
				{/if}
			</span>
			<span class="flex items-center gap-2 text-xs text-dim lg:ml-auto">
				low<i class="block h-2 w-[120px]" style:background={LEGEND}></i>high
			</span>
		</div>
	</div>
</div>

<section class="pt-20">
	<h2 class="display mb-6 text-[clamp(32px,3.6vw,52px)] leading-none">Wells</h2>
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
					<WellRow {well} index={i} />
				{/each}
			</tbody>
		</table>
	</div>
	<dl class="mt-5 grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 text-sm">
		{#each CLASSES as [code, meaning] (code)}
			<dt class="font-semibold">{code}</dt>
			<dd class="text-dim">{meaning}</dd>
		{/each}
		<dt class="font-semibold text-hot">watch</dt>
		<dd class="text-dim">latest sodium at or under 20 mg/L and projected to go over 20 mg/L</dd>
		<dt class="flex items-center gap-2 font-semibold">
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

<section class="pt-20">
	<h2 class="display mb-6 text-[clamp(32px,3.6vw,52px)] leading-none">What to do</h2>
	<div class="max-w-[760px] border-l-3 border-amber pl-5">
		<p class="pb-5 text-soft">
			Find the row for the well that serves you and contact the water system in its System column.
			To check a MassDOT road-salt trigger, enter that well's latest results.
		</p>
		<Checker />
	</div>
</section>
