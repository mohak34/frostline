import { describe, expect, it } from 'vitest';
import { MAX_OPTIONS, matchTowns, nextIndex } from '#lib/search.js';

const names = (towns: { name: string }[]): string[] => towns.map((t) => t.name);

describe('matchTowns', () => {
	it('puts prefix matches before contains matches', () => {
		const towns = ['ANDOVER', 'NORTH ANDOVER', 'NORTHAMPTON', 'SANDWICH'].map((name) => ({ name }));
		expect(names(matchTowns(towns, 'and'))).toEqual(['ANDOVER', 'NORTH ANDOVER', 'SANDWICH']);
	});

	it('returns at most MAX_OPTIONS towns', () => {
		const towns = Array.from({ length: 10 }, (_, i) => ({ name: `TOWN ${i}` }));
		expect(matchTowns(towns, 'town')).toHaveLength(MAX_OPTIONS);
		expect(MAX_OPTIONS).toBe(8);
	});

	it('returns nothing for empty or blank text', () => {
		const towns = [{ name: 'ACTON' }];
		expect(matchTowns(towns, '')).toEqual([]);
		expect(matchTowns(towns, '   ')).toEqual([]);
	});
});

describe('nextIndex', () => {
	it('starts at either end and wraps', () => {
		expect(nextIndex(-1, 5, 1)).toBe(0);
		expect(nextIndex(-1, 5, -1)).toBe(4);
		expect(nextIndex(4, 5, 1)).toBe(0);
		expect(nextIndex(0, 5, -1)).toBe(4);
	});
});
