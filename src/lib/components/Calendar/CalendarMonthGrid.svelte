<!--
  Port of Astryx Calendar's private MonthGrid and DayCell (packages/core/src/Calendar/Calendar.tsx),
  MIT, Meta Platforms, Inc. One month as an APG grid of day buttons with a roving tab stop.
-->
<script lang="ts" module>
	/** How a month navigation moves the focused day: by days, or by whole months or years. */
	export type NavigationUnit = 'days' | 'months' | 'years';
</script>

<script lang="ts">
	import VisuallyHidden from '../VisuallyHidden/VisuallyHidden.svelte';
	import type { DateRange, DayOfWeek, ISODateString } from '../../internal/date/dateTypes.js';
	import {
		type PlainDate,
		DATE_FORMAT_WITH_WEEKDAY,
		plainDateAddDays,
		plainDateDayOfWeek,
		plainDateFormatDayNumber,
		plainDateFromISO,
		plainDateGetWeekNumber,
		plainDateIsBefore,
		plainDateIsEqual,
		plainDateToISO,
		plainDateWeekFieldName
	} from '../../internal/date/plainDate.js';
	import {
		type CalendarMonth,
		formatCalendarDate,
		formatCalendarMonthLabel,
		isInCalendarMonth
	} from '../../internal/date/calendarMonth.js';
	import { createGridFocus } from '../../internal/gridFocus.js';
	import { calendarMonthWeeks, type CalendarDay } from './calendarDays.js';
	import {
		computeDayCellState,
		computeDayNeighborContinuity,
		computePreviewRounding,
		computeRangeRounding,
		isEndpoint
	} from './dayCellUtils.js';
	import { getWeekdayHeaders } from './getWeekdayHeaderNames.js';

	interface Props {
		month: CalendarMonth;
		value: ISODateString | DateRange | undefined;
		mode: 'single' | 'range';
		rangeSelectionStart: ISODateString | null;
		hoveredDate: ISODateString | null;
		isDateDisabled: (date: PlainDate) => boolean;
		hasOutsideDays: boolean;
		hasWeekNumbers: boolean;
		hasVariableRowCount: boolean;
		weekStartsOn: DayOfWeek;
		/** Today, or null on the server and while hydrating. */
		today: PlainDate | null;
		locale: string;
		onDayClick: (date: PlainDate) => void;
		onDayHover: (date: PlainDate | null) => void;
		onNavigatePrevious: (focusedDate: ISODateString, offset: number, unit?: NavigationUnit) => void;
		onNavigateNext: (focusedDate: ISODateString, offset: number, unit?: NavigationUnit) => void;
		pendingFocus: ISODateString | null;
		onPendingFocusHandled: () => void;
	}

	let {
		month,
		value,
		mode,
		rangeSelectionStart,
		hoveredDate,
		isDateDisabled,
		hasOutsideDays,
		hasWeekNumbers,
		hasVariableRowCount,
		weekStartsOn,
		today,
		locale,
		onDayClick,
		onDayHover,
		onNavigatePrevious,
		onNavigateNext,
		pendingFocus,
		onPendingFocusHandled
	}: Props = $props();

	const layout = $derived(calendarMonthWeeks(month, weekStartsOn, hasVariableRowCount));
	const dayNameHeaders = $derived(getWeekdayHeaders(locale, weekStartsOn));
	const monthLabel = $derived(formatCalendarMonthLabel(month, locale));

	const selectedDate = $derived(mode === 'single' && typeof value === 'string' ? plainDateFromISO(value) : null);

	// The day that starts as the grid's tab stop: the selected day, else today, else the first
	// enabled day of the month. The grid focus owns the stop after that.
	const seedTabbableIso = $derived.by((): ISODateString | null => {
		if (selectedDate && isInCalendarMonth(selectedDate, month) && !isDateDisabled(selectedDate)) {
			return plainDateToISO(selectedDate);
		}
		if (today != null && isInCalendarMonth(today, month) && !isDateDisabled(today)) return plainDateToISO(today);
		for (const day of layout.days) if (!day.isOutside && !isDateDisabled(day.date)) return day.iso;
		return null;
	});

	// Selection, the in-progress range, and its hover preview.
	const range = $derived.by(() => {
		let rangeStart: PlainDate | null = null;
		let rangeEnd: PlainDate | null = null;
		if (mode === 'range' && value && typeof value === 'object') {
			rangeStart = plainDateFromISO(value.start);
			rangeEnd = plainDateFromISO(value.end);
		}
		if (rangeSelectionStart) {
			rangeStart = plainDateFromISO(rangeSelectionStart);
			rangeEnd = rangeStart;
		}
		let previewStart: PlainDate | null = null;
		let previewEnd: PlainDate | null = null;
		if (mode === 'range' && rangeSelectionStart && hoveredDate) {
			const startPd = plainDateFromISO(rangeSelectionStart);
			const hoverPd = plainDateFromISO(hoveredDate);
			if (!plainDateIsEqual(startPd, hoverPd)) {
				[previewStart, previewEnd] = plainDateIsBefore(hoverPd, startPd) ? [hoverPd, startPd] : [startPd, hoverPd];
			}
		}
		return { rangeStart, rangeEnd, previewStart, previewEnd };
	});

	let gridEl: HTMLDivElement | undefined = $state();
	const focusedDate = (): ISODateString | null =>
		(document.activeElement?.getAttribute('data-date') as ISODateString | null) ?? null;
	const grid = createGridFocus(
		() => gridEl,
		() => ({
			columns: 7,
			cellSelector: '[role="gridcell"]',
			// Disabled and adjacent-month days are skipped; the grid edge crosses into the next month.
			isCellFocusable: (cell) => cell.querySelector('button:not([disabled]):not([aria-disabled="true"])') !== null,
			getFocusTarget: (cell) => cell.querySelector<HTMLElement>('button'),
			hasRovingTabIndex: true,
			onNavigateBefore: (_column, offset) => {
				const date = focusedDate();
				if (date) onNavigatePrevious(date, offset);
			},
			onNavigateAfter: (_column, offset) => {
				const date = focusedDate();
				if (date) onNavigateNext(date, offset);
			},
			// PageUp/PageDown move by a month, and with Shift by a year.
			onPageUp: (e) => {
				const date = focusedDate();
				if (date) onNavigatePrevious(date, 1, e.shiftKey ? 'years' : 'months');
			},
			onPageDown: (e) => {
				const date = focusedDate();
				if (date) onNavigateNext(date, 1, e.shiftKey ? 'years' : 'months');
			}
		})
	);
	// Repair the tab stop after every update, the way the hook's layout effect does.
	$effect(() => {
		void layout;
		void seedTabbableIso;
		void isDateDisabled;
		grid.sync();
	});

	// Focus a pending day once this grid shows its month: the day itself, else the month's first
	// enabled day, else any day button that can take focus.
	$effect(() => {
		if (!pendingFocus || !gridEl) return;
		const target = plainDateFromISO(pendingFocus);
		if (!isInCalendarMonth(target, month)) return;
		const targetIso = plainDateToISO(target);
		const buttons = Array.from(
			gridEl.querySelectorAll<HTMLElement>('button[data-date]:not([disabled]):not([aria-disabled="true"])')
		);
		const targetButton =
			buttons.find((b) => b.getAttribute('data-date') === targetIso) ??
			buttons[0] ??
			gridEl.querySelector<HTMLElement>('button[data-date]:not([disabled])');
		if (targetButton != null) {
			for (const b of gridEl.querySelectorAll<HTMLElement>('button[data-date]')) b.tabIndex = b === targetButton ? 0 : -1;
			targetButton.focus();
		}
		onPendingFocusHandled();
	});

	/** ISO weeks are numbered by their Thursday, which holds most of the row's days. */
	function rowThursday(week: ReadonlyArray<CalendarDay>): PlainDate {
		const first = week[0].date;
		return plainDateAddDays(first, (4 - plainDateDayOfWeek(first) + 7) % 7);
	}
	const formatDateLabel = (date: PlainDate) => formatCalendarDate(date, DATE_FORMAT_WITH_WEEKDAY, locale);
