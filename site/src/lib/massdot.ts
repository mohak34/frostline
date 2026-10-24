export type Diet = 'none' | 'under2000' | 'under1000';

export const DIETS: readonly { value: Diet; label: string }[] = [
	{ value: 'none', label: 'none' },
	{ value: 'under2000', label: 'under 2,000 mg/day' },
	{ value: 'under1000', label: 'under 1,000 mg/day' }
];

/** Text of a number input. badInput is input.validity.badInput. */
export function parseAmount(raw: string, badInput: boolean): number | null | 'invalid' {
	if (badInput) return 'invalid';
	if (raw.trim() === '') return null;
	const n = Number(raw);
	return Number.isFinite(n) && n >= 0 ? n : 'invalid';
}

export type Trigger = 'chloride' | 'sodium1000' | 'sodium2000';
type Input = 'sodium' | 'chloride';
export type Result =
	| { kind: 'met'; triggers: Trigger[] }
	| { kind: 'clear' }
	| { kind: 'missing'; inputs: Input[] };

/** Diet `none` never reads sodium. A met trigger wins over missing inputs. */
export function evaluate(sodium: number | null, chloride: number | null, diet: Diet): Result {
	const triggers: Trigger[] = [];
	if (chloride !== null && chloride >= 250) triggers.push('chloride');
	if (diet === 'under1000' && sodium !== null && sodium > 20) triggers.push('sodium1000');
	if (diet === 'under2000' && sodium !== null && sodium > 40) triggers.push('sodium2000');
	if (triggers.length > 0) return { kind: 'met', triggers };

	const inputs: Input[] = [];
	if (diet !== 'none' && sodium === null) inputs.push('sodium');
	if (chloride === null) inputs.push('chloride');
	return inputs.length > 0 ? { kind: 'missing', inputs } : { kind: 'clear' };
}

const TRIGGER_TEXT: Record<Trigger, string> = {
	chloride: 'chloride at or over 250 mg/L',
	sodium1000: 'sodium over 20 mg/L with a diet under 1,000 mg/day',
	sodium2000: 'sodium over 40 mg/L with a diet under 2,000 mg/day'
};

export function resultText(result: Result): string {
	switch (result.kind) {
		case 'met':
			return `MassDOT trigger met: ${result.triggers.map((t) => TRIGGER_TEXT[t]).join('; ')}. Contact the water system named in the System column for the well that serves you.`;
		case 'clear':
			return 'No MassDOT trigger met.';
		case 'missing':
			return `Enter ${result.inputs.map((i) => `latest ${i}`).join(' and ')}.`;
	}
}
