<!-- Line drawing for one How_It_Works step. Use inside a reveal. -->
<script lang="ts">
	let { kind }: { kind: 'pull' | 'clean' | 'trend' | 'warn' } = $props();
</script>

<svg viewBox="0 0 96 64" class="block h-16 w-24" aria-hidden="true" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="2">
	{#if kind === 'pull'}
		<path class="draw" pathLength="1" d="M26 18V50Q48 60 70 50V18" stroke="#fff" />
		<ellipse class="draw" pathLength="1" cx="48" cy="18" rx="22" ry="7" stroke="#fff" />
		<path class="draw" pathLength="1" style:--delay=".3s" d="M26 34Q48 44 70 34" stroke="#3a3122" />
		<path class="draw" pathLength="1" style:--delay=".6s" d="M84 6V40M77 33l7 7 7-7" stroke="#f2a93b" />
	{:else if kind === 'clean'}
		{#each [[22, 6, '#3a3122'], [36, 4, '#fff'], [50, 7, '#3a3122'], [62, 4, '#fff'], [74, 6, '#fff']] as const as [x, y, c], i (x)}
			<circle class="fade" style:--delay="{i * 0.08}s" cx={x} cy={y} r="2.5" fill={c} stroke="none" />
		{/each}
		<path class="draw" pathLength="1" style:--delay=".3s" d="M14 16H82L56 38V54L40 60V38Z" stroke="#fff" />
		<circle class="fade" style:--delay="1.2s" cx="48" cy="62" r="2" fill="#f2a93b" stroke="none" />
	{:else if kind === 'trend'}
		{#each [[12, 52], [22, 46], [32, 50], [42, 38], [52, 40], [62, 28], [72, 30], [84, 16]] as [x, y], i (x)}
			<circle class="fade" style:--delay="{i * 0.06}s" cx={x} cy={y} r="2.5" fill="#fff" stroke="none" />
		{/each}
		<path class="draw" pathLength="1" style:--delay=".6s" d="M8 55L88 15" stroke="#f2a93b" stroke-width="2.5" />
	{:else}
		<path class="fade" d="M4 20H92" stroke="#f2a93b" stroke-width="1.5" stroke-dasharray="5 4" />
		<path class="draw" pathLength="1" style:--delay=".2s" d="M6 56L20 50L32 52L46 40L58 38" stroke="#fff" />
		<path class="fade" style:--delay="1s" d="M58 38L84 14" stroke="#fff" stroke-dasharray="3 4" />
		<circle class="fade" style:--delay="1.3s" cx="77" cy="20" r="4.5" fill="#ffd27a" stroke="#000" stroke-width="2" />
	{/if}
</svg>
