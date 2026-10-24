import { pct, percentOf, tenths } from '#lib/format.js';
import type { Backtest } from '#lib/types.js';

/** caught / crossed * 100, or null when crossed is 0. */
export function caughtShare(b: Backtest): number | null {
	return percentOf(b.caught, b.crossed);
}

/**
 * Meaning sentence, or null when it would hold neither part (Req 13.10).
 * MAEs are compared in tenths, the precision shown on the page.
 */
export function meaning(b: Backtest): string | null {
	let error: string | null = null;
	if (b.mae_rule !== null && b.mae_baseline !== null) {
		const rule = tenths(b.mae_rule);
		const baseline = tenths(b.mae_baseline);
		const word = rule < baseline ? 'smaller than' : rule === baseline ? 'equal to' : 'larger than';
		error = `Our rule's median error was ${word} carrying the last value forward`;
	}

	const share = caughtShare(b);
	const caught = share === null ? null : `caught ${pct(share)} of wells that crossed 20 mg/L`;

	if (error !== null && caught !== null) return `${error}, and it ${caught}.`;
	if (error !== null) return `${error}.`;
	if (caught !== null) return `Our rule ${caught}.`;
	return null;
}
