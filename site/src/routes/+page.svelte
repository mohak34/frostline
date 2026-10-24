<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import Chart from '#lib/Chart.svelte';
	import CountUp from '#lib/CountUp.svelte';
	import Icon from '#lib/Icon.svelte';
	import TimeLapse from '#lib/TimeLapse.svelte';
	import TownSearch from '#lib/TownSearch.svelte';
	import Cross from '#lib/art/Cross.svelte';
	import Rows from '#lib/art/Rows.svelte';
	import Seep from '#lib/art/Seep.svelte';
	import Step from '#lib/art/Step.svelte';
	import { caughtShare } from '#lib/accuracy.js';
	import { count, mgl, titleCase } from '#lib/format.js';
	import { reveal } from '#lib/motion.js';
	import type { Town } from '#lib/types.js';
	import { prefersReducedMotion } from 'svelte/motion';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const { system, samples } = $derived(data.feature);
	const first = $derived(samples[0]);
	const last = $derived(samples[samples.length - 1]);
	const span = $derived(Number(last.date.slice(0, 4)) - Number(first.date.slice(0, 4)));
	const b = $derived(data.backtest);
	const bySlug = $derived(new Map(data.towns.map((t) => [t.slug, t])));

	// A pick zooms the map onto the town, then opens its page.
	let zoom = $state<string | null>(null);
	function open(t: Town): void {
		const go = () => goto(resolve('/town/[slug]', { slug: t.slug }));
		if (prefersReducedMotion.current) return void go();
		zoom = t.slug;
		setTimeout(go, 1100);
	}

	const KICKERS = [
		{
			art: Seep,
			title: 'Salt does not go away.',
			text: 'Sodium and chloride from treated roads soak into aquifers and stay. Each winter stacks on the last.'
		},
		{
			art: Rows,
			title: 'The data was buried.',
			text: 'MassDEP publishes every well test as raw lab rows. Nobody had turned them into a trend per well.'
		},
		{
			art: Cross,
			title: '20 mg/L is the line.',
			text: 'It is the MassDEP sodium guideline for people on sodium-restricted diets.'
		}
	];
	const STEPS = [
		{ kind: 'pull', title: 'Pull', text: 'Every sodium and chloride result from the MassDEP Data Lake API.' },
		{
			kind: 'clean',
			title: 'Clean',
			text: 'Match each result to a well and a town. Drop look-alike chemicals and non-numeric rows.'
		},
		{
			kind: 'trend',
			title: 'Trend',
			text: 'Theil-Sen slope per well. Rising only when the Kendall test gives p < 0.05.'
		},
		{
			kind: 'warn',
			title: 'Warn',
			text: 'Flag wells under 20 mg/L that the trend carries past 20 within five years.'
		}
	] as const;
</script>

<svelte:head>
	<title>Winter Water Watch</title>
	<meta
		name="description"
		content="Road salt is pushing sodium up in Massachusetts drinking water wells. Check your town."
	/>
</svelte:head>

<div
	class="grid items-center gap-10 pb-10 lg:min-h-[calc(100vh-80px)] lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]"
>
	<div>
		<h1 class="display text-[clamp(36px,11vw,92px)] lg:text-[clamp(44px,5.4vw,92px)]">
			Is your well water getting <span class="text-amber">saltier?</span>
		</h1>
		<p class="mt-5 max-w-[28em] text-[19px] text-soft">
			Road salt seeps into the wells Massachusetts towns drink from. We read {span} years of state lab results to show which ones are rising, town by town.
		</p>
		<div class="mt-7">
			<TownSearch towns={data.towns} onpick={open} suggest={['amherst', 'plymouth', 'barnstable']} />
		</div>
		<div class="mt-8 flex gap-6 sm:gap-9">
			<div>
				<b class="figure block text-[40px] sm:text-[52px]"><CountUp value={data.statewide.wells} /></b>
				<span class="text-[13px] text-dim">wells tracked</span>
			</div>
			<div>
				<b class="figure block text-[40px] sm:text-[52px]"><CountUp value={data.statewide.rising} /></b>
				<span class="text-[13px] text-dim">rising</span>
			</div>
			<div>
				<b class="figure block text-[40px] sm:text-[52px]"
					><CountUp value={b.caught} />/{count(b.crossed)}</b
				>
				<span class="text-[13px] text-dim">crossings caught early</span>
			</div>
		</div>
	</div>

	<div>
		<TimeLapse
			from={data.lapse.from}
			years={data.lapse.years}
			towns={bySlug}
			{zoom}
			onpick={(s) => {
				const t = bySlug.get(s);
				if (t) open(t);
			}}
		/>
	</div>
