import {
	FEATURE_ID,
	featureWell,
	readBacktest,
	readEveryTown,
	readTownFile,
	readTowns
} from '#lib/server/data.js';
import { overByYear, statewide } from '#lib/stats.js';
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

	let lastYear = LAPSE_FROM;
	for (const s of files.flatMap((f) => f.wells.flatMap((w) => w.sodium.samples))) {
		lastYear = Math.max(lastYear, Number(s.date.slice(0, 4)));
	}
	const years = Object.fromEntries(
		files.map((f, i) => [towns[i].slug, overByYear(f, LAPSE_FROM, lastYear)])
	);

	return {
		towns: await readEveryTown(),
		statewide: stats,
		feature: { name: feature.name, system: feature.system, samples: feature.sodium.samples },
		lapse: { from: LAPSE_FROM, years },
		backtest: await readBacktest()
	};
};
