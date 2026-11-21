<!--
  Port of Astryx `Calendar` (packages/core/src/Calendar/Calendar.tsx), MIT, Meta Platforms, Inc.
  A month grid for picking a date (`mode="single"`) or a date range (`mode="range"`). Values are
  ISO `YYYY-MM-DD` strings. Gregorian only: the `calendar` prop and the locale provider are not
  ported (pass `locale` instead), as with Timestamp.
-->
<script lang="ts" module>
	import type { DateRange, DayOfWeek, DayOfWeekName, ISODateString } from '../../internal/date/dateTypes.js';

	export type { DateRange, DayOfWeek, DayOfWeekName, ISODateString };
	export type CalendarMode = 'single' | 'range';
	/** A single date, or a range in range mode. */
	export type CalendarValue = ISODateString | DateRange;
</script>

<script lang="ts">
	import { untrack } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import Button from '../Button/Button.svelte';
	import VisuallyHidden from '../VisuallyHidden/VisuallyHidden.svelte';
	import CalendarMonthGrid, { type NavigationUnit } from './CalendarMonthGrid.svelte';
	import { normalizeDayOfWeek } from '../../internal/date/dateTypes.js';
	import {
		type PlainDate,
		DATE_FORMAT_WITH_WEEKDAY,
		plainDateAddDays,
		plainDateDiffDays,
		plainDateFromISO,
		plainDateIsAfter,
		plainDateIsBefore,
		plainDateIsEqual,
		plainDateToDate,
		plainDateToISO,
		plainDateToday
	} from '../../internal/date/plainDate.js';
	import {
		type CalendarMonth,
		calendarAddMonths,
		calendarMonthOf,
		calendarShiftMonths,
		calendarShiftYears,
		formatCalendarDate,
		formatCalendarMonthLabel,
		isInCalendarMonth
	} from '../../internal/date/calendarMonth.js';
	import { createDateDisabledCheck } from './calendarDays.js';
	import { getInitialFocusDate } from './getInitialFocusDate.js';

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'onchange'> {
		/** Selection mode. */
		mode?: CalendarMode;
		/** The selected date (single mode) or range (range mode), or null. */
		value?: CalendarValue | null;
		/** Called when a date (single mode) is picked, with the date as a `Date` too. */
		onChange?: ((value: ISODateString, valueAsDate: Date) => void) | ((value: DateRange) => void);
		/** Number of months shown side by side. */
		numberOfMonths?: 1 | 2;
		/** Earliest selectable date. */
		min?: ISODateString;
		/** Latest selectable date. */
		max?: ISODateString;
		/** A date is disabled if ANY of these returns false. */
		dateConstraints?: ReadonlyArray<(date: Date) => boolean>;
		/** Range mode: the most days a range may span, counting both ends. */
		maxRangeSpan?: number;
		/** Range mode: the fewest days a range must span, counting both ends. Default 1. */
		minRangeSpan?: number;
		/**
		 * A day in the first month shown. Defaults to the selected date, else today clamped into
		 * the `min`/`max` window. Bind it to follow navigation.
		 */
		focusDate?: ISODateString;
		/** Called when navigation changes the months shown. */
		onFocusDateChange?: (focusDate: ISODateString) => void;
		/** Show days from adjacent months, dimmed. */
		hasOutsideDays?: boolean;
		/** Show ISO 8601 week numbers in a side column. */
		hasWeekNumbers?: boolean;
		/** Give each month only the rows it needs, instead of a fixed 6-row grid. */
		hasVariableRowCount?: boolean;
		/** First day of the week: 0 (Sunday) to 6, or 'sun' … 'sat'. */
		weekStartsOn?: DayOfWeek | DayOfWeekName;
		/** Locale for month and day names. */
		locale?: string;
	}

	let {
		mode = 'single',
		value = $bindable(),
		onChange,
		numberOfMonths: numberOfMonthsProp = 1,
		min,
		max,
		dateConstraints,
		maxRangeSpan,
		minRangeSpan,
		focusDate = $bindable(),
		onFocusDateChange,
		hasOutsideDays = true,
		hasWeekNumbers = false,
		hasVariableRowCount = false,
		weekStartsOn: weekStartsOnProp = 0,
		locale = 'en-US',
		class: className,
		onkeydown,
		onfocusout,
		...rest
	}: Props = $props();

	const weekStartsOn = $derived(normalizeDayOfWeek(weekStartsOnProp));
	const numberOfMonths = $derived(numberOfMonthsProp === 2 ? 2 : 1);

	// Today is unknown on the server and while hydrating, so the hydrated markup matches.
	let today = $state<PlainDate | null>(null);
	$effect(() => {
		today = plainDateToday();
	});

	/** First pick of a range, waiting for the second. */
	let rangeSelectionStart = $state<ISODateString | null>(null);
	/** Hovered day, for the range preview. */
	let hoveredDate = $state<ISODateString | null>(null);
	/** Day to focus once its month is shown. */
	let pendingFocus = $state<ISODateString | null>(null);

	const valueOrUndefined = $derived(value ?? undefined);
	const openingFocusDate = () =>
		getInitialFocusDate({ focusDate, value: valueOrUndefined, min, max, numberOfMonths, today });
	// The month the calendar opened on, kept so a later pick doesn't move the shown months.
	let openingFocus = $state<PlainDate | null>(untrack(openingFocusDate));
	$effect(() => {
		if (today != null && untrack(() => openingFocus) == null) openingFocus = untrack(openingFocusDate);
	});
	const knownFocusDate = $derived(focusDate ? plainDateFromISO(focusDate) : openingFocus);
	const isMonthKnown = $derived(knownFocusDate != null);
	const baseMonth: CalendarMonth = $derived(calendarMonthOf(knownFocusDate ?? { year: 1970, month: 1, day: 1 }));
	const visibleMonths = $derived(Array.from({ length: numberOfMonths }, (_, i) => calendarAddMonths(baseMonth, i)));
	const lastVisibleMonth = $derived(visibleMonths[visibleMonths.length - 1]);

	/** Move the shown months. Exposed for callers that hold a component ref. */
	export function navigateTo(date: ISODateString) {
		focusDate = date;
		onFocusDateChange?.(date);
	}
	function setFocusMonth(pd: PlainDate) {
		navigateTo(plainDateToISO(pd));
	}

	// A pending target is claimed only by the grid that shows its month.
	const claimablePendingFocus = $derived.by(() => {
		if (pendingFocus == null) return null;
		const target = plainDateFromISO(pendingFocus);
		return visibleMonths.some((month) => isInCalendarMonth(target, month)) ? pendingFocus : null;
	});
	function handleRootFocusOut(e: FocusEvent & { currentTarget: HTMLDivElement }) {
		(onfocusout as ((e: FocusEvent) => void) | undefined)?.(e);
		if (pendingFocus == null) return;
		const next = e.relatedTarget;
		if (next == null) {
			// Focus can drop because the focused day left with its month as the grid moved. Decide
			// after the new month renders: a day that is still on the page really lost focus.
			const target = e.target;
			const pending = pendingFocus;
			setTimeout(() => {
				if (pendingFocus === pending && target instanceof Node && target.isConnected) pendingFocus = null;
			});
			return;
		}
		// Only the move onto the target day keeps the target.
		if (!(next instanceof Element && next.getAttribute('data-date') === pendingFocus)) pendingFocus = null;
	}

	const monthYearLabel = $derived(
		isMonthKnown ? visibleMonths.map((m) => formatCalendarMonthLabel(m, locale)).join(' – ') : ''
	);

	// Announce the visible month when it changes, not on mount.
	let announcement = $state('');
	let lastLabel: string | null = null;
	$effect(() => {
		const label = monthYearLabel;
		untrack(() => {
			if (lastLabel == null || lastLabel === '') {
				lastLabel = label;
				return;
			}
			if (label !== lastLabel) {
				lastLabel = label;
				announcement = label;
			}
		});
	});
	const announce = (message: string) => (announcement = message);

	const minDate = $derived(min ? plainDateFromISO(min) : null);
	const maxDate = $derived(max ? plainDateFromISO(max) : null);
	const canNavigatePrevious = $derived(isMonthKnown && (minDate == null || plainDateIsBefore(minDate, baseMonth.start)));
	const canNavigateNext = $derived(isMonthKnown && (maxDate == null || plainDateIsAfter(maxDate, lastVisibleMonth.end)));

	const rangeAnchor = $derived(mode === 'range' && rangeSelectionStart ? plainDateFromISO(rangeSelectionStart) : null);
	const isDateDisabled = $derived(
		createDateDisabledCheck({ min, max, dateConstraints, maxRangeSpan, minRangeSpan, rangeAnchor })
	);

	function firstEnabledDayOfMonth(month: CalendarMonth): PlainDate | null {
		for (let offset = 0; offset < month.length; offset++) {
			const pd = plainDateAddDays(month.start, offset);
			if (!isDateDisabled(pd)) return pd;
		}
		return null;
	}

	function navigateMonth(delta: number, focusedDate?: ISODateString, offset?: number, unit: NavigationUnit = 'days') {
		// The Previous/Next buttons move the month with no focused day.
		if (!focusedDate) {
			if ((delta < 0 && !canNavigatePrevious) || (delta > 0 && !canNavigateNext)) return;
			setFocusMonth(calendarAddMonths(baseMonth, delta).start);
			return;
		}
		// A key resolves its target day first, so a bound blocks only out-of-range targets.
		const current = plainDateFromISO(focusedDate);
		const inRange = (pd: PlainDate) =>
			!(minDate && plainDateIsBefore(pd, minDate)) && !(maxDate && plainDateIsAfter(pd, maxDate));
		let target: PlainDate;
		if (unit === 'months' || unit === 'years') {
			// Keep the day of the month, clamped; a month with no enabled day is no target.
			const candidate = unit === 'years' ? calendarShiftYears(current, delta) : calendarShiftMonths(current, delta);
			if (!inRange(candidate)) return;
			if (isDateDisabled(candidate)) {
				const firstEnabled = firstEnabledDayOfMonth(calendarMonthOf(candidate));
				if (firstEnabled == null) return;
				target = firstEnabled;
			} else target = candidate;
		} else {
			// Walk the arrow's direction to the first enabled day, up to a year away.
			const step = delta * (offset ?? 7);
			let candidate = plainDateAddDays(current, step);
			let found: PlainDate | null = null;
			while (Math.abs(plainDateDiffDays(current, candidate)) <= 366) {
				if (!inRange(candidate)) return;
				if (!isDateDisabled(candidate)) {
					found = candidate;
					break;
				}
				candidate = plainDateAddDays(candidate, step);
			}
			if (found == null) return;
			target = found;
		}
		// Focus moves to the target; the months change only when its month isn't shown, by the
		// least they can in the key's direction.
		pendingFocus = plainDateToISO(target);
		const isBeforeShown = plainDateIsBefore(target, baseMonth.start);
		if (!isBeforeShown && !plainDateIsAfter(target, lastVisibleMonth.end)) return;
		const targetMonth = calendarMonthOf(target);
		setFocusMonth(isBeforeShown ? targetMonth.start : calendarAddMonths(targetMonth, -(numberOfMonths - 1)).start);
	}

	function handleKeydown(e: KeyboardEvent & { currentTarget: HTMLDivElement }) {
		(onkeydown as ((e: KeyboardEvent) => void) | undefined)?.(e);
		// Escape cancels a range in progress.
		if (mode === 'range' && rangeSelectionStart !== null && e.key === 'Escape') {
			rangeSelectionStart = null;
			e.preventDefault();
			e.stopPropagation();
		}
	}

	const formatDateLabel = (date: PlainDate) => formatCalendarDate(date, DATE_FORMAT_WITH_WEEKDAY, locale);

	function handleDayClick(date: PlainDate) {
		const iso = plainDateToISO(date);
		if (mode === 'single') {
			value = iso;
			(onChange as ((value: ISODateString, valueAsDate: Date) => void) | undefined)?.(iso, plainDateToDate(date));
			return;
		}
		if (rangeSelectionStart === null) {
			// The grid doesn't move, so say the range progress out loud.
			rangeSelectionStart = iso;
			announce(`Start date ${formatDateLabel(date)}. Select an end date.`);
			return;
		}
		const startPd = plainDateFromISO(rangeSelectionStart);
		// Picking the start again with a minimum span over one day cancels it, so it can move.
		if (plainDateIsEqual(date, startPd) && (minRangeSpan ?? 1) > 1) {
			rangeSelectionStart = null;
			announce(`Cleared start date ${formatDateLabel(date)}. Select a start date.`);
			return;
		}
		const [start, end] = plainDateIsBefore(date, startPd) ? [iso, rangeSelectionStart] : [rangeSelectionStart, iso];
		const range: DateRange = { start, end };
		value = range;
		rangeSelectionStart = null;
		(onChange as ((value: DateRange) => void) | undefined)?.(range);
		announce(
			`Selected range: ${formatDateLabel(plainDateFromISO(start))} to ${formatDateLabel(plainDateFromISO(end))}.`
		);
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	{...rest}
	class={['astryx-calendar', 'calendar', className]}
	data-mode={mode}
	onkeydown={handleKeydown}
	onfocusout={handleRootFocusOut}
>
	<div class="header">
		<Button
			class="astryx-calendar-nav nav"
			data-nav="prev"
			data-disabled={!canNavigatePrevious ? 'disabled' : undefined}
			label="Previous month"
			variant="ghost"
			icon="chevronLeft"
			isIconOnly
			isDisabled={!canNavigatePrevious}
			onclick={() => navigateMonth(-1)}
		/>
		<span class="month-year-label">{monthYearLabel}</span>
		<Button
			class="astryx-calendar-nav nav"
			data-nav="next"
			data-disabled={!canNavigateNext ? 'disabled' : undefined}
			label="Next month"
			variant="ghost"
			icon="chevronRight"
			isIconOnly
			isDisabled={!canNavigateNext}
			onclick={() => navigateMonth(1)}
		/>
	</div>
	<!-- Before the month is known the grids keep their space but stay hidden and out of reach. -->
	<div class="months" class:pending={!isMonthKnown} aria-hidden={isMonthKnown ? undefined : true} inert={!isMonthKnown}>
		{#each visibleMonths as month (plainDateToISO(month.start))}
			<CalendarMonthGrid
				{month}
				value={valueOrUndefined}
				{mode}
				{rangeSelectionStart}
				{hoveredDate}
				{isDateDisabled}
				{hasOutsideDays}
				{hasWeekNumbers}
				{hasVariableRowCount}
				{weekStartsOn}
				{today}
				{locale}
				onDayClick={handleDayClick}
				onDayHover={(date) => (hoveredDate = date ? plainDateToISO(date) : null)}
				onNavigatePrevious={(focused, offset, unit) => navigateMonth(-1, focused, offset, unit)}
				onNavigateNext={(focused, offset, unit) => navigateMonth(1, focused, offset, unit)}
				pendingFocus={claimablePendingFocus}
				onPendingFocusHandled={() => (pendingFocus = null)}
			/>
		{/each}
	</div>
	<VisuallyHidden><span aria-live="polite" aria-atomic="true">{announcement}</span></VisuallyHidden>
</div>

<style>
	@layer astryx-base {
		.calendar {
			display: inline-block;
			padding: var(--spacing-3);
			min-width: 220px;
		}
		.header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			margin-bottom: var(--spacing-2);
			gap: var(--spacing-2);
		}
		.month-year-label {
			flex: 1;
			text-align: center;
			font-weight: var(--font-weight-semibold);
			font-size: var(--text-label-size);
			line-height: var(--text-label-leading);
			color: var(--color-text-primary);
		}
		/* The chevrons point the reading direction's way. */
		.header :global(.nav:dir(rtl) svg) {
			transform: scaleX(-1);
		}
		.months {
			display: flex;
			/* Wraps rather than overflowing the page sideways (WCAG 1.4.10). */
			flex-wrap: wrap;
			gap: var(--spacing-4);
		}
		.pending {
			visibility: hidden;
		}
	}
</style>
