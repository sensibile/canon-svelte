<!--
  Port of Astryx `MonthScroller` (packages/core/src/DateInput/MonthScroller.tsx), MIT, Meta Platforms, Inc.
  The bottom-sheet calendar: month grids side by side in a horizontal scroller that snaps a month
  at a time. Only the months near the one in view are drawn. A swipe or a scroll that settles on
  a new month reports it; `scrollToMonth` moves there. Arrow keys, Home and End move between days,
  crossing into the next or previous month.
  Port change: Gregorian only. A reduced-motion setting jumps to a month instead of cross-fading,
  and the browser's own snapping settles a scroll (no settle pass or swipe fallback).
-->
<script lang="ts">
	import { tick, untrack } from 'svelte';
	import type { DayOfWeek, ISODateString, PlainDate } from '../../internal/date/dateTypes.js';
	import {
		DATE_FORMAT_WITH_WEEKDAY,
		plainDateAddDays,
		plainDateDayOfWeek,
		plainDateFormatDayNumber,
		plainDateIsEqual,
		plainDateToISO
	} from '../../internal/date/plainDate.js';
	import { formatCalendarDate, formatCalendarMonthLabel, isInCalendarMonth } from '../../internal/date/calendarMonth.js';
	import { calendarMonthWeeks } from '../Calendar/calendarDays.js';
	import { monthAt, monthIndexOf, rowAtScrollOffset, scrollOffsetForRow } from './monthGeometry.js';

	interface Props {
		minMonthIndex: number;
		maxMonthIndex: number;
		/** The month in view when the scroller first has a size. */
		initialMonthIndex: number;
		/** A scroll came to a new month. */
		onVisibleMonthChange: (monthIndex: number) => void;
		selectedDate: PlainDate | null;
		today: PlainDate | null;
		isDateDisabled: (date: PlainDate) => boolean;
		weekStartsOn: DayOfWeek;
		locale: string;
		onSelect: (value: ISODateString) => void;
	}

	let {
		minMonthIndex,
		maxMonthIndex,
		initialMonthIndex,
		onVisibleMonthChange,
		selectedDate,
		today,
		isDateDisabled,
		weekStartsOn,
		locale,
		onSelect
	}: Props = $props();

	/** Months drawn either side of the one in view. */
	const OVERSCAN = 3;

	let scroller: HTMLDivElement | undefined = $state();
	const rowCount = $derived(maxMonthIndex - minMonthIndex + 1);
	let paneSize = $state(0);
	let isRTL = false;
	// svelte-ignore state_referenced_locally (the starting month; later moves go through scrollToMonth)
	let centerRow = $state(initialMonthIndex - minMonthIndex);
	/** The row a moved-to month is heading for; the months it passes don't report. */
	let steered: number | null = null;
	let focusedDate = $state<PlainDate | null>(null);
	let shouldRestoreFocus = false;
	let hasPositioned = false;

	$effect(() => {
		const el = scroller;
		if (!el) return;
		isRTL = getComputedStyle(el).direction === 'rtl';
		const measure = () => {
			if (el.clientWidth > 0) paneSize = el.clientWidth;
		};
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(el);
		return () => observer.disconnect();
	});

	// First size: start on the initial month.
	$effect(() => {
		const el = scroller;
		if (!el || paneSize === 0 || hasPositioned) return;
		hasPositioned = true;
		el.scrollLeft = scrollOffsetForRow(initialMonthIndex - minMonthIndex, paneSize, isRTL);
	});
	// A new size keeps the month in view.
	$effect(() => {
		const size = paneSize;
		if (!scroller || size === 0 || !hasPositioned) return;
		scroller.scrollLeft = scrollOffsetForRow(untrack(() => centerRow), size, isRTL);
	});

	function motion(behavior: ScrollBehavior): ScrollBehavior {
		return behavior === 'smooth' && matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : behavior;
	}

	/** Moves to a month: smoothly when it is near, at once when the months between aren't drawn. */
	export function scrollToMonth(monthIndex: number, behavior: ScrollBehavior = 'smooth') {
		const el = scroller;
		if (!el || paneSize === 0) return;
		const row = Math.min(rowCount - 1, Math.max(0, monthIndex - minMonthIndex));
		const left = scrollOffsetForRow(row, paneSize, isRTL);
		if (Math.abs(row - centerRow) > OVERSCAN || motion(behavior) !== 'smooth') {
			centerRow = row;
			steered = null;
			tick().then(() => el.scrollTo({ left, behavior: 'instant' }));
			return;
		}
		steered = row;
		el.scrollTo({ left, behavior: 'smooth' });
	}

	$effect(() => {
		const el = scroller;
		const size = paneSize;
		if (!el || size === 0) return;
		let frame: number | undefined;
		const onScroll = () => {
			if (frame != null) return;
			frame = requestAnimationFrame(() => {
				frame = undefined;
				const row = rowAtScrollOffset(el.scrollLeft, size, rowCount, isRTL);
				if (row === centerRow) return;
				centerRow = row;
				if (steered != null) {
					if (steered === row) steered = null;
					return;
				}
				onVisibleMonthChange(minMonthIndex + row);
			});
		};
		const endSteer = () => (steered = null);
		el.addEventListener('scroll', onScroll, { passive: true });
		el.addEventListener('touchstart', endSteer, { passive: true });
		el.addEventListener('wheel', endSteer, { passive: true });
		return () => {
			el.removeEventListener('scroll', onScroll);
			el.removeEventListener('touchstart', endSteer);
			el.removeEventListener('wheel', endSteer);
			if (frame != null) cancelAnimationFrame(frame);
		};
	});

	const visibleRows = $derived.by(() => {
		const rows: number[] = [];
		for (let row = Math.max(0, centerRow - OVERSCAN); row <= Math.min(rowCount - 1, centerRow + OVERSCAN); row++) {
			rows.push(row);
		}
		return rows;
	});

	function moveFocus(from: PlainDate, deltaDays: number) {
		const next = plainDateAddDays(from, deltaDays);
		const nextIndex = monthIndexOf(next);
		if (nextIndex < minMonthIndex || nextIndex > maxMonthIndex) return;
		shouldRestoreFocus = true;
		focusedDate = next;
		if (nextIndex === monthIndexOf(from)) return;
		// The scroll this starts is steered, so it reports nothing itself: report the month here.
		scrollToMonth(nextIndex, 'smooth');
		onVisibleMonthChange(nextIndex);
	}

	function onDayKeydown(e: KeyboardEvent, date: PlainDate) {
		const column = (plainDateDayOfWeek(date) - weekStartsOn + 7) % 7;
		const forward = isRTL ? 'ArrowLeft' : 'ArrowRight';
		const backward = isRTL ? 'ArrowRight' : 'ArrowLeft';
		const moves: Record<string, number> = {
			[backward]: -1,
			[forward]: 1,
			ArrowUp: -7,
			ArrowDown: 7,
			Home: -column,
			End: 6 - column
		};
		if (moves[e.key] == null) return;
		e.preventDefault();
		moveFocus(date, moves[e.key]);
	}

	// A day moved to by key takes focus once it is drawn.
	$effect(() => {
		const iso = focusedDate == null ? null : plainDateToISO(focusedDate);
		void visibleRows;
		if (!shouldRestoreFocus || iso == null || !scroller) return;
		const target = scroller.querySelector<HTMLElement>(`[data-date="${iso}"]:not([data-outside])`);
		if (target) {
			shouldRestoreFocus = false;
			target.focus({ preventScroll: true });
		}
	});
