<!-- Material Symbols Outlined, 24 px grid, inline so no icon font loads. -->
<script lang="ts" module>
	const PATHS = {
		search:
			'M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z',
		chevron_right: 'M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z',
		play_arrow: 'M320-200v-560l440 280-440 280Zm80-280Zm0 134 210-134-210-134v268Z',
		pause:
			'M520-200v-560h240v560H520Zm-320 0v-560h240v560H200Zm400-80h80v-400h-80v400Zm-320 0h80v-400h-80v400Zm0-400v400-400Zm320 0v400-400Z',
		replay:
			'M480-80q-75 0-140.5-28.5t-114-77q-48.5-48.5-77-114T120-440h80q0 117 81.5 198.5T480-160q117 0 198.5-81.5T760-440q0-117-81.5-198.5T480-720h-6l62 62-56 58-160-160 160-160 56 58-62 62h6q75 0 140.5 28.5t114 77q48.5 48.5 77 114T840-440q0 75-28.5 140.5t-77 114q-48.5 48.5-114 77T480-80Z',
		arrow_back: 'm313-440 224 224-57 56-320-320 320-320 57 56-224 224h487v80H313Z',
		water_drop:
			'M491-200q12-1 20.5-9.5T520-230q0-14-9-22.5t-23-7.5q-41 3-87-22.5T343-375q-2-11-10.5-18t-19.5-7q-14 0-23 10.5t-6 24.5q17 91 80 130t127 35ZM480-80q-137 0-228.5-94T160-408q0-100 79.5-217.5T480-880q161 137 240.5 254.5T800-408q0 140-91.5 234T480-80Z'
	};
	export type IconName = keyof typeof PATHS;
</script>

<script lang="ts">
	let { name, size = 22, class: cls }: { name: IconName; size?: number; class?: string } =
		$props();
</script>

<svg
	aria-hidden="true"
	class={['shrink-0', cls]}
	viewBox="0 -960 960 960"
	width={size}
	height={size}
	fill="currentColor"
>
	<path d={PATHS[name]} />
</svg>
