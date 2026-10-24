import { error } from '@sveltejs/kit';
import { readTownFile, readTowns } from '#lib/server/data.js';
import type { EntryGenerator, PageServerLoad } from './$types';

// The crawler cannot find town pages: search options are not links.
export const entries: EntryGenerator = async () =>
	(await readTowns()).map(({ slug }) => ({ slug }));

export const load: PageServerLoad = async ({ params }) => {
	const town = (await readTowns()).find((t) => t.slug === params.slug);
	if (!town) error(404, 'Town not found');
	return { town, wells: (await readTownFile(town.slug)).wells };
};
