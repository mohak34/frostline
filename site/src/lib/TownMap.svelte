<!--
	Massachusetts town map. The parent colors each town through fill(slug), gets clicks by slug,
	and fills the hover tooltip through tip(slug). Towns are not focusable; the town search is the
	keyboard route. Setting zoom glides the view onto that town.
-->
<script lang="ts">
	import { bbox, loadMap, type MapData } from '#lib/map.js';
	import type { Snippet } from 'svelte';
	import { cubicInOut } from 'svelte/easing';
	import { prefersReducedMotion, Tween } from 'svelte/motion';

	let {
		fill,
		label,
		selected = null,
		zoom = null,
		tip,
		onpick
	}: {
		fill: (slug: string) => string;
		label: string;
		selected?: string | null;
		/** Slug to zoom onto, or null for the whole state. */
		zoom?: string | null;
		/** Tooltip body for a hovered town, given its slug and name. */
		tip?: Snippet<[string, string]>;
		onpick?: (slug: string) => void;
	} = $props();

	let map = $state<MapData | null>(null);
	$effect(() => {
		loadMap().then((m) => (map = m));
	});

	const sel = $derived(map?.towns.find((t) => t.s === selected));

	// viewBox as [x, y, w, h]. Starts on the full frame so the prerendered space matches.
	const view = new Tween([0, 0, 1000, 623], { duration: 1100, easing: cubicInOut });
	let placed = false;
	$effect(() => {
		if (!map) return;
		const town = zoom === null ? undefined : map.towns.find((t) => t.s === zoom);
		const target = town ? around(bbox(town.d), map.w / map.h) : [0, 0, map.w, map.h];
		// The first view after load is instant: a page that opens zoomed starts there.
		view.set(target, { duration: placed && !prefersReducedMotion.current ? 1100 : 0 });
		placed = true;
	});

	/** Box three times the town's size, at least 160 wide, in the map's aspect ratio. */
	function around([x, y, w, h]: number[], aspect: number): number[] {
		let bw = Math.max(w * 3, 160);
		let bh = Math.max(h * 3, 160 / aspect);
		if (bw / bh > aspect) bh = bw / aspect;
		else bw = bh * aspect;
		return [x + w / 2 - bw / 2, y + h / 2 - bh / 2, bw, bh];
	}

	let hovered = $state<string | null>(null);
	const hoveredName = $derived(map?.towns.find((t) => t.s === hovered)?.n ?? '');
	let pointer = $state({ x: 0, y: 0, flip: false });

	const slugAt = (e: Event): string | null =>
		e.target instanceof SVGPathElement ? (e.target.dataset.s ?? null) : null;

	function onpointermove(e: PointerEvent): void {
		// Touch has no hover; a tap picks the town instead.
		hovered = e.pointerType === 'mouse' ? slugAt(e) : null;
		const r = e.currentTarget instanceof HTMLElement ? e.currentTarget.getBoundingClientRect() : null;
		if (r) pointer = { x: e.clientX - r.left, y: e.clientY - r.top, flip: e.clientX - r.left > r.width - 260 };
	}
</script>

<!-- 1000 x 623 is map.json's frame; it holds the space before the borders load. -->
<!-- svelte-ignore a11y_no_static_element_interactions, a11y_click_events_have_key_events -->
<div
	class="relative aspect-[1000/623]"
	{onpointermove}
	onpointerleave={() => (hovered = null)}
	onclick={(e) => {
		const s = slugAt(e);
		if (s) onpick?.(s);
	}}
>
	{#if map}
		<svg
			viewBox={view.current.join(' ')}
			role="img"
			aria-label={label}
			class={['block h-auto w-full', onpick && 'pickable', zoom && 'zoomed']}
		>
			{#each map.towns as t (t.s)}
				<path
					d={t.d}
					data-s={t.s}
					style:fill={fill(t.s)}
					vector-effect="non-scaling-stroke"
				>{#if !tip}<title>{t.n}</title>{/if}</path>
			{/each}
			{#if sel}
				<path d={sel.d} class="sel" pointer-events="none" vector-effect="non-scaling-stroke" />
			{/if}
		</svg>
	{/if}
	{#if tip && hovered}
		<div
			class="pointer-events-none absolute z-10 w-max max-w-[240px] border border-line bg-black px-3 py-2 text-sm"
			style:left="{pointer.x}px"
			style:top="{pointer.y}px"
			style:translate={pointer.flip ? 'calc(-100% - 14px) 14px' : '14px 14px'}
		>
			{@render tip(hovered, hoveredName)}
		</div>
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
	/* A zoomed view ends in a soft edge instead of a hard crop. */
	.zoomed {
		mask-image:
			linear-gradient(90deg, transparent, #000 15%, #000 85%, transparent),
			linear-gradient(transparent, #000 15%, #000 85%, transparent);
		mask-composite: intersect;
	}
	path.sel {
		fill: none;
		stroke: #fff;
		stroke-width: 3;
	}
</style>