</script>

<div bind:this={scroller} class="scroller" data-scroller="months">
	<div class="spacer" style:inline-size="{rowCount * paneSize}px">
		{#if paneSize > 0}
			{#each visibleRows as row (row)}
				{@const month = monthAt(minMonthIndex + row)}
				{@const weeks = calendarMonthWeeks(month, weekStartsOn, false).weeks}
				{@const monthLabel = formatCalendarMonthLabel(month, locale)}
				{@const tabbableISO =
					row !== centerRow
						? null
						: focusedDate != null && isInCalendarMonth(focusedDate, month)
						? plainDateToISO(focusedDate)
						: selectedDate != null && isInCalendarMonth(selectedDate, month)
							? plainDateToISO(selectedDate)
							: plainDateToISO(month.start)}
				<div
					class="pane"
					role="grid"
					aria-label={monthLabel}
					data-month={monthLabel}
					style:inset-inline-start="{row * paneSize}px"
					style:inline-size="{paneSize}px"
				>
					{#each weeks as week (week[0].iso)}
						<div class="row" role="row">
							{#each week as day (day.iso)}
								{@const isDisabled = day.isOutside || isDateDisabled(day.date)}
								{@const isSelected = !day.isOutside && selectedDate != null && plainDateIsEqual(day.date, selectedDate)}
								{@const isToday = !day.isOutside && today != null && plainDateIsEqual(day.date, today)}
								<div class="cell" role="gridcell" aria-selected={isSelected || undefined}>
									<button
										type="button"
										class="day"
										class:outside={day.isOutside}
										class:disabled={isDisabled}
										data-date={day.iso}
										data-outside={day.isOutside ? '' : undefined}
										tabindex={day.iso === tabbableISO ? 0 : -1}
										aria-label={formatCalendarDate(day.date, DATE_FORMAT_WITH_WEEKDAY, locale)}
										aria-disabled={isDisabled || undefined}
										aria-current={isToday ? 'date' : undefined}
										onclick={() => {
											if (!isDisabled) onSelect(day.iso);
										}}
										onfocus={() => {
											if (focusedDate == null || !plainDateIsEqual(focusedDate, day.date)) focusedDate = day.date;
										}}
										onkeydown={(e) => onDayKeydown(e, day.date)}
									>
										<span class="puck" class:hoverable={!isDisabled} class:today={isToday} class:selected={isSelected}>
											{plainDateFormatDayNumber(day.dayNumber, locale)}
										</span>
									</button>
								</div>
							{/each}
						</div>
					{/each}
				</div>
			{/each}
		{/if}
	</div>
</div>

<style>
	@layer astryx-base {
		.scroller {
			position: relative;
			block-size: calc(6 * 44px);
			box-sizing: border-box;
			overflow-x: auto;
			overflow-y: hidden;
			scroll-snap-type: x mandatory;
			overscroll-behavior: contain;
			scrollbar-width: none;
			touch-action: pan-x;
		}
		.scroller::-webkit-scrollbar { display: none; }
		.spacer {
			position: relative;
			block-size: 100%;
		}
		.pane {
			position: absolute;
			inset-block: 0;
			block-size: calc(6 * 44px);
			scroll-snap-align: start;
			display: grid;
			grid-template-columns: repeat(7, 1fr);
			grid-template-rows: repeat(6, 1fr);
		}
		.row { display: contents; }
		.cell {
			position: relative;
			display: flex;
			align-items: center;
			justify-content: center;
		}
		.day {
			display: flex;
			align-items: center;
			justify-content: center;
			inline-size: 100%;
			block-size: 100%;
			min-inline-size: 44px;
			min-block-size: 44px;
			padding: 0;
			border: 0 none;
			background-color: transparent;
			color: var(--color-text-primary);
			font-size: var(--text-body-size);
			line-height: var(--text-body-leading);
			font-weight: var(--font-weight-normal);
			cursor: pointer;
			user-select: none;
			-webkit-tap-highlight-color: transparent;
		}
		.day:focus-visible {
			outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color);
			outline-offset: calc(-1 * var(--focus-outline-width));
		}
		.day.outside {
			color: var(--color-text-secondary);
			opacity: 0.5;
		}
		.day.disabled {
			opacity: 0.3;
			cursor: default;
		}
		.puck {
			display: flex;
			align-items: center;
			justify-content: center;
			inline-size: calc(44px - 8px);
			block-size: calc(44px - 8px);
			border-radius: var(--radius-full);
			border: var(--border-width) solid transparent;
			background-color: transparent;
			transition-property: background-color, color, border-color;
			transition-duration: var(--duration-fast);
		}
		@media (hover: hover) {
			.day:not([aria-disabled='true']):hover .puck.hoverable { background-color: var(--color-overlay-hover); }
		}
		.puck.today {
			border-color: var(--color-border-emphasized);
			font-weight: var(--font-weight-semibold);
		}
		.puck.selected,
		.day:hover .puck.selected {
			background-color: var(--color-accent);
			border-color: var(--color-accent);
			color: var(--color-on-accent);
			font-weight: var(--font-weight-semibold);
		}
	}
</style>
