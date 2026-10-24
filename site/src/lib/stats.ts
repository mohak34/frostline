import { percentOf } from '#lib/format.js';
import type { TownFile } from '#lib/types.js';

export interface Statewide {
	wells: number;
	trended: number;
	pctRising: number | null; // percentOf(rising, trended); null when trended is 0
}

/** Statewide_Line numbers. A Trended_Well is one whose sodium trend is not `insufficient`. */
export function statewide(files: readonly TownFile[]): Statewide {
	let wells = 0;
	let trended = 0;
	let rising = 0;
	for (const file of files) {
		for (const well of file.wells) {
			wells++;
			const trend = well.sodium.trend;
			if (trend !== 'insufficient') trended++;
			if (trend === 'rising') rising++;
		}
	}
	return { wells, trended, pctRising: percentOf(rising, trended) };
}
