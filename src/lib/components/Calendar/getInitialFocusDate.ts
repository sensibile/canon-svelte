// Port of Astryx Calendar/getInitialFocusDate.ts, MIT, Meta Platforms, Inc. Gregorian only.

/**
 * @file getInitialFocusDate.ts
 * @input PlainDate and calendar-system utilities, min/max bounds, today
 * @output Exports getInitialFocusDate — the month Calendar opens on
 * @position Calendar-specific helper; used by Calendar.tsx
 *
 * SYNC: When modified, update:
 * - /packages/core/src/Calendar/getInitialFocusDate.test.ts
 * - /packages/core/src/Calendar/Calendar.tsx (the only caller)
 */

import type { ISODateString, DateRange } from '../../internal/date/dateTypes.js';
import { type PlainDate, plainDateFromISO, plainDateIsBefore, plainDateIsAfter } from '../../internal/date/plainDate.js';
import { calendarAddMonths, calendarMonthOf } from '../../internal/date/calendarMonth.js';

export interface InitialFocusDateOptions {
	/** Controlled visible month, if the consumer supplied one. */
	focusDate?: ISODateString;
	/** Selected value (single date or range), controlled or uncontrolled. */
	value?: ISODateString | DateRange;
	/** Earliest selectable date. */
	min?: ISODateString;
	/** Latest selectable date. */
	max?: ISODateString;
	/** How many month panes the calendar renders (1 or 2). */
	numberOfMonths: number;
	/**
	 * Today, injected so the caller keeps one source of "now"; `null` when it is
	 * not known yet (server render, hydration).
	 */
	today: PlainDate | null;
}

/**
 * Picks the date whose month the calendar opens on.
 *
 * An explicit `focusDate` wins and is never second-guessed: it names the first
 * pane outright. Then the selected value — its month is shown even when it lies
 * outside `min`/`max`.
 *
 * Otherwise the calendar opens on today, clamped into the `min`/`max` window,
 * or returns `null` while today is not known yet.
 * Without the clamp a window that doesn't contain today (a 2019 audit range, a
 * booking window opening next spring) opened on today's month with every day
 * disabled, leaving prev/next clicking as the only way in.
 *
 * When clamping forward to `min`, that month leads: the whole selectable window
 * runs ahead of it. When clamping back to `max`, the last pane lands on `max`'s
 * month instead — with `numberOfMonths={2}` opening on `[max, max + 1]` would
 * spend half the calendar on a month that is entirely out of bounds. That
 * shift never crosses `min`'s month.
 *
 * The same shift applies when the value or today is inside the window but in
 * `max`'s month (`max` set to today is the common case): the month stays in
 * view, in the last pane, and the panes before it show months that still have
 * selectable days.
 */
export function getInitialFocusDate(
	options: InitialFocusDateOptions,
): PlainDate | null {
	const {
		focusDate,
		value,
		min,
		max,
		numberOfMonths,
		today,
	} = options;

	if (focusDate) {
		return plainDateFromISO(focusDate);
	}

	const minDate = min ? plainDateFromISO(min) : null;
	const maxDate = max ? plainDateFromISO(max) : null;

	if (value) {
		return keepLastPaneWithinMax(
			plainDateFromISO(typeof value === 'string' ? value : value.start),
			minDate,
			maxDate,
			numberOfMonths,
		);
	}

	// Without a focus date or a value the month follows today, which is not
	// known yet on the server and while hydrating.
	if (today == null) {
		return null;
	}

	if (minDate && plainDateIsBefore(today, minDate)) {
		return minDate;
	}

	if (maxDate && plainDateIsAfter(today, maxDate)) {
		const lastPaneOffset = Math.max(0, numberOfMonths - 1);
		const shifted = calendarAddMonths(
			calendarMonthOf(maxDate),
			-lastPaneOffset,
		).start;
		if (
			minDate &&
			plainDateIsBefore(shifted, calendarMonthOf(minDate).start)
		) {
			return minDate;
		}
		return shifted;
	}

	return keepLastPaneWithinMax(
		today,
		minDate,
		maxDate,
		numberOfMonths,
	);
}

/**
 * Moves the opening month back when `date`'s month is shown but a later pane
 * would lie wholly past `max`: the last pane lands on `max`'s month, and the
 * first pane never goes before `min`'s month. A date whose panes already end
 * by `max`'s month, or whose own month is past `max`'s, is returned unchanged,
 * so its month always stays in view.
 */
function keepLastPaneWithinMax(
	date: PlainDate,
	minDate: PlainDate | null,
	maxDate: PlainDate | null,
	numberOfMonths: number,
): PlainDate {
	const lastPaneOffset = Math.max(0, numberOfMonths - 1);
	if (maxDate == null || lastPaneOffset === 0) {
		return date;
	}

	const month = calendarMonthOf(date).start;
	const maxMonth = calendarMonthOf(maxDate);
	const latestFirstPane = calendarAddMonths(
		maxMonth,
		-lastPaneOffset,
	).start;
	if (
		!plainDateIsAfter(month, latestFirstPane) ||
		plainDateIsAfter(month, maxMonth.start)
	) {
		return date;
	}

	if (minDate == null) {
		return latestFirstPane;
	}
	const minMonth = calendarMonthOf(minDate).start;
	if (!plainDateIsBefore(latestFirstPane, minMonth)) {
		return latestFirstPane;
	}
	// `min` is closer than the full shift: go back only as far as its month,
	// and not at all when the date's own month is already there or earlier.
	return plainDateIsAfter(month, minMonth) ? minDate : date;
}
