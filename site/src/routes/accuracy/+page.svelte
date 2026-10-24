<script lang="ts">
	import { caughtShare, meaning } from '#lib/accuracy.js';
	import { count, mgl, pct } from '#lib/format.js';
	import { reveal } from '#lib/motion.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const b = $derived(data.backtest);
	const sentence = $derived(meaning(b));

	// Backtest windows, in years. Matches pipeline/backtest.py.
	const Y0 = 1993;
	const Y1 = 2026;
	const x = (year: number): number => 10 + ((year - Y0) / (Y1 - Y0)) * 980;
	const SPANS = [
		{ from: 1993, to: 2016, color: '#fff', label: 'Trend fit on results through 2015' },
		{ from: 2016, to: 2020, color: '#3a3122', label: 'Gap' },
		{ from: 2020, to: 2026, color: '#f2a93b', label: 'Checked against 2020 on' }
	];

	const TERMS = [
		[
			'Last value',
			"the well's last sodium sample before 2016, carried forward as the guess for its samples from 2020 on"
		],
		['Our rule', "the well's sodium trend before 2016, projected forward to its samples from 2020 on"],
		[
			'Crossed',
			'a well at or under 20 mg/L at its last sample before 2016 whose average sodium from 2020 on is over 20 mg/L'
		],
		['Caught', 'a crossed well that our rule projected over 20 mg/L'],
		[
			'False alarm',
			'a well at or under 20 mg/L at its last sample before 2016 that our rule projected over 20 mg/L but whose average sodium from 2020 on stayed at or under 20 mg/L'
		]
	] as const;
</script>

<svelte:head>
	<title>Accuracy | Frostline</title>
</svelte:head>

<h1 class="display max-w-[14ch] text-[clamp(40px,6vw,96px)]">We checked it against the future.</h1>
<p class="mt-6 max-w-[36em] text-[19px] text-soft">
	We hid every result after 2015, ran the warning on what was left, then compared it with what
	{count(b.wells_tested)} wells actually did from 2020 on.
	{#if sentence !== null}{sentence}{/if}
</p>

<div class="mt-12" {@attach reveal}>
	<svg viewBox="0 0 1000 70" class="block h-auto w-full" aria-hidden="true">
		{#each SPANS as s, i (s.label)}
			<line
				class="draw"
				pathLength="1"
				style:--delay="{i * 0.5}s"
				style:--dur=".9s"
				x1={x(s.from)}
				x2={x(s.to)}
				y1="20"
				y2="20"
				stroke={s.color}
				stroke-width="10"
			/>
			<text
				class="fade"
				style:--delay="{i * 0.5 + 0.4}s"
				x={x(s.from)}
				y="52"
				fill={i === 1 ? '#9a9a9a' : s.color}
				font-size="15"
				font-weight="700">{s.from}</text
			>
		{/each}
		<text class="fade" style:--delay="1.8s" x="990" y="52" text-anchor="end" fill="#f2a93b" font-size="15" font-weight="700"
			>{Y1}</text
		>
	</svg>
	<ul class="mt-2 flex flex-wrap gap-x-8 gap-y-1 text-sm text-dim">
		{#each SPANS as s (s.label)}
			<li class="flex items-center gap-2">
				<i class="block size-2.5" style:background={s.color}></i>{s.label}
			</li>
		{/each}
	</ul>
</div>

<section class="grid items-center gap-14 pt-20 lg:grid-cols-[1.3fr_1fr]">
	<div>
		<h2 class="title text-[28px]">Crossings caught</h2>
		<p class="mt-1 text-soft">
			Wells at or under 20 mg/L before 2016 that went over it from 2020 on.
		</p>
		<div class="relative mt-4 flex h-[56px] text-sm font-bold" {@attach reveal}>
			<span class="flex flex-1 items-center justify-end bg-ember pr-3 text-dim">
				{count(b.crossed - b.caught)} missed
			</span>
			<span
				class="wipe absolute inset-y-0 left-0 flex items-center bg-amber pl-3 whitespace-nowrap text-black"
				style:width="{caughtShare(b) ?? 0}%"
				style:--delay=".2s">{count(b.caught)} caught, {pct(caughtShare(b))}</span
			>
		</div>
	</div>
	<dl class="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 tabular-nums">
		<dt class="figure text-[44px]">{count(b.wells_tested)}</dt>
		<dd class="self-center text-sm text-dim">wells tested</dd>
		<dt class="figure text-[44px]">{count(b.false_alarms)}</dt>
		<dd class="self-center text-sm text-dim">false alarms</dd>
		<dt class="figure text-[44px] text-amber">{mgl(b.mae_rule)}</dt>
		<dd class="self-center text-sm text-dim">median error, our rule (mg/L)</dd>
		<dt class="figure text-[44px]">{mgl(b.mae_baseline)}</dt>
		<dd class="self-center text-sm text-dim">median error, repeating the last value (mg/L)</dd>
	</dl>
</section>

<section class="pt-20">
	<h2 class="display mb-6 text-[clamp(32px,3.6vw,52px)] leading-none">Terms</h2>
	<dl class="grid max-w-[900px] gap-x-6 gap-y-3 sm:grid-cols-[auto_1fr]">
		{#each TERMS as [term, clause] (term)}
			<dt class="font-semibold text-hot">{term}</dt>
			<dd class="text-soft">{clause}</dd>
		{/each}
	</dl>
</section>
