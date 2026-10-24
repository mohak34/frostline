// Mirrors the TypedDicts in pipeline/towns.py, which own the schema of static/data/.

export type Trend = 'rising' | 'flat' | 'falling' | 'insufficient';
export type WellClass = 'COM' | 'NC' | 'NTNC';

export interface Sample {
	date: string; // YYYY-MM-DD
	value: number; // mg/L
}

export interface Series {
	samples: Sample[];
	trend: Trend;
	slope: number | null;
	latest: number | null;
}
export interface SodiumSeries extends Series {
	watch: boolean;
}

export interface Well {
	id: string; // "PWSId|LocationName", unique across Town_Files
	name: string;
	system: string;
	class: WellClass;
	raw_or_finished: 'R' | 'F';
	sodium: SodiumSeries;
	chloride: Series;
}

export interface TownFile {
	town: string;
	wells: Well[];
}

/** One towns.json entry. */
export interface Town {
	name: string; // upper case, letters and spaces
	slug: string;
	wells: number;
	pct_rising: number | null;
	pct_over_20: number | null;
}

export interface Backtest {
	wells_tested: number;
	mae_baseline: number | null;
	mae_rule: number | null;
	crossed: number;
	caught: number;
	false_alarms: number;
}
