<script lang="ts">
	import './layout.css';
	import { goto, onNavigate } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import Icon from '#lib/Icon.svelte';
	import TownSearch from '#lib/TownSearch.svelte';
	import favicon from '#lib/assets/favicon.svg';
	import { everyTown, loadMap, loadTowns } from '#lib/map.js';
	import type { Town } from '#lib/types.js';
	import { prefersReducedMotion } from 'svelte/motion';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();

	const home = resolve('/');
	const NAV = [
		{ href: `${home}#how`, label: 'How it works' },
		{ href: resolve('/accuracy'), label: 'Accuracy' }
	];
	// The home page has its own big search, so the header one shows everywhere else.
	const search = $derived(page.route.id !== '/');

	// Page changes cross-fade, and a zoomed map morphs into the next page's map (see layout.css).
	onNavigate((nav) => {
		if (!document.startViewTransition || prefersReducedMotion.current) return;
		if (nav.from?.url.pathname === nav.to?.url.pathname) return;
		return new Promise((done) => {
			document.startViewTransition(async () => {
				done();
				await nav.complete;
			});
		});
	});

	let towns = $state.raw<Town[]>([]);
	$effect(() => {
		if (search && towns.length === 0)
			Promise.all([loadTowns(), loadMap()]).then(([ts, m]) => (towns = everyTown(ts, m)));
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<header class="sticky top-0 z-20 bg-black">
	<div class="mx-auto flex max-w-[1400px] items-center gap-6 px-5 py-4 sm:px-8">
		<a href={home} class="flex shrink-0 items-center gap-1.5 text-lg font-black tracking-[-.01em] [font-stretch:125%]">
			<Icon name="water_drop" class="text-amber" />
			<span class={search ? 'hidden sm:inline' : undefined}>Frostline</span>
		</a>
		<nav class="ml-auto hidden gap-6 text-[15px] md:flex">
			{#each NAV as n (n.label)}
				<a
					href={n.href}
					aria-current={page.url.pathname === n.href ? 'page' : undefined}
					class="text-dim hover:text-white aria-[current=page]:text-white">{n.label}</a
				>
			{/each}
		</nav>
		{#if search}
			<div class="ml-auto w-full max-w-[280px] md:ml-0">
				<TownSearch
					{towns}
					compact
					onpick={(t) => goto(resolve('/town/[slug]', { slug: t.slug }))}
				/>
			</div>
		{/if}
	</div>
</header>

<div class="mx-auto max-w-[1400px] px-5 sm:px-8">
	<main class="pt-4">
		{@render children()}
	</main>
	<footer class="mt-28 mb-10 border-t border-[#222] pt-6 text-center text-sm text-dim">
		<p>Public water systems only. Private wells are not covered.</p>
		<p>Data from MassDEP and MassGIS.</p>
		<p class="mt-3 text-[#6d6556]">Frostline, Hackachusetts 2026, UMass Amherst</p>
	</footer>
</div>
