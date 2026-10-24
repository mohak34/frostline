<!-- Raw lab rows turned into one trend line. Use inside a reveal. -->
<script lang="ts">
	// Noisy rising series in the chart area, x 132..228, y 98..26.
	const DOTS = [
		[134, 96],
		[143, 90],
		[151, 93],
		[160, 82],
		[169, 84],
		[178, 70],
		[187, 74],
		[196, 58],
		[205, 60],
		[214, 46],
		[224, 38]
	] as const;
</script>

<svg viewBox="0 0 240 120" class="block h-auto w-full" aria-hidden="true" fill="none" stroke-linecap="round">
	{#each [0, 1, 2, 3, 4, 5, 6] as i (i)}
		<path class="fade" style:--delay="{i * 0.06}s" d="M4 {18 + i * 14}h18M30 {18 + i * 14}h{28 + ((i * 7) % 12)}M70 {18 + i * 14}h16" stroke={i === 0 ? '#9a9a9a' : '#3a3122'} stroke-width="3" />
	{/each}
	<path class="draw" pathLength="1" style:--delay=".5s" d="M96 60H114M108 54l6 6-6 6" stroke="#fff" stroke-width="1.5" />
	<path class="draw" pathLength="1" style:--delay=".6s" d="M126 12V106H236" stroke="#3a3122" stroke-width="1.5" />
	{#each DOTS as [x, y], i (x)}
		<circle class="fade" style:--delay="{0.8 + i * 0.05}s" cx={x} cy={y} r="2.5" fill="#fff" stroke="none" />
	{/each}
	<path class="draw" pathLength="1" style:--delay="1.5s" d="M132 98L228 34" stroke="#f2a93b" stroke-width="2.5" />
</svg>
