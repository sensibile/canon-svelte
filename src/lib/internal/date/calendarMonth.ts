// Gregorian subset of Astryx utils/calendarSystem.ts, MIT, Meta Platforms, Inc. The port shows
// Gregorian months only, so each helper is the `isGregorianAligned` branch of the original.
import type { PlainDate } from './dateTypes.js';
import {
	getDaysInMonth,
	plainDateAddDays,
	plainDateAddMonths,
	plainDateFormat,
	plainDateFormatStandaloneMonthYear,
	plainDateIsInRange
} from './plainDate.js';

export interface CalendarMonth {
	readonly start: PlainDate;
	readonly end: PlainDate;
	readonly length: number;
}

export function gregorianMonth(year: number, month: number): CalendarMonth {
	const length = getDaysInMonth(year, month);
	const start = { year, month, day: 1 };
	return { start, end: plainDateAddDays(start, length - 1), length };
}

/** The month that contains a date. */
export function calendarMonthOf(pd: PlainDate): CalendarMonth {
	return gregorianMonth(pd.year, pd.month);
}

/** The month `n` months after `month`, or before it when negative. */
export function calendarAddMonths(month: CalendarMonth, n: number): CalendarMonth {
	if (n === 0) return month;
	const { year, month: monthOfYear } = plainDateAddMonths(month.start, n);
	return gregorianMonth(year, monthOfYear);
}

/** Moves a date by `n` months, keeping the day of the month clamped to the target month. */
export function calendarShiftMonths(pd: PlainDate, n: number): PlainDate {
	return plainDateAddMonths(pd, n);
}

/** Moves a date by `n` years, keeping the month and clamping the day. */
export function calendarShiftYears(pd: PlainDate, n: number): PlainDate {
	return plainDateAddMonths(pd, n * 12);
}

export function isInCalendarMonth(pd: PlainDate, month: CalendarMonth): boolean {
	return plainDateIsInRange(pd, [month.start, month.end]);
}

/** The stand-alone month and year label, such as "January 2026". */
export function formatCalendarMonthLabel(month: CalendarMonth, locale: string): string {
	return plainDateFormatStandaloneMonthYear(month.start, locale);
}

/** A date formatted with these options, such as "Friday, January 9, 2026". */
export function formatCalendarDate(pd: PlainDate, options: Intl.DateTimeFormatOptions, locale: string): string {
	return plainDateFormat(pd, options, locale);
}
