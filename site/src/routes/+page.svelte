<script lang="ts">
	import Chart from '#lib/Chart.svelte';
	import TownSearch from '#lib/TownSearch.svelte';
	import { count, pct } from '#lib/format.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const { name, system, samples } = $derived(data.feature);
	const { wells, trended, pctRising } = $derived(data.statewide);
</script>

<svelte:head>
	<title>Winter Water Watch</title>
</svelte:head>

<h1 class="text-xl font-bold">Is your water getting saltier?</h1>

<section class="py-3">
	<h2 class="font-bold">Sodium at {name}, {system}</h2>
	<Chart variant="home" series={[{ chemical: 'sodium', samples }]} />
</section>

<p>
	{count(wells)} wells tracked. {pct(pctRising)} of the {count(trended)} with a sodium trend are rising.
</p>

<div class="py-3">
	<TownSearch towns={data.towns} />
</div>
