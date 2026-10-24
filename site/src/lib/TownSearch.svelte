<!--
	Town search combobox (WAI-ARIA combobox pattern). Focus stays on the input; the arrow
	keys move the active option. Enter, a click, the Check button, or a suggestion calls onpick.
	Towns with no public wells come with wells 0 so people still get an answer for them.
-->
<script lang="ts">
	import Icon from '#lib/Icon.svelte';
	import { titleCase } from '#lib/format.js';
	import { matchTowns, nextIndex } from '#lib/search.js';
	import type { Town } from '#lib/types.js';

	let {
		towns,
		onpick,
		suggest = [],
		compact = false
	}: {
		towns: Town[];
		onpick: (town: Town) => void;
		suggest?: string[];
		/** Header size: no Check button, quieter border. */
		compact?: boolean;
	} = $props();
	const uid = $props.id();

	let text = $state('');
	// -1: no active option
	let active = $state(-1);
	// Set by Escape, blur, and a pick; cleared by typing.
	let dismissed = $state(false);
	const matches = $derived(matchTowns(towns, text));
	const query = $derived(text.trim().toLowerCase());
	const open = $derived(query !== '' && !dismissed);
	const suggestions = $derived(
		suggest.flatMap((slug) => towns.find((t) => t.slug === slug) ?? [])
	);

	function pick(town: Town | undefined): void {
		if (!town) return;
		text = titleCase(town.name);
		dismissed = true;
		active = -1;
		onpick(town);
	}

	function dismiss(): void {
		dismissed = true;
		active = -1;
	}

	function onkeydown(event: KeyboardEvent): void {
		switch (event.key) {
			case 'ArrowDown':
			case 'ArrowUp':
				event.preventDefault();
				if (dismissed) dismissed = false;
				else if (matches.length > 0)
					active = nextIndex(active, matches.length, event.key === 'ArrowDown' ? 1 : -1);
				return;
			case 'Escape':
				if (open) dismiss();
				return;
		}
	}

	// Splits name around the first case-insensitive match of the query, for highlighting.
	function parts(name: string): [string, string, string] {
		const i = name.toLowerCase().indexOf(query);
		return i < 0 ? [name, '', ''] : [name.slice(0, i), name.slice(i, i + query.length), name.slice(i + query.length)];
	}
</script>

<div class={compact ? 'w-full' : 'max-w-[480px]'}>
	<div class="relative">
		<form
			class={[
				'flex',
				compact
					? 'border border-line focus-within:border-amber'
					: 'border-2 border-amber focus-within:border-hot'
			]}
			onsubmit={(e) => {
				e.preventDefault();
				pick(matches[active] ?? matches[0]);
			}}
		>
			<label class={['flex min-w-0 flex-1 items-center', compact ? 'gap-2 px-2.5' : 'gap-2.5 px-3.5']}>
				<Icon name="search" class="text-amber" size={compact ? 18 : 22} />
				<input
					type="text"
					role="combobox"
					aria-label="Your town"
					autocomplete="off"
					spellcheck="false"
					aria-autocomplete="list"
					aria-expanded={open}
					aria-controls="{uid}-listbox"
					aria-activedescendant={open && active >= 0 ? `${uid}-option-${active}` : undefined}
					placeholder={compact ? 'Find a town' : 'Your town'}
					class={[
						'min-w-0 flex-1 bg-transparent placeholder:font-medium placeholder:text-[#6d6556] focus:outline-none',
						compact ? 'py-1.5 text-[15px]' : 'py-3 text-xl font-semibold'
					]}
					bind:value={text}
					oninput={() => {
						dismissed = false;
						active = -1;
					}}
					{onkeydown}
					onblur={dismiss}
				/>
			</label>
			{#if !compact}
				<button class="cursor-pointer bg-amber px-5 text-[17px] font-extrabold text-black hover:bg-hot">
					Check
				</button>
			{/if}
		</form>
		<ul
			id="{uid}-listbox"
			role="listbox"
			aria-label="Towns"
			hidden={!open}
			class={[
				'absolute top-full right-0 z-30 bg-black text-sm text-dim',
				compact ? 'w-[min(420px,90vw)] border border-line' : 'left-0 border-2 border-t-0 border-amber'
			]}
		>
			{#each matches as town, i (town.slug)}
				{@const [before, hit, after] = parts(titleCase(town.name))}
				<!-- svelte-ignore a11y_click_events_have_key_events a11y_interactive_supports_focus -->
				<li
					id="{uid}-option-{i}"
					role="option"
					aria-selected={i === active}
					class={[
						'grid cursor-pointer grid-cols-[minmax(0,1fr)_auto_56px_38px] items-center gap-3 px-3.5 py-2.5',
						i === active && 'bg-[#1c1408]'
					]}
					onpointerdown={(event) => event.preventDefault()}
					onclick={() => pick(town)}
				>
					<span class={['truncate text-[17px]', i === active ? 'text-white' : 'text-soft']}
						>{before}<b class="font-extrabold text-white">{hit}</b>{after}</span
					>
					{#if town.wells > 0}
						<span>{town.wells} {town.wells === 1 ? 'well' : 'wells'}</span>
						<span class="h-1.5 bg-ember" title="Wells with sodium rising">
							<i class="block h-full bg-amber" style:width="{town.pct_rising ?? 0}%"></i>
						</span>
						<span class="text-right text-amber tabular-nums">
							{town.pct_rising === null ? 'n/a' : `${Math.round(town.pct_rising)}%`}
						</span>
					{:else}
						<span class="col-span-3">no public wells</span>
					{/if}
				</li>
			{:else}
				<li class="px-3.5 py-2.5">No Massachusetts town matches "{text.trim()}".</li>
			{/each}
		</ul>
	</div>
	{#if suggestions.length > 0}
		<p class="mt-2.5 text-sm text-dim">
			Try
			{#each suggestions as town, i (town.slug)}
				{i === 0 ? '' : i === suggestions.length - 1 ? ' or ' : ', '}<button
					type="button"
					class="cursor-pointer text-soft underline decoration-[#6d6556] underline-offset-3 hover:text-white hover:decoration-amber"
					onclick={() => pick(town)}>{titleCase(town.name)}</button
				>
			{/each}
		</p>
	{/if}
</div>
