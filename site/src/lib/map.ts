import { asset } from '$app/paths';
import type { Town } from '#lib/types.js';

/** One static/data/map.json town, written by pipeline/map.py. */
export interface MapTown {
	s: string; // slug, same as towns.json
	n: string; // display name
	d: string; // SVG path in the map frame
}
export interface MapData {
	w: number;
	h: number;
	towns: MapTown[];
}

const cache = new Map<string, Promise<unknown>>();

function fetchOnce<T>(file: 'data/map.json' | 'data/towns.json'): Promise<T> {
	let p = cache.get(file);
	if (!p) {
		p = fetch(asset(file)).then((r) => {
			if (!r.ok) throw new Error(`${file}: HTTP ${r.status}`);
			return r.json();
		});
		cache.set(file, p);
	}
	return p as Promise<T>;
}

/**
 * Town borders, fetched in the browser once per visit. Kept out of page data so the ~90 KB of
 * paths are not inlined into every prerendered page.
 */
export const loadMap = (): Promise<MapData> => fetchOnce('data/map.json');

/** towns.json in the browser, for pages that color the map but do not load every town. */
export const loadTowns = (): Promise<Town[]> => fetchOnce('data/towns.json');

// Dark to light amber. LEGEND is the same ramp as a CSS gradient.
const AMBER = [
	[42, 29, 8],
	[138, 90, 20],
	[242, 169, 59],
	[255, 227, 168]
] as const;
export const LEGEND = 'linear-gradient(90deg, #2a1d08, #8a5a14, #f2a93b, #ffe3a8)';

/** Town with no public wells. */
export const NO_WELLS = '#0a0a0a';
/** Town with wells but no value for this measure. */
export const NO_DATA = '#14110b';

/** Color for share a in [0, 1]; values outside are clamped. */
export function ramp(a: number): string {
	const x = Math.max(0, Math.min(1, a)) * (AMBER.length - 1);
	const i = Math.min(AMBER.length - 2, Math.floor(x));
	const f = x - i;
	const [from, to] = [AMBER[i], AMBER[i + 1]];
	return `rgb(${from.map((v, k) => Math.round(v + (to[k] - v) * f)).join(',')})`;
}
