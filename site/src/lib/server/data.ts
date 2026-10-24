import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Backtest, Town, TownFile, Well } from '#lib/types.js';

// Relative to process.cwd(), which is site/ for build, check, and test. import.meta.url
// would point into .svelte-kit/output/ once bundled.
const DATA = join('static', 'data');

export const FEATURE_ID = '4239000|NO. PLYMOUTH GP WELL';

/** Reads and parses one JSON file. Errors name the path: "<path>: cannot read (...)" or "<path>: not valid JSON". */
export async function readJson(path: string): Promise<unknown> {
	let text: string;
	try {
		text = await readFile(path, 'utf8');
	} catch (e) {
		throw new Error(`${path}: cannot read (${e instanceof Error ? e.message : String(e)})`);
	}
	try {
		return JSON.parse(text);
	} catch {
		throw new Error(`${path}: not valid JSON`);
	}
}

// Town_List and Town_File shapes are trusted to the pipeline schema (pipeline/towns.py).
export async function readTowns(): Promise<Town[]> {
	return (await readJson(join(DATA, 'towns.json'))) as Town[];
}

export async function readTownFile(slug: string): Promise<TownFile> {
	return (await readJson(join(DATA, 'wells', `${slug}.json`))) as TownFile;
}

export async function readBacktest(): Promise<Backtest> {
	return parseBacktest(await readJson(join(DATA, 'backtest.json')));
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

/** Throws "backtest.json: missing or non-numeric field <name>" unless all six fields are number or null as typed. */
export function parseBacktest(value: unknown): Backtest {
	const record: Record<string, unknown> = isRecord(value) ? value : {};
	const fail = (name: keyof Backtest): never => {
		throw new Error(`backtest.json: missing or non-numeric field ${name}`);
	};
	const count = (name: keyof Backtest): number => {
		const v = record[name];
		return typeof v === 'number' ? v : fail(name);
	};
	const mae = (name: keyof Backtest): number | null => {
		const v = record[name];
		return typeof v === 'number' || v === null ? v : fail(name);
	};
	return {
		wells_tested: count('wells_tested'),
		mae_baseline: mae('mae_baseline'),
		mae_rule: mae('mae_rule'),
		crossed: count('crossed'),
		caught: count('caught'),
		false_alarms: count('false_alarms')
	};
}

/** The Feature_Well in a Town_File. Throws a message containing FEATURE_ID if it is absent or has no sodium samples. */
export function featureWell(file: TownFile): Well {
	const well = file.wells.find((w) => w.id === FEATURE_ID);
	if (!well) throw new Error(`Feature well ${FEATURE_ID}: not found in ${file.town}`);
	if (well.sodium.samples.length === 0) {
		throw new Error(`Feature well ${FEATURE_ID}: no sodium samples`);
	}
	return well;
}
