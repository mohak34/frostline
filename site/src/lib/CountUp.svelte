<!-- A count that runs up from 0 once after hydration. Prerendered HTML shows the final value. -->
<script lang="ts">
	import { cubicOut } from 'svelte/easing';
	import { prefersReducedMotion, Tween } from 'svelte/motion';
	import { count } from '#lib/format.js';

	let { value }: { value: number } = $props();

	const shown = Tween.of(() => value, { duration: 1100, easing: cubicOut });
	$effect(() => {
		if (prefersReducedMotion.current) return;
		shown.set(0, { duration: 0 });
		shown.set(value);
	});
</script>

{count(Math.round(shown.current))}
