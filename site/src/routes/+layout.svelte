<script lang="ts">
	import './layout.css';
	import { resolve } from '$app/paths';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	const home = resolve('/');
	const NAV = [
		{ href: `${home}#spread`, label: 'Spread' },
		{ href: `${home}#how`, label: 'How it works' },
		{ href: resolve('/accuracy'), label: 'Accuracy' },
		{ href: `${home}#kiro`, label: 'Built with Kiro' }
	];
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="mx-auto max-w-[1400px] px-5 sm:px-8">
	<header class="flex items-center justify-between py-5.5">
		<a href={home} class="text-lg font-black tracking-[-.01em] [font-stretch:125%]">Winter Water Watch</a>
		<nav class="hidden gap-6.5 text-[15px] lg:flex">
			{#each NAV as n (n.label)}
				<a href={n.href} class="text-dim hover:text-white">{n.label}</a>
			{/each}
		</nav>
	</header>
	<main>
		{@render children()}
	</main>
	<footer
		class="mt-28 mb-10 flex flex-wrap justify-between gap-4 border-t border-[#222] pt-4.5 text-sm text-dim"
	>
		<span>Winter Water Watch, Hackachusetts 2026, UMass Amherst</span>
		<span>Public water systems only. Private wells are not covered. Data: MassDEP, MassGIS.</span>
	</footer>
</div>
