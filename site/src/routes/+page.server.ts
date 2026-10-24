import { FEATURE_ID, featureWell, readTownFile, readTowns } from '#lib/server/data.js';
import { statewide } from '#lib/stats.js';
import type { PageServerLoad } from './$types';

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

	return {
		towns: towns.map(({ name, slug }) => ({ name, slug })),
		statewide: stats,
		feature: { name: feature.name, system: feature.system, samples: feature.sodium.samples }
	};
};
