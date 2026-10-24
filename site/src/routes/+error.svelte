<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import Icon from '#lib/Icon.svelte';
	import { reveal } from '#lib/motion.js';

	const town = $derived(page.url.pathname.startsWith('/town/'));
	const message = $derived(
		page.status === 404 ? (town ? 'Town not found' : 'Page not found') : `Error ${page.status}`
	);
</script>

<svelte:head>
	<title>{message} | Winter Water Watch</title>
</svelte:head>

<div class="grid items-center gap-10 py-10 md:grid-cols-[minmax(0,1fr)_280px]">
	<div>
		<h1 class="display text-[clamp(44px,7vw,110px)]">{message}</h1>
		<p class="mt-5 max-w-[30em] text-[19px] text-soft">
			{town
				? 'Only towns with public drinking water wells have a page. Search for your town on the home page.'
				: 'Nothing lives at this address. The map and the town search are on the home page.'}
		</p>
		<a
			href={resolve('/')}
			class="mt-6 inline-flex items-center gap-1 border-b border-amber text-[17px] font-bold"
		>
			<Icon name="arrow_back" size={18} /> Back to the home page
		</a>
	</div>
	<!-- An empty well: casing, a dry water table, and nothing in the bucket. -->
	<div {@attach reveal}>
		<svg viewBox="0 0 200 200" class="block h-auto w-full" aria-hidden="true" fill="none" stroke-linecap="round">
			<path class="draw" pathLength="1" d="M10 70H190" stroke="#fff" stroke-width="2" />
			<path class="draw" pathLength="1" style:--delay=".3s" d="M80 20V190M120 20V190" stroke="#fff" stroke-width="2" />
			<path class="draw" pathLength="1" style:--delay=".3s" d="M70 20H130" stroke="#fff" stroke-width="2" />
			<path class="draw" pathLength="1" style:--delay=".8s" d="M100 20V120" stroke="#9a9a9a" stroke-width="1.5" />
			<path class="draw" pathLength="1" style:--delay="1.4s" d="M90 120H110L106 136H94Z" stroke="#f2a93b" stroke-width="2" />
			<path class="fade" style:--delay="1s" d="M10 172q15-5 30 0t30 0M130 172q15-5 30 0t30 0" stroke="#3a3122" stroke-width="2" stroke-dasharray="4 5" />
		</svg>
	</div>
</div>
