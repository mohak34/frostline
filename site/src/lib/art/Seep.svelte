<!-- Salt on a road soaking down through the ground to the water table and a well. Use inside a reveal. -->
<svg viewBox="0 0 240 120" class="block h-auto w-full" aria-hidden="true" fill="none" stroke-linecap="round">
	<!-- road -->
	<path class="draw" pathLength="1" d="M4 28H172" stroke="#fff" stroke-width="2" />
	{#each [24, 46, 62, 84, 104, 126, 148] as x, i (x)}
		<circle class="fade" style:--delay="{0.3 + i * 0.07}s" cx={x} cy={20 - (i % 2) * 5} r="2" fill="#f2a93b" stroke="none" />
	{/each}
	<!-- soil layers -->
	<path class="draw" pathLength="1" style:--delay=".2s" d="M4 52Q60 48 120 53T236 50" stroke="#3a3122" stroke-width="1.5" />
	<path class="draw" pathLength="1" style:--delay=".3s" d="M4 74Q70 70 130 76T236 72" stroke="#3a3122" stroke-width="1.5" />
	<!-- salt soaking down -->
	{#each [40, 72, 104, 136] as x, i (x)}
		<path
			class="draw"
			pathLength="1"
			style:--delay="{0.8 + i * 0.12}s"
			style:--dur="1.4s"
			d="M{x} 32q-5 15 0 30t2 30"
			stroke="#f2a93b"
			stroke-width="1.5"
			opacity=".75"
		/>
	{/each}
	<!-- plume in the aquifer -->
	<ellipse class="fade" style:--delay="2s" cx="112" cy="100" rx="78" ry="10" fill="#f2a93b" fill-opacity=".28" stroke="none" />
	<!-- water table -->
	<path class="draw" pathLength="1" style:--delay=".4s" d="M4 96q12-4 24 0t24 0 24 0 24 0 24 0 24 0 24 0 24 0 24 0 24 0" stroke="#9a9a9a" stroke-width="1.5" />
	<!-- well casing -->
	<path class="draw" pathLength="1" style:--delay=".5s" d="M206 12V108M218 12V108M200 12H224" stroke="#fff" stroke-width="2" />
</svg>
