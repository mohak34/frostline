<!--
	Time_Lapse map: each town's share of wells over 20 mg/L, year by year. Plays once when it
	comes into view; the button and slider take over after that. Hovering a town shows its numbers.
-->
<script lang="ts">
	import Icon from '#lib/Icon.svelte';
	import TownMap from '#lib/TownMap.svelte';
	import { count } from '#lib/format.js';
	import { LEGEND, NO_DATA, NO_WELLS, ramp } from '#lib/map.js';
	import { onView } from '#lib/motion.js';
	import type { Town } from '#lib/types.js';
	import { untrack } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';

	let {
		from,
		years,
		towns,
		zoom = null,
		onpick
	}: {
		from: number;
		years: Record<string, (number | null)[]>;
		towns: Map<string, Town>;
		zoom?: string | null;
		onpick?: (slug: string) => void;
	} = $props();

	const to = $derived(from + (Object.values(years)[0]?.length ?? 1) - 1);
	// Starts at the first year; later changes to from do not move it.
	let year = $state(untrack(() => from));
	let timer: ReturnType<typeof setInterval> | undefined = $state();

	const value = (slug: string): number | null | undefined => years[slug]?.[year - from];
	const average = $derived.by(() => {
		const vs = Object.values(years).flatMap((r) => r[year - from] ?? []);
		return vs.length === 0 ? null : Math.round(vs.reduce((a, b) => a + b, 0) / vs.length);
	});
	const share = (x: number | null | undefined): string =>
		x === null || x === undefined ? 'n/a' : `${Math.round(x)}%`;

	function stop(): void {
		clearInterval(timer);
		timer = undefined;
	}
	function play(): void {
		stop();
		if (prefersReducedMotion.current) {
			year = to;
			return;
		}
		if (year >= to) year = from;
		timer = setInterval(() => {
			year++;
			if (year >= to) stop();
		}, 190);
	}
	$effect(() => stop);
</script>

<div class="@container relative" {@attach onView(play)}>
	<TownMap
		label="Map of Massachusetts towns by share of wells over 20 mg/L in {year}"
		fill={(s) => {
			const v = value(s);
			return v === undefined ? NO_WELLS : v === null ? NO_DATA : ramp(v / 100);
		}}
		selected={zoom}
		{zoom}
		{onpick}
	>
		{#snippet tip(slug, name)}
			{@const t = towns.get(slug)}
			<b class="title block text-lg">{name}</b>
			{#if t}
				{#if t.wells === 0}
					<span class="text-dim">No public wells</span>
				{:else}
					<span class="block text-soft tabular-nums"
						><b class="text-amber">{share(value(slug))}</b> of wells over 20 mg/L in {year}</span
					>
					<span class="block text-soft tabular-nums"
						><b class="text-amber">{share(t.pct_rising)}</b> of {count(t.wells)} rising</span
					>
				{/if}
			{/if}
		{/snippet}
	</TownMap>
	<!-- Sits in the empty corner below western Massachusetts. -->
	<div
		class={[
			'pointer-events-none absolute bottom-[3%] left-0 w-[48%] transition-opacity duration-500',
			zoom && 'opacity-0'
		]}
	>
		<p class="display text-[13cqw] leading-[.85] tracking-[-.05em] text-amber tabular-nums">{year}</p>
		<p class="mt-[1.2cqw] text-[clamp(12px,1.7cqw,17px)] leading-snug text-soft">
			The average town had <b class="text-white">{average ?? 'n/a'}%</b> of its wells over 20 mg/L.
		</p>
	</div>
</div>
<div class="mt-3 flex items-center gap-3">
	<button
		type="button"
		class="grid size-[38px] flex-none cursor-pointer place-items-center border border-amber hover:bg-ember"
		aria-label={timer ? 'Pause' : year >= to ? 'Replay' : 'Play'}
		onclick={() => (timer ? stop() : play())}
	>
		<Icon name={timer ? 'pause' : year >= to ? 'replay' : 'play_arrow'} size={20} />
	</button>
	<input
		type="range"
		min={from}
		max={to}
		aria-label="Year"
		class="min-w-0 flex-1 accent-amber"
		bind:value={year}
		oninput={stop}
	/>
	<span class="hidden items-center gap-2 text-xs text-dim sm:flex">
		0%<i class="block h-2 w-[90px]" style:background={LEGEND}></i>100%
	</span>
</div>
<p class="mt-2 text-xs text-dim">
	Share of each town's wells over 20 mg/L, by each well's latest test in the ten years before.
	Hover a town for its numbers.
</p>
