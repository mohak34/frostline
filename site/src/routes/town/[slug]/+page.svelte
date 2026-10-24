<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Checker from '#lib/Checker.svelte';
	import TownMap from '#lib/TownMap.svelte';
	import WellRow from '#lib/WellRow.svelte';
	import { count, mgl, pct, titleCase } from '#lib/format.js';
	import { LEGEND, loadTowns, NO_DATA, NO_WELLS, ramp } from '#lib/map.js';
	import type { Town } from '#lib/types.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const town = $derived(data.town);
	const name = $derived(titleCase(town.name));
	const tested = $derived(data.wells.filter((w) => w.sodium.latest !== null));
	const saltiest = $derived(
		tested.reduce<(typeof tested)[number] | undefined>(
			(top, w) => (top && (top.sodium.latest ?? 0) >= (w.sodium.latest ?? 0) ? top : w),
			undefined
		)
	);
	const facts = $derived([
		{
			figure: `${count(tested.filter((w) => (w.sodium.latest ?? 0) > 20).length)} of ${count(tested.length)}`,
			text: 'public wells over 20 mg/L of sodium at their last test',
			tone: ''
		},
		{
			figure: count(data.wells.filter((w) => w.sodium.trend === 'rising').length),
			text: 'getting saltier year over year',
			tone: 'text-amber'
		},
		{
			figure: count(data.wells.filter((w) => w.sodium.watch).length),
			text: 'under 20 mg/L now but projected to pass it',
			tone: 'text-hot'
		}
	]);

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

	const HEADERS = ['Well', 'System', 'Type', 'Latest sodium (mg/L)', 'Trend', 'Outlook', 'History'];
</script>

<svelte:head>
	<title>{name} | Winter Water Watch</title>
</svelte:head>

<div class="grid items-center gap-10 pt-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
	<div>
		<h1 class="display text-[clamp(44px,6vw,92px)] break-words">{name}</h1>
		{#if town.wells === 0}
			<p class="mt-5 max-w-[30em] text-[19px] text-soft">
				No public wells. {name} gets its water from a reservoir or a regional system, which this site
				does not cover.
			</p>
		{:else}
			<dl class="mt-8 max-w-[34em] text-[19px]">
				{#each facts as f (f.text)}
					<div class="grid grid-cols-[5.5em_1fr] items-baseline gap-4 border-t border-line py-2.5">
						<dt class={['figure text-[34px]', f.tone]}>{f.figure}</dt>
						<dd class="text-soft">{f.text}</dd>
					</div>
				{/each}
				{#if saltiest}
					<div class="grid grid-cols-[5.5em_1fr] items-baseline gap-4 border-t border-line py-2.5">
						<dt class="figure text-[34px]">{mgl(saltiest.sodium.latest)}</dt>
						<dd class="text-soft">
							mg/L at the saltiest well, {titleCase(saltiest.name)}
							<span class="block text-sm text-dim">{titleCase(saltiest.system)}</span>
						</dd>
					</div>
				{/if}
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
