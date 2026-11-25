// Port of Astryx `monthGeometry` (packages/core/src/DateInput/monthGeometry.ts), MIT, Meta Platforms, Inc.
// Months as consecutive indexes, and how a row of month panes maps to a scroll offset.
// Port change: Gregorian only, so the month model is plain arithmetic on year * 12 + month.

import type { PlainDate } from '../../internal/date/dateTypes.js';
import { gregorianMonth, type CalendarMonth } from '../../internal/date/calendarMonth.js';
import { plainDateAddMonths, plainDateIsAfter, plainDateIsBefore } from '../../internal/date/plainDate.js';

/** Months the sheet reaches either side of its anchor when no `min` or `max` bounds it. */
export const DEFAULT_MONTH_REACH = 600;

export function toMonthIndex(year: number, month: number): number {
	return year * 12 + (month - 1);
}

export function monthIndexOf(date: PlainDate): number {
	return toMonthIndex(date.year, date.month);
}

export function fromMonthIndex(index: number): { year: number; month: number } {
	return { year: Math.floor(index / 12), month: (((index % 12) + 12) % 12) + 1 };
}

export function monthAt(index: number): CalendarMonth {
	const { year, month } = fromMonthIndex(index);
	return gregorianMonth(year, month);
}

export function clampIndex(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}

export function rowAtScrollOffset(scrollOffset: number, paneSize: number, rowCount: number, isRTL = false): number {
	if (paneSize <= 0) return 0;
	const distance = isRTL ? -scrollOffset : scrollOffset;
	return clampIndex(Math.round(distance / paneSize), 0, rowCount - 1);
}

export function scrollOffsetForRow(row: number, paneSize: number, isRTL = false): number {
	const distance = row * paneSize;
	return isRTL ? -distance : distance;
}

/** The same day in another month, clamped to the month's length and to `min` and `max`. */
export function dateInMonth(
	date: PlainDate,
	monthIndex: number,
	min?: PlainDate | null,
	max?: PlainDate | null
): PlainDate {
	const moved = plainDateAddMonths(date, monthIndex - monthIndexOf(date));
	if (min != null && plainDateIsBefore(moved, min)) return min;
	if (max != null && plainDateIsAfter(moved, max)) return max;
	return moved;
}
