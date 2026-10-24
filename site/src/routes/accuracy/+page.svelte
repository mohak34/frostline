<script lang="ts">
	import { caughtShare, meaning } from '#lib/accuracy.js';
	import { count, mgl, pct } from '#lib/format.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const b = $derived(data.backtest);
	const sentence = $derived(meaning(b));

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

{#snippet mg(x: number | null)}{mgl(x)}{#if x !== null}{' '}mg/L{/if}{/snippet}

<svelte:head>
	<title>Accuracy | Winter Water Watch</title>
</svelte:head>

<h1 class="text-xl font-bold">Accuracy</h1>

{#if sentence !== null}
	<p class="py-3">{sentence}</p>
{/if}

<dl class="grid grid-cols-[auto_1fr] gap-x-4 py-3 tabular-nums">
	<dt class="text-dim">Wells tested</dt>
	<dd>{count(b.wells_tested)}</dd>
	<dt class="text-dim">Median error, last value</dt>
	<dd>{@render mg(b.mae_baseline)}</dd>
	<dt class="text-dim">Median error, our rule</dt>
	<dd>{@render mg(b.mae_rule)}</dd>
	<dt class="text-dim">Crossings caught</dt>
	<dd>{count(b.caught)} of {count(b.crossed)} ({pct(caughtShare(b))})</dd>
	<dt class="text-dim">False alarms</dt>
	<dd>{count(b.false_alarms)}</dd>
</dl>

<section class="py-3">
	<h2 class="font-bold">Terms</h2>
	<dl class="grid grid-cols-[auto_1fr] gap-x-4 text-sm">
		{#each TERMS as [term, clause] (term)}
			<dt>{term}</dt>
			<dd class="text-dim">{clause}</dd>
		{/each}
	</dl>
</section>
