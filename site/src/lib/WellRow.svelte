<!--
	One Well_Table row plus the detail row that holds its Detail_Chart. Use inside a <tbody>,
	with index unique per table: it forms the detail row id that aria-controls points at.
-->
<script lang="ts">
	import Chart from '#lib/Chart.svelte';
	import { STROKE, type Chemical } from '#lib/chart.js';
	import { mgl, trendLabel } from '#lib/format.js';
	import type { Series, Well } from '#lib/types.js';

	let { well, index }: { well: Well; index: number } = $props();

	let open = $state(false);

	const detailId = $derived(`well-${index}-chart`);
	const legend = $derived<{ chemical: Chemical; name: string; series: Series }[]>([
		{ chemical: 'sodium', name: 'Sodium', series: well.sodium },
		{ chemical: 'chloride', name: 'Chloride', series: well.chloride }
	]);
</script>

<!--
	The button has no handler: its click, and the click that Enter or Space fires on it,
	bubbles here once, so every activation toggles exactly once.
-->
<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
<tr class="cursor-pointer border-b border-line hover:bg-[#0d0a05]" onclick={() => (open = !open)}>
	<td class="py-2 pr-4">
		<button
			type="button"
			class="flex cursor-pointer items-center gap-1 text-left"
			aria-expanded={open}
			aria-controls={detailId}
		>
			<svg
				aria-hidden="true"
				class={['shrink-0 text-amber transition-transform', open && 'rotate-90']}
				viewBox="0 -960 960 960"
				width="16"
				height="16"
				fill="currentColor"
			>
				<path d="M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z" />
			</svg>
			{well.name}
		</button>
	</td>
	<td class="py-2 pr-4">{well.system}</td>
	<td class="py-2 pr-4">{well.class}</td>
	<td class="py-2 pr-4">{mgl(well.sodium.latest)}</td>
	<td class={['py-2 pr-4', well.sodium.trend === 'rising' && 'font-semibold text-amber']}>
		{trendLabel(well.sodium.trend)}
	</td>
	<td class="py-2 pr-4 font-semibold text-hot">{well.sodium.watch ? 'watch' : ''}</td>
	<td class="py-2">
		<Chart variant="spark" series={[{ chemical: 'sodium', samples: well.sodium.samples }]} />
	</td>
</tr>
<tr id={detailId} class="border-b border-line" hidden={!open}>
	<td colspan="7" class="py-4">
		{#if open}
			<Chart
				variant="detail"
				series={legend.map(({ chemical, series }) => ({ chemical, samples: series.samples }))}
			/>
			<ul>
				{#each legend as { chemical, name, series } (chemical)}
					<li class="flex items-center gap-2">
						<svg aria-hidden="true" width="24" height="8" viewBox="0 0 24 8">
							<line
								x1="0"
								x2="24"
								y1="4"
								y2="4"
								stroke={STROKE[chemical].color}
								stroke-dasharray={STROKE[chemical].dash}
								stroke-width="1.5"
							/>
						</svg>
						{#if series.samples.length > 0}
							{name} latest {mgl(series.latest)} mg/L, {trendLabel(series.trend)}
						{:else}
							{name}: no {chemical} data
						{/if}
					</li>
				{/each}
			</ul>
		{/if}
	</td>
</tr>
