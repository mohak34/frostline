import { join } from 'node:path';
import {
	FEATURE_ID,
	featureWell,
	readBacktest,
	readJson,
	readTownFile,
	readTowns
} from '#lib/server/data.js';
import type { MapData } from '#lib/map.js';
import { overByYear, statewide } from '#lib/stats.js';
import type { Town } from '#lib/types.js';
import type { PageServerLoad } from './$types';

/** First year of the Time_Lapse. Earlier years have too few tests to color most towns. */
const LAPSE_FROM = 1995;

export const load: PageServerLoad = async () => {
	// First, so a missing plymouth.json fails with both the Feature_Well id and the slug.
	const plymouth = await readTownFile('plymouth').catch((e: unknown) => {
		throw new Error(`Feature well ${FEATURE_ID}: ${e instanceof Error ? e.message : String(e)}`);
	});
	const feature = featureWell(plymouth);

	const towns = await readTowns();
	const files = await Promise.all(towns.map(({ slug }) => readTownFile(slug)));

	const stats = statewide(files);
	const sum = towns.reduce((n, t) => n + t.wells, 0);
	if (stats.wells !== sum) {
		throw new Error(`statewide well count ${stats.wells} != towns.json sum ${sum}`);
	}

	// Map towns missing from towns.json have no public wells; search still answers for them.
	const map = (await readJson(join('static', 'data', 'map.json'))) as MapData;
	const known = new Set(towns.map((t) => t.slug));
	const dry: Town[] = map.towns
		.filter((t) => !known.has(t.s))
		.map((t) => ({ name: t.n.toUpperCase(), slug: t.s, wells: 0, pct_rising: null, pct_over_20: null }));

	let lastYear = LAPSE_FROM;
	for (const s of files.flatMap((f) => f.wells.flatMap((w) => w.sodium.samples))) {
		lastYear = Math.max(lastYear, Number(s.date.slice(0, 4)));
	}
	const years = Object.fromEntries(
		files.map((f, i) => [towns[i].slug, overByYear(f, LAPSE_FROM, lastYear)])
	);

	return {
		towns: [...towns, ...dry].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)),
		statewide: stats,
		feature: { name: feature.name, system: feature.system, samples: feature.sodium.samples },
		lapse: { from: LAPSE_FROM, years },
		backtest: await readBacktest()
	};
};
