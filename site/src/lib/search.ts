export const MAX_OPTIONS = 8;

/**
 * Towns whose name contains text.trim(), ignoring case. Prefix matches come first;
 * each group is sorted by name in code-unit order (the same order as towns.json). At most 8.
 * Returns [] when the trimmed text is empty.
 */
export function matchTowns<T extends { name: string }>(towns: readonly T[], text: string): T[] {
	const query = text.trim().toLowerCase();
	if (query === '') return [];
	const prefix: T[] = [];
	const contains: T[] = [];
	for (const town of towns) {
		const name = town.name.toLowerCase();
		if (name.startsWith(query)) prefix.push(town);
		else if (name.includes(query)) contains.push(town);
	}
	const byName = (a: T, b: T): number => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
	return [...prefix.sort(byName), ...contains.sort(byName)].slice(0, MAX_OPTIONS);
}

/** Next active option index. From -1 (none), step 1 gives 0 and step -1 gives count - 1. Wraps at both ends. */
export function nextIndex(current: number, count: number, step: 1 | -1): number {
	if (current < 0) return step === 1 ? 0 : count - 1;
	return (current + step + count) % count;
}
