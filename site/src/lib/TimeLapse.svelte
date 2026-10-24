<!--
	Time_Lapse map: each town's share of wells over 20 mg/L, year by year. Plays once when it
	scrolls into view; the button and slider take over after that.
-->
<script lang="ts">
	import Icon from '#lib/Icon.svelte';
	import TownMap from '#lib/TownMap.svelte';
	import { NO_DATA, NO_WELLS, ramp } from '#lib/map.js';
	import { onView } from '#lib/motion.js';
	import { untrack } from 'svelte';
	import { prefersReducedMotion } from 'svelte/motion';

	let { from, years }: { from: number; years: Record<string, (number | null)[]> } = $props();

	const to = $derived(from + (Object.values(years)[0]?.length ?? 1) - 1);
	// Starts at the first year; later changes to from do not move it.
	let year = $state(untrack(() => from));
	let timer: ReturnType<typeof setInterval> | undefined = $state();

	const value = (slug: string): number | null | undefined => years[slug]?.[year - from];
	const average = $derived.by(() => {
		const vs = Object.values(years).flatMap((r) => r[year - from] ?? []);
		return vs.length === 0 ? null : Math.round(vs.reduce((a, b) => a + b, 0) / vs.length);
	});

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

<div class="grid items-center gap-12 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
	<div {@attach onView(play)}>
		<TownMap
			label="Map of Massachusetts towns by share of wells over 20 mg/L in {year}"
			fill={(s) => {
				const v = value(s);
				return v === undefined ? NO_WELLS : v === null ? NO_DATA : ramp(v / 100);
			}}
		/>
	</div>
	<div>
		<p class="display text-[clamp(80px,11vw,170px)] leading-[.85] tracking-[-.05em] text-amber tabular-nums">
			{year}
		</p>
		<p class="mt-4 max-w-[24em] text-[17px] text-[#cfcfcf]">
			The average town had <b class="figure text-[28px] text-white">{average ?? 'n/a'}%</b> of its
			wells over 20 mg/L, by each well's latest test in the ten years before.
		</p>
		<div class="mt-5 flex items-center gap-3">
			<button
				type="button"
				class="grid size-[42px] flex-none cursor-pointer place-items-center border border-amber"
				aria-label={timer ? 'Pause' : year >= to ? 'Replay' : 'Play'}
				onclick={() => (timer ? stop() : play())}
			>
				<Icon name={timer ? 'pause' : year >= to ? 'replay' : 'play_arrow'} />
			</button>
			<input
				type="range"
				min={from}
				max={to}
				aria-label="Year"
				class="flex-1 accent-amber"
				bind:value={year}
				oninput={stop}
			/>
		</div>
	</div>
</div>
