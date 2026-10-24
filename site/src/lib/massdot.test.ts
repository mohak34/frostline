import { describe, expect, it } from 'vitest';
import { evaluate, resultText } from '#lib/massdot.js';

describe('evaluate', () => {
	it('meets the chloride trigger at 250 mg/L', () => {
		expect(evaluate(null, 250, 'none')).toEqual({ kind: 'met', triggers: ['chloride'] });
		expect(evaluate(null, 249.9, 'none')).toEqual({ kind: 'clear' });
	});

	it('meets the sodium trigger over 20 mg/L with a diet under 1,000 mg/day', () => {
		expect(evaluate(20, 0, 'under1000')).toEqual({ kind: 'clear' });
		expect(evaluate(20.1, 0, 'under1000')).toEqual({ kind: 'met', triggers: ['sodium1000'] });
	});

	it('meets the sodium trigger over 40 mg/L with a diet under 2,000 mg/day', () => {
		expect(evaluate(40, 0, 'under2000')).toEqual({ kind: 'clear' });
		expect(evaluate(40.1, 0, 'under2000')).toEqual({ kind: 'met', triggers: ['sodium2000'] });
	});

	it('ignores sodium with diet none', () => {
		expect(evaluate(500, 0, 'none')).toEqual({ kind: 'clear' });
		expect(evaluate(null, 0, 'none')).toEqual({ kind: 'clear' });
	});

	it('names the missing inputs the diet needs', () => {
		expect(evaluate(null, null, 'under1000')).toEqual({
			kind: 'missing',
			inputs: ['sodium', 'chloride']
		});
		expect(evaluate(null, null, 'none')).toEqual({ kind: 'missing', inputs: ['chloride'] });
	});
});

describe('resultText', () => {
	it('lists each met trigger and points to the water system', () => {
		expect(resultText({ kind: 'met', triggers: ['chloride', 'sodium1000'] })).toBe(
			'MassDOT trigger met: chloride at or over 250 mg/L; sodium over 20 mg/L with a diet under 1,000 mg/day. Contact the water system named in the System column for the well that serves you.'
		);
	});

	it('states when no trigger is met', () => {
		expect(resultText({ kind: 'clear' })).toBe('No MassDOT trigger met.');
	});

	it('names both missing inputs', () => {
		expect(resultText({ kind: 'missing', inputs: ['sodium', 'chloride'] })).toBe(
			'Enter latest sodium and latest chloride.'
		);
	});
});
