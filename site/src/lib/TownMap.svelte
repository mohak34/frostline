<!--
	Massachusetts town map. The parent colors each town through fill(slug) and gets hover and
	click by slug. Towns are not focusable; the town search is the keyboard route.
-->
<script lang="ts">
	import { loadMap, type MapData } from '#lib/map.js';

	let {
		fill,
		label,
		selected = null,
		sweep = false,
		onhover,
		onpick
	}: {
		fill: (slug: string) => string;
		label: string;
		selected?: string | null;
		/** Fade towns in west to east once the borders load. */
		sweep?: boolean;
		onhover?: (slug: string | null) => void;
		onpick?: (slug: string) => void;
	} = $props();

	let map = $state<MapData | null>(null);
	$effect(() => {
		loadMap().then((m) => (map = m));
	});

	const sel = $derived(map?.towns.find((t) => t.s === selected));

	const slugAt = (e: Event): string | null =>
		e.target instanceof SVGPathElement ? (e.target.dataset.s ?? null) : null;
	// First x coordinate of the path, as a share of the width.
	const west = (d: string, w: number): number => parseFloat(d.slice(1)) / w;
</script>

<!-- 1000 x 623 is map.json's frame; it holds the space before the borders load. -->
<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
<div
	class="aspect-[1000/623]"
	onpointerover={(e) => onhover?.(slugAt(e))}
	onpointerleave={() => onhover?.(null)}
	onclick={(e) => {
		const s = slugAt(e);
		if (s) onpick?.(s);
	}}
>
	{#if map}
		<svg
			viewBox="0 0 {map.w} {map.h}"
			role="img"
			aria-label={label}
			class={['block h-auto w-full', sweep && 'sweep', onpick && 'pickable']}
		>
			{#each map.towns as t (t.s)}
				<path
					d={t.d}
					data-s={t.s}
					style:fill={fill(t.s)}
					style:animation-delay={sweep ? `${Math.round(west(t.d, map.w) * 900)}ms` : undefined}
				><title>{t.n}</title></path>
			{/each}
			{#if sel}
				<path d={sel.d} class="sel" pointer-events="none" />
			{/if}
		</svg>
	{/if}
</div>

<style>
	path {
		stroke: #000;
		stroke-width: 0.6;
		transition: fill 0.35s;
	}
	path:hover {
		stroke: #fff;
		stroke-width: 2;
	}
	.pickable path {
		cursor: pointer;
	}
	path.sel {
		fill: none;
		stroke: #fff;
		stroke-width: 3;
	}
	@media (prefers-reduced-motion: no-preference) {
		.sweep path {
			animation: sweep 0.5s both;
		}
	}
	@keyframes sweep {
		from {
			opacity: 0;
		}
	}
</style>
