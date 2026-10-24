import { describe, expect, it } from 'vitest';
import { chartLabel, dayMs, linear, plot, type Frame, type PlotSeries } from '#lib/chart.js';

const margin = { top: 20, right: 64, bottom: 24, left: 44 };
const home: Frame = { width: 640, height: 280, margin };
const GAP = 56;

const feature: PlotSeries = {
	chemical: 'sodium',
	samples: [
		{ date: '2010-03-01', value: 60 },
		{ date: '1993-06-23', value: 7.73 },
		{ date: '2026-01-15', value: 127 }
	]
};
const low: PlotSeries = {
	chemical: 'sodium',
	samples: [
		{ date: '2001-05-01', value: 3.2 },
		{ date: '2005-01-01', value: 7.73 }
	]
};

describe('plot y axis', () => {
	it.each([
		[20, low],
		[127, feature]
	])('spans from 0 at the bottom to at least %i', (atLeast, series) => {
		const p = plot([series], home, GAP);
		expect(p).not.toBeNull();
		if (!p) return;
		const first = p.yTicks.at(0);
		const last = p.yTicks.at(-1);
		expect(first).toEqual({ pos: p.bottom, label: '0' });
		expect(Number(last?.label)).toBeGreaterThanOrEqual(atLeast);
		expect(last?.pos).toBeCloseTo(p.top);
	});
});

describe('plot x axis', () => {
	it('centers samples that all share one date', () => {
		const p = plot(
			[
				{
					chemical: 'chloride',
					samples: [
						{ date: '2005-03-01', value: 10 },
						{ date: '2005-03-01', value: 30 }
					]
				}
			],
			home,
			GAP
		);
		const xs = p?.series.flatMap((s) => s.points.map((pt) => pt.x));
		expect(xs).toEqual([310, 310]);
		expect(p?.xTicks).toEqual([{ pos: 310, label: '2005' }]);
	});

	it('puts every year label at January 1 inside the plot', () => {
		const p = plot([feature], home, GAP);
		expect(p).not.toBeNull();
		if (!p) return;
		const x = linear(dayMs('1993-06-23'), dayMs('2026-01-15'), p.left, p.right);
		expect(p.xTicks.length).toBeGreaterThanOrEqual(3);
		for (const t of p.xTicks) {
			expect(t.pos).toBeCloseTo(x(dayMs(`${t.label}-01-01`)));
			expect(t.pos).toBeGreaterThanOrEqual(p.left);
			expect(t.pos).toBeLessThanOrEqual(p.right);
		}

		const narrow = plot([feature], { width: 320, height: 280, margin }, GAP);
		expect(narrow?.xTicks.map((t) => t.label)).toEqual(['2000', '2010', '2020']);
	});
});

describe('plot series', () => {
	it('draws no line for one sample and drops empty series', () => {
		const p = plot(
			[
				{ chemical: 'sodium', samples: [{ date: '2001-01-01', value: 5 }] },
				{ chemical: 'chloride', samples: [] }
			],
			home,
			GAP
		);
		expect(p?.series.map((s) => [s.chemical, s.points.length, s.d])).toEqual([['sodium', 1, null]]);
		expect(plot([{ chemical: 'sodium', samples: [] }], home, GAP)).toBeNull();
	});
});

describe('chartLabel', () => {
	it('names first and latest sample in date order, skipping empty series', () => {
		expect(chartLabel([feature, { chemical: 'chloride', samples: [] }])).toBe(
			'Sodium: 3 samples, first 1993-06-23 7.7 mg/L, latest 2026-01-15 127.0 mg/L.'
		);
	});
});
