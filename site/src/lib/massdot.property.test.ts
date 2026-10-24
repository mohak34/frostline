import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { evaluate, CHLORIDE_LINE, SODIUM_LINE } from './massdot';
import type { Diet } from './massdot';

const diet = (): fc.Arbitrary<Diet> =>
	fc.constantFrom<Diet>('none', 'under1000', 'under2000');

// Any non-negative finite number, or null.
const amount = (): fc.Arbitrary<number | null> =>
	fc.oneof(fc.float({ min: 0, max: 1000, noNaN: true }), fc.constant(null));

describe('evaluate – properties', () => {
	it('chloride >= 250 always triggers chloride', () => {
		fc.assert(
			fc.property(
				amount(),
				fc.float({ min: CHLORIDE_LINE, max: 2000, noNaN: true }),
				diet(),
				(sodium, chloride, d) => {
					const r = evaluate(sodium, chloride, d);
					expect(r.kind).toBe('met');
					if (r.kind === 'met') expect(r.triggers).toContain('chloride');
				}
			)
		);
	});

	it('diet none never adds a sodium trigger', () => {
		fc.assert(
			fc.property(amount(), amount(), (sodium, chloride) => {
				const r = evaluate(sodium, chloride, 'none');
				if (r.kind === 'met') {
					expect(r.triggers).not.toContain('sodium1000');
					expect(r.triggers).not.toContain('sodium2000');
				}
			})
		);
	});

	it('raising sodium never removes an existing trigger', () => {
		fc.assert(
			fc.property(
				fc.float({ min: 0, max: 500, noNaN: true }),
				fc.float({ min: 0, max: 500, noNaN: true }),
				amount(),
				diet(),
				(sodiumLow, extra, chloride, d) => {
					const sodiumHigh = sodiumLow + extra;
					const rLow = evaluate(sodiumLow, chloride, d);
					const rHigh = evaluate(sodiumHigh, chloride, d);
					// Every trigger present in the low-sodium result must still be present.
					if (rLow.kind === 'met' && rHigh.kind === 'met') {
						for (const t of rLow.triggers) {
							expect(rHigh.triggers).toContain(t);
						}
					}
				}
			)
		);
	});

	it('sodium > 20 with under1000 triggers sodium1000', () => {
		// fc.float requires 32-bit float bounds; use Math.fround to stay in f32 range.
		const minSodium1000 = Math.fround(SODIUM_LINE.under1000 + 0.1);
		fc.assert(
			fc.property(
				fc.float({ min: minSodium1000, max: Math.fround(2000), noNaN: true }),
				amount(),
				(sodium, chloride) => {
					const r = evaluate(sodium, chloride, 'under1000');
					expect(r.kind).toBe('met');
					if (r.kind === 'met') expect(r.triggers).toContain('sodium1000');
				}
			)
		);
	});

	it('sodium > 40 with under2000 triggers sodium2000', () => {
		const minSodium2000 = Math.fround(SODIUM_LINE.under2000 + 0.1);
		fc.assert(
			fc.property(
				fc.float({ min: minSodium2000, max: Math.fround(2000), noNaN: true }),
				amount(),
				(sodium, chloride) => {
					const r = evaluate(sodium, chloride, 'under2000');
					expect(r.kind).toBe('met');
					if (r.kind === 'met') expect(r.triggers).toContain('sodium2000');
				}
			)
		);
	});

	it('both chloride and sodium triggers fire together when both thresholds are crossed', () => {
		const minCl = Math.fround(CHLORIDE_LINE);
		const minNa = Math.fround(SODIUM_LINE.under1000 + 0.1);
		fc.assert(
			fc.property(
				fc.float({ min: minCl, max: Math.fround(2000), noNaN: true }),
				fc.float({ min: minNa, max: Math.fround(2000), noNaN: true }),
				(chloride, sodium) => {
					const r = evaluate(sodium, chloride, 'under1000');
					expect(r.kind).toBe('met');
					if (r.kind === 'met') {
						expect(r.triggers).toContain('chloride');
						expect(r.triggers).toContain('sodium1000');
					}
				}
			)
		);
	});

	it('result is missing only when no trigger is met and at least one input is null', () => {
		fc.assert(
			fc.property(amount(), amount(), diet(), (sodium, chloride, d) => {
				const r = evaluate(sodium, chloride, d);
				if (r.kind === 'missing') {
					// No trigger should have been met.
					if (chloride !== null) expect(chloride).toBeLessThan(CHLORIDE_LINE);
					if (d !== 'none' && sodium !== null) {
						const line = d === 'under1000' ? SODIUM_LINE.under1000 : SODIUM_LINE.under2000;
						expect(sodium).toBeLessThanOrEqual(line);
					}
				}
			})
		);
	});
});
