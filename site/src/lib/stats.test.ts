import { describe, expect, it } from 'vitest';
import { overByYear } from '#lib/stats.js';
import type { Sample, TownFile, Well } from '#lib/types.js';

const well = (samples: Sample[]): Well => ({
	id: samples[0]?.date ?? 'none',
	name: 'W',
	system: 'S',
	class: 'COM',
	raw_or_finished: 'R',
	sodium: { samples, trend: 'insufficient', slope: null, latest: null, watch: false },
	chloride: { samples: [], trend: 'insufficient', slope: null, latest: null }
});

describe('overByYear', () => {
	it("uses each well's latest sample in the ten years up to the year", () => {
		const file: TownFile = {
			town: 'T',
			wells: [
				well([
					{ date: '2000-05-01', value: 10 },
					{ date: '2004-05-01', value: 30 }
				]),
				well([{ date: '2003-01-01', value: 25 }])
			]
		};
		// 1999: no samples. 2000: one well, under. 2003: both, one over. 2004: both over.
		// 2013: only the 2004 sample is in the window. 2014: nothing left.
		expect(overByYear(file, 1999, 2000)).toEqual([null, 0]);
		expect(overByYear(file, 2003, 2004)).toEqual([50, 100]);
		expect(overByYear(file, 2013, 2014)).toEqual([100, null]);
	});
});
