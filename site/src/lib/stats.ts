import { percentOf } from '#lib/format.js';
import { GUIDELINE } from '#lib/chart.js';
import type { Sample, TownFile } from '#lib/types.js';

export interface Statewide {
	wells: number;
	trended: number;
	rising: number;
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
	return { wells, trended, rising, pctRising: percentOf(rising, trended) };
}

/**
 * Time_Lapse value for one town, per year from..to: the rounded share (0 to 100) of its wells
 * whose latest sodium sample in the ten years up to that year is over 20 mg/L.
 * null for a year where no well has a sample in its window.
 */
export function overByYear(file: TownFile, from: number, to: number): (number | null)[] {
	const out: (number | null)[] = [];
	for (let year = from; year <= to; year++) {
		let tested = 0;
		let over = 0;
		for (const well of file.wells) {
			let latest: Sample | undefined;
			for (const s of well.sodium.samples) {
				const y = Number(s.date.slice(0, 4));
				if (y > year - 10 && y <= year && (!latest || s.date >= latest.date)) latest = s;
			}
			if (!latest) continue;
			tested++;
			if (latest.value > GUIDELINE) over++;
		}
		out.push(tested === 0 ? null : Math.round((over / tested) * 100));
	}
	return out;
}
