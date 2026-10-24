import { readBacktest } from '#lib/server/data.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({ backtest: await readBacktest() });