</div>

<section class="pt-24">
	<div class="grid border-t-2 border-amber md:grid-cols-3">
	{#each KICKERS as k, i (k.title)}
		{@const Art = k.art}
		<div class="pt-6 pr-7" {@attach reveal} style:--base="{i * 0.25}s">
			<div class="mb-4 max-w-[260px]"><Art /></div>
			<h3 class="title mb-2 text-2xl">{k.title}</h3>
			<p class="max-w-[26em] text-[15px] text-[#cfcfcf]">{k.text}</p>
		</div>
	{/each}
	</div>
</section>

<section class="grid items-center gap-12 pt-24 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
	<div>
		<h2 class="display mb-5 text-[clamp(32px,3.6vw,52px)] leading-none">
			One well, {span} winters.
		</h2>
		<p class="max-w-[26em] text-[17px] text-[#cfcfcf]">
			The North Plymouth GP well went from <b class="text-white">{mgl(first.value)} mg/L</b> of
			sodium in {first.date.slice(0, 4)} to <b class="text-hot">{mgl(last.value)} mg/L</b> in
			{last.date.slice(0, 4)}.
		</p>
		<p class="mt-3 text-sm text-dim">
			{titleCase(system)}. Over 20 mg/L matters for people on low-sodium diets.
		</p>
	</div>
	<div {@attach reveal}>
		<Chart variant="home" series={[{ chemical: 'sodium', samples }]} />
	</div>
</section>

<section id="how" class="scroll-mt-6 pt-24">
	<h2 class="display mb-7 text-[clamp(32px,3.6vw,52px)] leading-none">How it works</h2>
	<ol class="grid gap-7 sm:grid-cols-2 lg:grid-cols-4">
		{#each STEPS as s, i (s.kind)}
			<li class="border-t border-line pt-4" {@attach reveal} style:--base="{i * 0.3}s">
				<div class="flex items-end justify-between">
					<b class="figure text-[44px] font-black text-amber">{i + 1}</b>
					<Step kind={s.kind} />
				</div>
				<h3 class="mt-2.5 mb-1 text-lg font-semibold">{s.title}</h3>
				<p class="text-sm text-[#bdbdbd]">{s.text}</p>
			</li>
		{/each}
	</ol>
</section>

<section id="acc" class="grid scroll-mt-6 items-center gap-14 pt-24 lg:grid-cols-[1.3fr_1fr]">
	<div>
		<h2 class="display mb-7 text-[clamp(32px,3.6vw,52px)] leading-none">
			We checked it against the future.
		</h2>
		<p class="max-w-[34em] text-[#cfcfcf]">
			We hid every result after 2015, ran the warning, then compared it with what wells actually did
			from 2020 on.
		</p>
		<div class="relative mt-3.5 flex h-[46px] text-[13px] font-bold" {@attach reveal}>
			<span class="flex flex-1 items-center justify-end bg-ember pr-2.5 text-dim">
				{count(b.crossed - b.caught)} missed, of {count(b.crossed)} wells that crossed 20 mg/L
			</span>
			<span
				class="wipe absolute inset-y-0 left-0 flex items-center bg-amber pl-2.5 whitespace-nowrap text-black"
				style:width="{caughtShare(b) ?? 0}%"
				style:--delay=".2s">{count(b.caught)} caught</span
			>
		</div>
		<a href={resolve('/accuracy')} class="mt-4 inline-flex items-center gap-0.5 border-b border-amber text-[15px] font-bold">
			How we scored it <Icon name="chevron_right" size={18} />
		</a>
	</div>
	<dl class="grid grid-cols-[auto_1fr] gap-x-4.5 gap-y-1.5">
		<dt class="figure text-[40px]">{count(b.wells_tested)}</dt>
		<dd class="self-center text-sm text-dim">wells in the test</dd>
		<dt class="figure text-[40px]">{count(b.false_alarms)}</dt>
		<dd class="self-center text-sm text-dim">false alarms</dd>
		{#if b.mae_rule !== null}
			<dt class="figure text-[40px]">{mgl(b.mae_rule)}</dt>
			<dd class="self-center text-sm text-dim">
				mg/L median error{b.mae_baseline === null
					? ''
					: `, against ${mgl(b.mae_baseline)} for repeating the last value`}
			</dd>
		{/if}
	</dl>
</section>
