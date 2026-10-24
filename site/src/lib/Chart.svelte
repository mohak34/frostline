<!--
	Every chart in the site. home and detail fill their container's width and draw axes;
	spark is a fixed 96 x 24 with only the lines, the guideline, and one-sample markers.
-->
<script lang="ts">
	import { chartLabel, plot, STROKE, type Frame, type Plot, type PlotSeries } from '#lib/chart.js';

	let { series, variant }: { series: PlotSeries[]; variant: 'home' | 'detail' | 'spark' } = $props();

	// Four-digit year labels are about 28 px at 12 px type.
	const MIN_LABEL_GAP = 56;
	// top fits the mg/L unit label, right fits the 20 mg/L label.
	const AXES_MARGIN = { top: 20, right: 64, bottom: 24, left: 44 };
	// Room for a 2.5 px marker at the plot edge; inline SVG clips overflow.
	const SPARK: Frame = { width: 96, height: 24, margin: { top: 3, right: 3, bottom: 3, left: 3 } };

	// Prerendered HTML draws at 640; after hydration bind:clientWidth gives the real width.
	let width = $state(640);

	const spark = $derived(variant === 'spark');
	const frame: Frame = $derived(
		spark ? SPARK : { width, height: variant === 'home' ? 280 : 200, margin: AXES_MARGIN }
	);
	const p = $derived(plot(series, frame, MIN_LABEL_GAP));
	const label = $derived(chartLabel(series));
</script>

{#snippet chart(p: Plot)}
	<svg
		role="img"
		aria-label={label}
		viewBox="0 0 {frame.width} {frame.height}"
		width={spark ? frame.width : '100%'}
		height={frame.height}
		font-size="12"
	>
		{#if !spark}
			<path
				d="M {p.left} {p.top} V {p.bottom} H {p.right} {p.xTicks
					.map((t) => `M ${t.pos} ${p.bottom} v 4`)
					.join(' ')}"
				fill="none"
				stroke="#a3a3a3"
			/>
			<g fill="#a3a3a3">
				<text x={p.left} y={p.top - 8}>mg/L</text>
				{#each p.yTicks as t}
					<text x={p.left - 6} y={t.pos} text-anchor="end" dominant-baseline="middle">{t.label}</text>
				{/each}
				{#each p.xTicks as t}
					<text x={t.pos} y={p.bottom + 16} text-anchor="middle">{t.label}</text>
				{/each}
			</g>
			<text
				x={p.right + 6}
				y={p.guidelineY}
				dominant-baseline="middle"
				fill={STROKE.guideline.color}>20 mg/L</text
			>
		{/if}
		<line
			x1={p.left}
			x2={p.right}
			y1={p.guidelineY}
			y2={p.guidelineY}
			stroke={STROKE.guideline.color}
			stroke-dasharray={STROKE.guideline.dash}
		/>
		{#each p.series as s}
			{@const stroke = STROKE[s.chemical]}
			{@const draw = variant === 'home' && s.chemical === 'sodium'}
			{#if s.d}
				<path
					d={s.d}
					fill="none"
					stroke={stroke.color}
					stroke-dasharray={stroke.dash}
					stroke-width="1.5"
					stroke-linejoin="round"
					pathLength={draw ? 1 : undefined}
					class={draw ? 'draw' : undefined}
				/>
			{/if}
			{#if !spark || s.points.length === 1}
				{#each s.points as pt}
					<circle cx={pt.x} cy={pt.y} r="2.5" fill={stroke.color} />
				{/each}
			{/if}
		{/each}
	</svg>
{/snippet}

{#if spark}
	{#if p}
		{@render chart(p)}
	{:else}
		<span class="text-xs text-dim">no sodium data</span>
	{/if}
{:else if p}
	<div bind:clientWidth={width}>
		{@render chart(p)}
	</div>
{/if}

<style>
	@media (prefers-reduced-motion: no-preference) {
		.draw {
			stroke-dasharray: 1;
			animation: draw 1.5s linear both;
		}
	}
	@keyframes draw {
		from {
			stroke-dashoffset: 1;
		}
		to {
			stroke-dashoffset: 0;
		}
	}
</style>
