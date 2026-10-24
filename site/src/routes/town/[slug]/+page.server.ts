import { error } from '@sveltejs/kit';
import { readEveryTown, readTownFile } from '#lib/server/data.js';
import type { EntryGenerator, PageServerLoad } from './$types';

// The crawler cannot find town pages: search options are not links.
export const entries: EntryGenerator = async () =>
	(await readEveryTown()).map(({ slug }) => ({ slug }));

// Towns with no public wells get a page too, with no wells and no town file.
export const load: PageServerLoad = async ({ params }) => {
	const town = (await readEveryTown()).find((t) => t.slug === params.slug);
	if (!town) error(404, 'Town not found');
	return { town, wells: town.wells === 0 ? [] : (await readTownFile(town.slug)).wells };
};
