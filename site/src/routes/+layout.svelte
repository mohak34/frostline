<script lang="ts">
	import './layout.css';
	import { resolve } from '$app/paths';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="mx-auto max-w-5xl px-3">
	<header class="flex gap-4 py-3">
		<a href={resolve('/')} class="font-bold">Winter Water Watch</a>
		<a href={resolve('/accuracy')}>Accuracy</a>
	</header>
	<main>
		{@render children()}
	</main>
	<footer class="py-3 text-sm">
		Public water systems only. Private wells are not covered. Data: MassDEP drinking water results.
	</footer>
</div>
