// Port of Astryx Calendar/hooks (useCalendarConstraints, useCalendarDays), MIT, Meta Platforms,
// Inc. The hooks become plain functions that a component wraps in `$derived`. Gregorian only.
import type { DayOfWeek, ISODateString } from '../../internal/date/dateTypes.js';
import {
	type PlainDate,
	plainDateAddDays,
	plainDateDayOfWeek,
	plainDateDiffDays,
	plainDateFromISO,
	plainDateIsAfter,
	plainDateIsBefore,
	plainDateToDate,
	plainDateToISO
} from '../../internal/date/plainDate.js';
import type { CalendarMonth } from '../../internal/date/calendarMonth.js';

export interface CalendarConstraintOptions {
	/** Minimum selectable date in ISO format */
	min?: ISODateString;
	/** Maximum selectable date in ISO format */
	max?: ISODateString;
	/** Custom date constraint functions. Date is disabled if ANY function returns false. */
	dateConstraints?: ReadonlyArray<(date: Date) => boolean>;
	/**
	 * Maximum number of days a range may span, counting both endpoints. Once a start is picked,
	 * dates further than this from it are disabled.
	 */
	maxRangeSpan?: number;
	/**
	 * Minimum number of days a range must span, counting both endpoints. Once a start is picked,
	 * dates closer than this to it are disabled, except the start itself.
	 */
	minRangeSpan?: number;
	/** The in-progress range start (first click, awaiting the second), or null. */
	rangeAnchor?: PlainDate | null;
}

/** Whether a day can't be picked under min/max, range-span bounds and custom constraints. */
export function createDateDisabledCheck(options: CalendarConstraintOptions): (date: PlainDate) => boolean {
	const { min, max, dateConstraints, maxRangeSpan, minRangeSpan, rangeAnchor } = options;
	const minDate = min ? plainDateFromISO(min) : null;
	const maxDate = max ? plainDateFromISO(max) : null;
	return (date) => {
		if (minDate && plainDateIsBefore(date, minDate)) return true;
		if (maxDate && plainDateIsAfter(date, maxDate)) return true;
		// Spans count both endpoints, so the reach from the anchor is `span - 1` days either way.
		if (rangeAnchor) {
			const distance = Math.abs(plainDateDiffDays(rangeAnchor, date));
			if (maxRangeSpan != null && distance > maxRangeSpan - 1) return true;
			// The anchor itself stays enabled: it is the picked start.
			if (minRangeSpan != null && distance > 0 && distance < minRangeSpan - 1) return true;
		}
		if (dateConstraints) {
			for (const constraint of dateConstraints) {
				if (!constraint(plainDateToDate(date))) return true;
			}
		}
		return false;
	};
}

/** A single day in the calendar grid. */
export interface CalendarDay {
	date: PlainDate;
	iso: ISODateString;
	/** Whether this day is outside the month the grid shows */
	isOutside: boolean;
	/** The day of the month (1-31) */
	dayNumber: number;
}

/**
 * The days a month grid lays out, adjacent-month days included, grouped into weeks: six rows,
 * or only the rows the month needs with `hasVariableRowCount`.
 */
export function calendarMonthWeeks(
	month: CalendarMonth,
	weekStartsOn: DayOfWeek,
	hasVariableRowCount: boolean
): { days: CalendarDay[]; weeks: CalendarDay[][] } {
	let startingDayOfWeek = plainDateDayOfWeek(month.start) - weekStartsOn;
	if (startingDayOfWeek < 0) startingDayOfWeek += 7;
	const totalRows = hasVariableRowCount ? Math.ceil((month.length + startingDayOfWeek) / 7) : 6;
	const days: CalendarDay[] = [];
	for (let i = 0; i < totalRows * 7; i++) {
		const offset = i - startingDayOfWeek;
		const pd = plainDateAddDays(month.start, offset);
		days.push({
			date: pd,
			iso: plainDateToISO(pd),
			isOutside: offset < 0 || offset >= month.length,
			dayNumber: pd.day
		});
	}
	const weeks: CalendarDay[][] = [];
	for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
	return { days, weeks };
}
