import { count, fixed1 } from '#lib/format.js';
import type { Sample } from '#lib/types.js';

/** MassDEP sodium guideline in mg/L, drawn as the Guideline_Line. */
export const GUIDELINE = 20;
export type Chemical = 'sodium' | 'chloride';

export interface PlotSeries {
	chemical: Chemical;
	samples: readonly Sample[];
}
export interface Frame {
	width: number;
	height: number;
	margin: { top: number; right: number; bottom: number; left: number };
}
export interface Tick {
	pos: number;
	label: string;
}
export interface Point {
	x: number;
	y: number;
}
export interface PlottedSeries {
	chemical: Chemical;
	points: Point[]; // one per sample, in date order
	d: string | null; // SVG path through points; null when there is one point
}
export interface Plot {
	left: number; // plot area in px
	right: number;
	top: number;
	bottom: number;
	series: PlottedSeries[]; // only series with samples
	guidelineY: number;
	xTicks: Tick[]; // year labels
	yTicks: Tick[]; // mg/L labels, first is 0
}

/** "YYYY-MM-DD" to UTC milliseconds. Date-only ISO strings parse as UTC, not local time. */
export function dayMs(date: string): number {
	return Date.parse(date);
}

/** Linear map from [d0, d1] to [r0, r1]. When d0 === d1, every value maps to the middle of the range. */
export function linear(d0: number, d1: number, r0: number, r1: number): (v: number) => number {
	if (d0 === d1) {
		const mid = (r0 + r1) / 2;
		return () => mid;
	}
	const k = (r1 - r0) / (d1 - d0);
	return (v) => r0 + (v - d0) * k;
}

/**
 * Smallest 1, 2, or 5 x 10^k step giving at most `target` steps up to max; top is max rounded up to a step.
 * max must be positive.
 */
export function niceTop(max: number, target: number): { top: number; step: number } {
	const mag = 10 ** Math.floor(Math.log10(max / target));
	// 10 * mag always fits, because max / target <= 10 * mag.
	const step = [mag, 2 * mag, 5 * mag].find((s) => Math.ceil(max / s) <= target) ?? 10 * mag;
	return { top: Math.ceil(max / step) * step, step };
}

const YEAR_STEPS = [1, 2, 5, 10, 20, 50, 100];

/**
 * Year labels at January 1, using the smallest step in [1, 2, 5, 10, 20, 50, 100] years
 * that gives between 1 and maxCount labels. If no January 1 falls inside [t0, t1], all
 * dates are in one calendar year, so the result is one label with that year at the middle.
 * If no step fits (maxCount 1, or a span over 100 x maxCount years), the result is one
 * label at the first January 1.
 */
export function yearTicks(
	t0: number,
	t1: number,
	x: (t: number) => number,
	maxCount: number
): Tick[] {
	const y0 = new Date(t0).getUTCFullYear();
	const first = Date.UTC(y0, 0, 1) === t0 ? y0 : y0 + 1;
	const last = new Date(t1).getUTCFullYear();
	if (first > last) return [{ pos: x((t0 + t1) / 2), label: String(y0) }];

	const tick = (year: number): Tick => ({ pos: x(Date.UTC(year, 0, 1)), label: String(year) });
	for (const step of YEAR_STEPS) {
		const start = Math.ceil(first / step) * step;
		const n = Math.floor((last - start) / step) + 1;
		if (n >= 1 && n <= maxCount) return Array.from({ length: n }, (_, i) => tick(start + i * step));
	}
	return [tick(first)];
}

/** Stable, so samples on the same date keep their order and the last one is the series' latest. */
function inDateOrder(samples: readonly Sample[]): Sample[] {
	return samples.toSorted((a, b) => dayMs(a.date) - dayMs(b.date));
}

const tenth = (v: number): number => Math.round(v * 10) / 10;

/** Geometry for one chart. Returns null when no series has samples. */
export function plot(series: readonly PlotSeries[], frame: Frame, minLabelGap: number): Plot | null {
	const kept = series
		.filter((s) => s.samples.length > 0)
		.map((s) => ({ chemical: s.chemical, samples: inDateOrder(s.samples) }));
	if (kept.length === 0) return null;

	const { width, height, margin } = frame;
	const left = margin.left;
	const right = width - margin.right;
	const top = margin.top;
	const bottom = height - margin.bottom;

	const all = kept.flatMap((s) => s.samples);
	const times = all.map((p) => dayMs(p.date));
	const t0 = Math.min(...times);
	const t1 = Math.max(...times);
	const x = linear(t0, t1, left, right);

	const { top: yMax, step } = niceTop(Math.max(GUIDELINE, ...all.map((p) => p.value)), 4);
	const y = linear(0, yMax, bottom, top);

	const plotted = kept.map(({ chemical, samples }): PlottedSeries => {
		const points = samples.map((p) => ({ x: x(dayMs(p.date)), y: y(p.value) }));
		const d =
			points.length > 1 ? `M ${points.map((p) => `${tenth(p.x)} ${tenth(p.y)}`).join(' L ')}` : null;
		return { chemical, points, d };
	});

	const yTicks = Array.from({ length: Math.round(yMax / step) + 1 }, (_, i) => ({
		pos: y(i * step),
		label: String(i * step)
	}));
	const maxCount = Math.max(1, Math.floor((right - left) / minLabelGap));

	return {
		left,
		right,
		top,
		bottom,
		series: plotted,
		guidelineY: y(GUIDELINE),
		xTicks: yearTicks(t0, t1, x, maxCount),
		yTicks
	};
}

const NAMES: Record<Chemical, string> = { sodium: 'Sodium', chloride: 'Chloride' };

/** Accessible name, e.g. "Sodium: 11 samples, first 1993-06-23 7.7 mg/L, latest 2026-01-15 127.0 mg/L." One clause per plotted chemical. */
export function chartLabel(series: readonly PlotSeries[]): string {
	return series
		.flatMap(({ chemical, samples }) => {
			const sorted = inDateOrder(samples);
			const first = sorted.at(0);
			const last = sorted.at(-1);
			if (!first || !last) return [];
			const n = sorted.length;
			return [
				`${NAMES[chemical]}: ${count(n)} ${n === 1 ? 'sample' : 'samples'}, ` +
					`first ${first.date} ${fixed1(first.value)} mg/L, latest ${last.date} ${fixed1(last.value)} mg/L.`
			];
		})
		.join(' ');
}

/** Stroke color and dash pattern shared by charts and legends. The three dash patterns all differ. */
export const STROKE: Record<Chemical | 'guideline', { color: string; dash: string | null }> = {
	sodium: { color: '#ffffff', dash: null },
	chloride: { color: '#8fb3c9', dash: '2 3' },
	guideline: { color: '#f2a93b', dash: '6 4' }
};
