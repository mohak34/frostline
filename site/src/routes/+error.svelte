<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';

	const message = $derived(
		page.status === 404
			? page.url.pathname.startsWith('/town/')
				? 'Town not found'
				: 'Page not found'
			: `Error ${page.status}`
	);
</script>

<svelte:head>
	<title>{message} | Winter Water Watch</title>
</svelte:head>

<h1 class="text-xl font-bold">{message}</h1>
<p><a href={resolve('/')} class="underline">Back to the home page</a></p>
