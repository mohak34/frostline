<script lang="ts">
	import { titleCase } from '#lib/format.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	const name = $derived(titleCase(data.town.name));
</script>

<svelte:head>
	<title>{name} | Winter Water Watch</title>
</svelte:head>

<h1 class="text-xl font-bold">{name}</h1>
