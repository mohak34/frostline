import { describe, expect, it } from 'vitest';
import { count, fixed1, mgl, pct, percentOf, titleCase, trendLabel } from '#lib/format.js';

describe('titleCase', () => {
	it('title-cases each word of an upper-case town name', () => {
		expect(titleCase('NORTH ATTLEBOROUGH')).toBe('North Attleborough');
	});
});

describe('fixed1', () => {
	it('rounds halves away from zero despite binary noise', () => {
		expect(fixed1(1.45)).toBe('1.5');
		expect(fixed1(6.25)).toBe('6.3');
	});

	it('keeps a trailing .0 on whole numbers', () => {
		expect(fixed1(122)).toBe('122.0');
	});
});

describe('missing values', () => {
	it('shows n/a for null with no unit or percent sign', () => {
		expect(pct(null)).toBe('n/a');
		expect(mgl(null)).toBe('n/a');
	});

	it('gives null for a percentage of zero', () => {
		expect(percentOf(0, 0)).toBeNull();
	});
});

describe('pct', () => {
	it('appends % directly after one decimal place', () => {
		expect(pct(percentOf(856, 2974))).toBe('28.8%');
	});
});

describe('count', () => {
	it('groups thousands with commas', () => {
		expect(count(856)).toBe('856');
		expect(count(5672)).toBe('5,672');
	});
});

describe('trendLabel', () => {
	it('reads insufficient as not enough data', () => {
		expect(trendLabel('insufficient')).toBe('not enough data');
		expect(trendLabel('rising')).toBe('rising');
	});
});
