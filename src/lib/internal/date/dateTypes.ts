// Port of Astryx utils/dateTypes.ts, MIT, Meta Platforms, Inc.

/** A calendar date as `YYYY-MM-DD`. */
export type ISODateString = `${number}${number}${number}${number}-${number}${number}-${number}${number}`;

/** Day of the week: 0 = Sunday … 6 = Saturday. */
export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Three-letter day name, accepted wherever a `DayOfWeek` is. */
export type DayOfWeekName = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';

const WEEKDAY_NAMES: ReadonlyArray<DayOfWeekName> = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/** A number or a case-insensitive three-letter name, as a numeric day of the week. */
export function normalizeDayOfWeek(value: DayOfWeek | DayOfWeekName): DayOfWeek {
	if (typeof value === 'number') return value;
	const index = WEEKDAY_NAMES.indexOf(value.toLowerCase() as DayOfWeekName);
	return index === -1 ? 0 : (index as DayOfWeek);
}

export interface PlainDate {
	readonly year: number;
	/** 1-based (1 = January, 12 = December) */
	readonly month: number;
	readonly day: number;
}

export interface DateRange {
	start: ISODateString;
	end: ISODateString;
}
