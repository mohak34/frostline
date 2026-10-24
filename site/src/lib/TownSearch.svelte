<!--
	Town search combobox (WAI-ARIA combobox pattern). Focus stays on the input; the arrow
	keys move the active option, Enter or a click goes to that town's page.
-->
<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { titleCase } from '#lib/format.js';
	import { matchTowns, nextIndex } from '#lib/search.js';

	let { towns }: { towns: { name: string; slug: string }[] } = $props();

	let text = $state('');
	// -1: no active option
	let active = $state(-1);
	// Set by Escape and blur, cleared by typing.
	let dismissed = $state(false);
	const matches = $derived(matchTowns(towns, text));
	const open = $derived(matches.length > 0 && !dismissed);
	const noMatch = $derived(text.trim() !== '' && matches.length === 0);

	function go(slug: string): void {
		goto(resolve('/town/[slug]', { slug }));
	}

	function dismiss(): void {
		dismissed = true;
		active = -1;
	}

	function onkeydown(event: KeyboardEvent): void {
		switch (event.key) {
			case 'ArrowDown':
			case 'ArrowUp':
				if (!open) return;
				event.preventDefault();
				active = nextIndex(active, matches.length, event.key === 'ArrowDown' ? 1 : -1);
				return;
			case 'Enter': {
				event.preventDefault();
				const town = matches[active] ?? matches[0];
				if (town) go(town.slug);
				return;
			}
			case 'Escape':
				if (open) dismiss();
				return;
		}
	}
</script>

<div>
	<label for="town-search" class="block">Find your town</label>
	<div class="relative max-w-sm">
		<input
			id="town-search"
			type="text"
			role="combobox"
			autocomplete="off"
			aria-autocomplete="list"
			aria-expanded={open}
			aria-controls="town-listbox"
			aria-activedescendant={active >= 0 ? `town-option-${active}` : undefined}
			class="w-full border border-dim px-2 py-1"
			bind:value={text}
			oninput={() => {
				dismissed = false;
				active = -1;
			}}
			{onkeydown}
			onblur={dismiss}
		/>
		<ul
			id="town-listbox"
			role="listbox"
			aria-label="Towns"
			hidden={!open}
			class="absolute inset-x-0 top-full z-10 border border-dim bg-black"
		>
			{#each matches as town, i (town.slug)}
				<!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus -->
				<li
					id="town-option-{i}"
					role="option"
					aria-selected={i === active}
					class={['cursor-pointer px-2 py-1', i === active && 'bg-white text-black']}
					onpointerdown={(event) => event.preventDefault()}
					onclick={() => go(town.slug)}
				>
					{titleCase(town.name)}
				</li>
			{/each}
		</ul>
	</div>
	<p role="status">{noMatch ? 'No matching town' : ''}</p>
</div>