</script>

{#snippet dayCell(day: CalendarDay, dayIndex: number, week: CalendarDay[])}
	{#if day.isOutside && !hasOutsideDays}
		<!-- An empty placeholder is still a gridcell, so every row keeps seven cells. -->
		<div role="gridcell" class="cell"></div>
	{:else}
		{@const isDisabled = isDateDisabled(day.date)}
		{@const state = computeDayCellState({
			date: day.date,
			dayIndex,
			mode,
			selectedDate,
			...range,
			today,
			isDisabled,
			isOutside: day.isOutside
		})}
		{@const neighbors = computeDayNeighborContinuity({ week, dayIndex, mode, ...range, isDisabled: isDateDisabled })}
		{@const endpoint = isEndpoint(state)}
		{@const showsTodayRing = state.isToday && !state.isSelected && !state.isInRange}
		{@const showsTodayInRangeRing = state.isToday && !state.isSelected && state.isInRange}
		{@const dateLabel = formatDateLabel(day.date)}
		{@const dayLabel = state.isSelected
			? `${dateLabel}, selected`
			: state.isRangeStart && state.isRangeEnd
				? rangeSelectionStart !== null
					? `${dateLabel}, range start`
					: `${dateLabel}, range start and range end`
				: state.isRangeStart
					? `${dateLabel}, range start`
					: state.isRangeEnd
						? `${dateLabel}, range end`
						: state.isInRange
							? `${dateLabel}, in range`
							: dateLabel}
		{@const rangeRounding = computeRangeRounding(state, { prevInRange: neighbors.prevInRange, nextInRange: neighbors.nextInRange })}
		{@const previewRounding = computePreviewRounding(state, {
			prevInPreview: neighbors.prevInPreview,
			nextInPreview: neighbors.nextInPreview
		})}
		<div role="gridcell" class="cell" aria-selected={state.isSelected || state.isInRange || undefined}>
			{#if state.isInRange}
				<div
					class="astryx-calendar-range range-bg"
					class:round-start={rangeRounding.roundStart}
					class:round-end={rangeRounding.roundEnd}
					class:inset-start={state.isRangeStart}
					class:inset-end={state.isRangeEnd || (state.isRangeStart && rangeRounding.roundEnd)}
					data-start={state.isRangeStart ? 'start' : undefined}
					data-end={state.isRangeEnd ? 'end' : undefined}
				></div>
			{/if}
			{#if state.isInPreview}
				<div
					class="astryx-calendar-range-preview preview-bg"
					class:round-start={previewRounding.roundStart || state.isPreviewStart}
					class:round-end={previewRounding.roundEnd || state.isPreviewEnd}
					data-start={state.isPreviewStart ? 'start' : undefined}
					data-end={state.isPreviewEnd ? 'end' : undefined}
				></div>
			{/if}
			<!-- A disabled day stays focusable through aria-disabled; arrows still skip it. -->
			<button
				type="button"
				class="astryx-calendar-day day"
				class:outside={day.isOutside}
				class:today={showsTodayRing}
				class:today-in-range={showsTodayInRangeRing}
				class:selected={endpoint}
				class:disabled={state.effectivelyDisabled}
				data-date={day.iso}
				data-selected={endpoint ? 'selected' : undefined}
				data-today={state.isToday ? 'today' : undefined}
				data-disabled={state.effectivelyDisabled ? 'disabled' : undefined}
				data-in-range={state.isInRange ? 'in-range' : undefined}
				data-marker={showsTodayRing ? 'today-only' : showsTodayInRangeRing ? 'today-in-range' : undefined}
				aria-label={dayLabel}
				aria-disabled={state.effectivelyDisabled || undefined}
				aria-current={state.isToday ? 'date' : undefined}
				tabindex={day.iso === seedTabbableIso ? 0 : -1}
				onclick={() => !state.effectivelyDisabled && onDayClick(day.date)}
				onmouseenter={() => !state.effectivelyDisabled && onDayHover(day.date)}
				onmouseleave={() => onDayHover(null)}
			>
				{plainDateFormatDayNumber(day.dayNumber, locale)}
			</button>
		</div>
	{/if}
{/snippet}

<div class="month-grid">
	<!-- APG grid: a header row of columnheaders, then week rows. Focus lives on the day buttons. -->
	<!-- svelte-ignore a11y_interactive_supports_focus -->
	<div
		bind:this={gridEl}
		role="grid"
		class="days"
		class:with-numbers={hasWeekNumbers}
		aria-label={monthLabel}
		aria-multiselectable={mode === 'range' ? true : undefined}
		onkeydown={grid.handleKeyDown}
		onfocusin={grid.handleFocus}
	>
		<div role="row" class="week-row">
			{#if hasWeekNumbers}
				<div role="columnheader" class="day-name week-number-header">
					<VisuallyHidden>{plainDateWeekFieldName(locale)}</VisuallyHidden>
				</div>
			{/if}
			{#each dayNameHeaders as { dayOfWeek, name } (dayOfWeek)}
				<div role="columnheader" class="day-name">{name}</div>
			{/each}
		</div>
		{#each layout.weeks as week (week[0].iso)}
			<div role="row" class="week-row">
				{#if hasWeekNumbers}
					<div role="rowheader" class="week-number">
						{plainDateFormatDayNumber(plainDateGetWeekNumber(rowThursday(week)), locale)}
					</div>
				{/if}
				{#each week as day, dayIndex (day.iso)}
					{@render dayCell(day, dayIndex, week)}
				{/each}
			</div>
		{/each}
	</div>
</div>

<style>
	@layer astryx-base {
		.month-grid {
			flex: 1 1 0;
		}
		.days {
			display: grid;
			/* A column is never narrower than its widest cell, the weekday name included. */
			grid-template-columns: repeat(7, minmax(min-content, 1fr));
		}
		.with-numbers {
			grid-template-columns: auto repeat(7, minmax(min-content, 1fr));
		}
		.week-row {
			display: contents;
		}
		.day-name {
			min-width: var(--size-element-md);
			height: calc(var(--size-element-md) + var(--spacing-1));
			padding-bottom: var(--spacing-1);
			box-sizing: border-box;
			display: flex;
			align-items: center;
			justify-content: center;
			font-size: var(--text-supporting-size);
			line-height: var(--text-supporting-leading);
			font-weight: var(--font-weight-normal);
			color: var(--color-text-secondary);
		}
		.week-number-header {
			width: var(--size-element-md);
		}
		.week-number {
			width: var(--size-element-md);
			height: var(--size-element-md);
			display: flex;
			align-items: center;
			justify-content: center;
			font-size: var(--text-supporting-size);
			line-height: var(--text-supporting-leading);
			color: var(--color-text-secondary);
		}
		/* The 2px band inset is half the gap between the day button and its cell. */
		.cell {
			position: relative;
			display: flex;
			align-items: center;
			justify-content: center;
			min-height: var(--size-element-md);
			box-sizing: border-box;
			padding: 2px;
			isolation: isolate;
		}
		.range-bg,
		.preview-bg {
			position: absolute;
			top: 2px;
			bottom: 2px;
			inset-inline-start: 0;
			inset-inline-end: 0;
		}
		.range-bg {
			background-color: var(--color-accent-muted);
		}
		.preview-bg {
			background-color: var(--color-overlay-hover);
		}
		.inset-start,
		.round-start {
			inset-inline-start: 2px;
		}
		.inset-end,
		.round-end {
			inset-inline-end: 2px;
		}
		.round-start {
			border-start-start-radius: var(--radius-full);
			border-end-start-radius: var(--radius-full);
		}
		.round-end {
			border-start-end-radius: var(--radius-full);
			border-end-end-radius: var(--radius-full);
		}
		.day {
			min-width: var(--size-element-sm);
			min-height: var(--size-element-sm);
			display: flex;
			align-items: center;
			justify-content: center;
			border-radius: var(--radius-full);
			border: none;
			cursor: pointer;
			font-family: inherit;
			font-size: var(--text-body-size);
			line-height: var(--text-body-leading);
			padding: 0;
			position: relative;
			z-index: 1;
			color: var(--color-text-primary);
			background-color: transparent;
			transition-property: background-color, color;
			transition-duration: var(--duration-fast);
			transition-timing-function: var(--ease-standard);
		}
		@media (prefers-reduced-motion: reduce) {
			.day {
				transition: none;
			}
		}
		/* Expand the hit target so adjacent days meet with no gap. */
		.day::before {
			content: '';
			position: absolute;
			inset: -2px;
		}
		@media (hover: hover) {
			.day:not(.disabled):hover {
				background-image: linear-gradient(var(--color-overlay-hover), var(--color-overlay-hover));
			}
		}
		.day:not(.disabled):active {
			background-image: linear-gradient(var(--color-overlay-pressed), var(--color-overlay-pressed));
		}
		.day:focus-visible {
			outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color);
			outline-offset: 2px;
		}
		.outside {
			opacity: 0.5;
			color: var(--color-text-secondary);
		}
		.today {
			box-shadow: inset 0 0 0 1px var(--color-border-emphasized);
		}
		.today-in-range {
			box-shadow: inset 0 0 0 1px var(--color-text-primary);
		}
		.selected {
			/* Forced colors strip the accent fill; Highlight marks the selected control instead. */
			forced-color-adjust: none;
			background-color: var(--color-accent);
			color: var(--color-on-accent);
		}
		@media (forced-colors: active) {
			.selected {
				background-color: Highlight;
				color: HighlightText;
			}
		}
		.disabled {
			cursor: default;
			opacity: 0.3;
		}
	}
</style>
