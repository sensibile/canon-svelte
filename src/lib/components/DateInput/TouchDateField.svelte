<!--
  Port of Astryx `TouchDateField` (packages/core/src/DateInput/TouchDateField.tsx), MIT, Meta Platforms, Inc.
  DateInput's bottom-sheet surface. The field shows the date and takes no typing; a tap, Enter,
  Space or ArrowDown opens a sheet with a month calendar that swipes a month at a time. Picking a
  day commits it. The month and year title swaps the calendar for month and year wheels; Reset
  clears the date and returns to this month; Save closes the sheet.
  Port change: Gregorian only. On a coarse pointer, turning the month wheels with a date picked
  moves the date to the same day of that month, as Astryx does under a finger.
  Not yet ported: `changeAction`, the "tooltip" status variant, and moving focus off a month
  arrow that hides.
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import Field from '../Field/Field.svelte';
	import type { FieldStatusInput, FieldStatusPlacement } from '../Field/types.js';
	import Icon from '../Icon/Icon.svelte';
	import Spinner from '../Spinner/Spinner.svelte';
	import Button from '../Button/Button.svelte';
	import IconButton from '../IconButton/IconButton.svelte';
	import VisuallyHidden from '../VisuallyHidden/VisuallyHidden.svelte';
	import Tooltip from '../Tooltip/Tooltip.svelte';
	import BottomSheet from '../BottomSheet/BottomSheet.svelte';
	import MonthScroller from './MonthScroller.svelte';
	import MonthYearWheels from './MonthYearWheels.svelte';
	import { createDateDisabledCheck } from '../Calendar/calendarDays.js';
	import { getWeekdayHeaders } from '../Calendar/getWeekdayHeaderNames.js';
	import type { SizeValue } from '../../types.js';
	import type { DayOfWeek, DayOfWeekName, ISODateString } from '../../internal/date/dateTypes.js';
	import { normalizeDayOfWeek } from '../../internal/date/dateTypes.js';
	import {
		plainDateFromISO,
		plainDateIsEqual,
		plainDateToISO,
		plainDateToday
	} from '../../internal/date/plainDate.js';
	import { formatCalendarMonthLabel } from '../../internal/date/calendarMonth.js';
	import { TOUCH_POINTER_QUERY } from '../../internal/date/inputPresentation.js';
	import { getInputGroupContext, INPUT_GROUP_ITEM, setInputGroupContext } from '../InputGroup/context.js';
	import { formatCommittedDate } from './typedDate.svelte.js';
	import type { DateInputFormat } from './DateInput.svelte';
	import { clampIndex, DEFAULT_MONTH_REACH, dateInMonth, monthAt, monthIndexOf } from './monthGeometry.js';

	interface Props
		extends Omit<
			HTMLInputAttributes,
			'type' | 'size' | 'value' | 'disabled' | 'readonly' | 'required' | 'onchange' | 'min' | 'max' | 'placeholder'
		> {
		label: string;
		isLabelHidden?: boolean;
		description?: string;
		isOptional?: boolean;
		isRequired?: boolean;
		isDisabled?: boolean;
		disabledMessage?: string;
		value?: ISODateString;
		onChange?: (value: ISODateString | undefined) => void;
		isLoading?: boolean;
		min?: ISODateString;
		max?: ISODateString;
		dateConstraints?: ReadonlyArray<(date: Date) => boolean>;
		placeholder?: string;
		size?: 'sm' | 'md' | 'lg';
		status?: FieldStatusInput;
		statusVariant?: FieldStatusPlacement;
		width?: SizeValue;
		labelTooltip?: string;
		hasClear?: boolean;
		weekStartsOn?: DayOfWeek | DayOfWeekName;
		format?: DateInputFormat | ((value: ISODateString) => string);
		locale?: string;
		containerClass?: string;
		controlClass?: string;
	}

	let {
		label,
		isLabelHidden = false,
		description,
		isOptional = false,
		isRequired = false,
		isDisabled: isDisabledProp = false,
		disabledMessage,
		value = $bindable(),
		onChange,
		isLoading = false,
		min,
		max,
		dateConstraints,
		placeholder: placeholderProp,
		size: sizeProp,
		status,
		statusVariant = 'attached',
		width,
		labelTooltip,
		hasClear = false,
		weekStartsOn: weekStartsOnProp = 0,
		format = 'date_long',
		locale = 'en-US',
		containerClass,
		controlClass,
		id: idProp,
		'aria-describedby': describedByProp,
		'aria-labelledby': labelledByProp,
		onclick,
		onkeydown,
		...rest
	}: Props = $props();

	const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
	const inputGroup = getInputGroupContext();
	setInputGroupContext(null);
	const isDisabled = $derived(isDisabledProp || (inputGroup?.isDisabled ?? false));
	const isLocked = $derived(isDisabled || isLoading);
	const size = $derived(sizeProp ?? inputGroup?.size ?? 'md');
	const placeholder = $derived(placeholderProp ?? 'Select a date');
	const weekStartsOn = $derived(normalizeDayOfWeek(weekStartsOnProp));
	const isDateDisabled = $derived(createDateDisabledCheck({ min, max, dateConstraints }));

	const uid = $props.id();
	const id = $derived(idProp ?? `${uid}-input`);
	const descriptionID = `${uid}-desc`;
	const statusMessageID = `${uid}-status`;
	const disabledMessageID = `${uid}-disabled-reason`;
	const inputLabelID = `${uid}-input-label`;
	const showsDisabledMessage = $derived(isDisabled && !!disabledMessage);
	let inputEl: HTMLInputElement | undefined = $state();
	let scroller: MonthScroller | undefined = $state();
	let isSheetOpen = $state(false);
	let isWheelOpen = $state(false);

	const today = plainDateToday();
	const selectedDate = $derived(value != null && ISO_DATE.test(value) ? plainDateFromISO(value) : null);
	// The months reach from `min` to `max`, or 50 years either side of the date the field opened on.
	// svelte-ignore state_referenced_locally (the anchor is fixed when the field mounts)
	const anchorMonthIndex = monthIndexOf(selectedDate ?? today);
	const minMonthIndex = $derived(min != null ? monthIndexOf(plainDateFromISO(min)) : anchorMonthIndex - DEFAULT_MONTH_REACH);
	const maxMonthIndex = $derived(max != null ? monthIndexOf(plainDateFromISO(max)) : anchorMonthIndex + DEFAULT_MONTH_REACH);
	let chosenMonthIndex = $state<number | null>(null);
	const monthIndex = $derived(clampIndex(chosenMonthIndex ?? anchorMonthIndex, minMonthIndex, maxMonthIndex));
	const monthYearLabel = $derived(formatCalendarMonthLabel(monthAt(monthIndex), locale));
	const weekdayHeaders = $derived(getWeekdayHeaders(locale, weekStartsOn));
	const canStepBack = $derived(monthIndex > minMonthIndex);
	const canStepForward = $derived(monthIndex < maxMonthIndex);

	const displayValue = $derived(
		value != null && ISO_DATE.test(value)
			? formatCommittedDate(value, { format, locale, min, max, isDateDisabled })
			: ''
	);

	function fireChange(next: ISODateString | undefined) {
		if (isLocked) return;
		value = next;
		onChange?.(next);
	}

	function openSheet() {
		if (isLocked) return;
		isWheelOpen = false;
		isSheetOpen = true;
	}

	function handleClear() {
		fireChange(undefined);
		// After the button that had focus goes away.
		setTimeout(() => inputEl?.focus({ preventScroll: true }), 0);
	}

	function goToMonth(target: number, behavior: ScrollBehavior) {
		const next = clampIndex(target, minMonthIndex, maxMonthIndex);
		if (next === monthIndex) return;
		chosenMonthIndex = next;
		scroller?.scrollToMonth(next, behavior);
	}

	function handleReset() {
		if (isDisabled) return;
		fireChange(undefined);
		const thisMonth = monthIndexOf(plainDateToday());
		if (thisMonth >= minMonthIndex && thisMonth <= maxMonthIndex) goToMonth(thisMonth, 'smooth');
	}

	function handleWheelChange(next: number) {
		chosenMonthIndex = next;
		scroller?.scrollToMonth(next, 'auto');
		if (!matchMedia(TOUCH_POINTER_QUERY).matches || selectedDate == null) return;
		const moved = dateInMonth(
			selectedDate,
			next,
			min != null ? plainDateFromISO(min) : null,
			max != null ? plainDateFromISO(max) : null
		);
		if (!plainDateIsEqual(moved, selectedDate) && !isDateDisabled(moved)) fireChange(plainDateToISO(moved));
	}

	// Closing the wheels shows the month they landed on.
	$effect(() => {
		if (!isWheelOpen) untrack(() => scroller?.scrollToMonth(monthIndex, 'auto'));
	});

	function handleInputKeydown(e: KeyboardEvent & { currentTarget: HTMLInputElement }) {
		if (!e.isComposing && e.keyCode !== 229 && ['ArrowDown', 'Enter', ' ', 'Spacebar'].includes(e.key)) {
			e.preventDefault();
			openSheet();
		}
		onkeydown?.(e);
	}

	const describedBy = $derived(
		[
			inputGroup?.describedByIDs,
			description && !inputGroup ? descriptionID : null,
			!inputGroup && status?.message ? statusMessageID : null,
			showsDisabledMessage ? disabledMessageID : null,
			describedByProp
		]
			.filter(Boolean)
			.join(' ') || undefined
	);
	const labelledBy = $derived(
		inputGroup ? [inputGroup.labelID, inputLabelID, labelledByProp].filter(Boolean).join(' ') : labelledByProp
	);
</script>

{#snippet control()}
	<Tooltip content={disabledMessage ?? ''} isEnabled={showsDisabledMessage} focusTrigger="always">
		<div
			class={['astryx-date-input', 'control', controlClass]}
			class:disabled={isDisabled}
			class:in-group={inputGroup != null}
			data-size={size}
			data-status={status?.type}
			data-disabled={isDisabled ? 'disabled' : undefined}
			{...{ [INPUT_GROUP_ITEM]: inputGroup ? '' : undefined }}
		>
			{#if inputGroup}<VisuallyHidden id={inputLabelID}>{label}</VisuallyHidden>{/if}
			<button
				type="button"
				class="icon-button"
				tabindex="-1"
				aria-label="Open calendar"
				aria-disabled={isLocked || undefined}
				onclick={openSheet}
			>
				<Icon icon="calendar" size="sm" color="secondary" />
			</button>
			<input
				{...rest}
				bind:this={inputEl}
				{id}
				type="text"
				role="combobox"
				value={displayValue}
				readonly
				inputmode="none"
				autocomplete="off"
				{placeholder}
				aria-disabled={isLocked ? 'true' : undefined}
				aria-labelledby={labelledBy}
				aria-describedby={describedBy}
				aria-required={isRequired && !isOptional ? 'true' : undefined}
				aria-invalid={status?.type === 'error' ? 'true' : undefined}
				aria-busy={isLoading || undefined}
				aria-expanded={isSheetOpen}
				aria-haspopup="dialog"
				aria-autocomplete="none"
				onclick={(e) => {
					if (isLocked) return;
					openSheet();
					onclick?.(e);
				}}
				onkeydown={handleInputKeydown}
			/>
			{#if hasClear && value !== undefined && !isLocked}
				<Button
					class="astryx-input-clear-button input-clear"
					variant="ghost"
					size="sm"
					label="Clear {label}"
					icon="close"
					isIconOnly
					onmousedown={(e) => e.preventDefault()}
					onclick={handleClear}
				/>
			{/if}
			{#if isLoading}<Spinner size="sm" aria-hidden="true" />{/if}
			{#if status}<Icon icon={status.type} size="md" color={status.type} />{/if}
		</div>
	</Tooltip>
	{#if showsDisabledMessage}
		<VisuallyHidden id={disabledMessageID}>{disabledMessage}</VisuallyHidden>
	{/if}
	<BottomSheet isOpen={isSheetOpen} onOpenChange={(open) => (isSheetOpen = open)} label="Choose a date" height="hug" padding={0}>
		<div class="sheet-body">
			<div class="header">
				<button
					type="button"
					class="title"
					data-title="month-year"
					aria-expanded={isWheelOpen}
					aria-label="Choose month and year, {monthYearLabel}"
					onclick={() => (isWheelOpen = !isWheelOpen)}
				>
					<span class="title-text">{monthYearLabel}</span>
					<span class="title-chevron" class:open={isWheelOpen}><Icon icon="chevronDown" size="sm" color="secondary" /></span>
				</button>
				<span class="month-arrows swap" class:hidden={isWheelOpen} inert={isWheelOpen || undefined} data-arrows="months">
					<IconButton
						class={['month-arrow', !canStepBack && 'unavailable']}
						variant="ghost"
						size="sm"
						icon="chevronLeft"
						label="Previous month"
						isDisabled={!canStepBack}
						onclick={() => goToMonth(monthIndex - 1, 'smooth')}
					/>
					<IconButton
						class={['month-arrow', !canStepForward && 'unavailable']}
						variant="ghost"
						size="sm"
						icon="chevronRight"
						label="Next month"
						isDisabled={!canStepForward}
						onclick={() => goToMonth(monthIndex + 1, 'smooth')}
					/>
				</span>
				<span class="reset swap" class:hidden={isWheelOpen} inert={isWheelOpen || undefined} data-action="reset">
					<Button variant="ghost" size="sm" label="Reset" onclick={handleReset} />
				</span>
			</div>
			<div class="weekdays swap" class:hidden={isWheelOpen} aria-hidden="true">
				{#each weekdayHeaders as header (header.dayOfWeek)}
					<div class="weekday">{header.name}</div>
				{/each}
			</div>
			<div class="body">
				<div class="panel beneath" class:hidden={isWheelOpen} inert={isWheelOpen || undefined} data-panel="calendar">
					{#key `${minMonthIndex}:${maxMonthIndex}`}
						<MonthScroller
							bind:this={scroller}
							{minMonthIndex}
							{maxMonthIndex}
							initialMonthIndex={monthIndex}
							onVisibleMonthChange={(next) => {
								if (!isWheelOpen) chosenMonthIndex = next;
							}}
							{selectedDate}
							{today}
							{isDateDisabled}
							{weekStartsOn}
							{locale}
							onSelect={(iso) => fireChange(iso)}
						/>
					{/key}
				</div>
				<div class="panel overlay swap" class:hidden={!isWheelOpen} inert={!isWheelOpen || undefined} data-panel="wheels">
					<MonthYearWheels
						{monthIndex}
						{minMonthIndex}
						{maxMonthIndex}
						{locale}
						onChange={handleWheelChange}
						isActive={isSheetOpen && isWheelOpen}
					/>
				</div>
			</div>
			<div class="footer">
				<div class="footer-action beneath" class:hidden={isWheelOpen} inert={isWheelOpen || undefined}>
					<Button variant="primary" size="md" width="100%" label="Save" onclick={() => (isSheetOpen = false)} />
				</div>
				<div class="footer-action overlay swap" class:hidden={!isWheelOpen} inert={!isWheelOpen || undefined}>
					<Button variant="secondary" size="md" width="100%" label="Done" onclick={() => (isWheelOpen = false)} />
				</div>
			</div>
		</div>
	</BottomSheet>
{/snippet}

{#if inputGroup}
	{@render control()}
{:else}
	<Field
		class={containerClass}
		{label}
		{isLabelHidden}
		{description}
		inputID={id}
		descriptionID={description ? descriptionID : undefined}
		{isOptional}
		{isRequired}
		{isDisabled}
		{labelTooltip}
		status={status
			? { type: status.type, message: status.message, messageID: status.message ? statusMessageID : undefined }
			: undefined}
		{statusVariant}
		{width}
	>
		{@render control()}
	</Field>
{/if}

<style>
	@layer astryx-base {
		.control {
			box-sizing: border-box;
			position: relative;
			z-index: 1;
			display: flex;
			align-items: center;
			gap: var(--spacing-2);
			padding-block: var(--spacing-1);
			padding-inline: var(--spacing-2);
			min-width: 180px;
			border: var(--border-width) solid var(--color-border-emphasized);
			--_field-radius: var(--radius-element);
			border-radius: var(--_field-radius);
			background-color: var(--color-background-surface);
			transition-property: border-color, box-shadow;
			transition-duration: var(--duration-fast);
			transition-timing-function: var(--ease-standard);
			outline: none;
		}
		@media (prefers-reduced-motion: reduce), (pointer: coarse) {
			.control { transition-duration: 0s; }
		}
		@media (hover: hover) {
			.control:not(.disabled):hover:not(:focus-within) {
				box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--color-border-emphasized) 30%, transparent);
			}
			.control[data-status='warning']:not(.disabled):hover:not(:focus-within) { box-shadow: var(--shadow-inset-warning); }
			.control[data-status='error']:not(.disabled):hover:not(:focus-within) { box-shadow: var(--shadow-inset-error); }
			.control[data-status='success']:not(.disabled):hover:not(:focus-within) { box-shadow: var(--shadow-inset-success); }
		}
		.control:focus-within {
			border-color: var(--color-accent);
			box-shadow: inset 0 0 0 2px var(--color-accent-muted);
		}
		@media (forced-colors: active) {
			.control:focus-within { border-color: Highlight; }
		}
		.control[data-status='warning'] { border-color: var(--color-border-warning); }
		.control[data-status='error'] { border-color: var(--color-border-error); }
		.control[data-status='success'] { border-color: var(--color-border-success); }
		.in-group { flex: 1; min-width: 0; }
		.in-group.disabled { opacity: 1; }
		.disabled { opacity: 0.5; border-color: var(--color-border-emphasized); box-shadow: none; }
		.disabled:focus-within { box-shadow: none; }
		.control[data-size='sm'] { height: var(--size-element-sm); }
		.control[data-size='md'] { height: var(--size-element-md); }
		.control[data-size='lg'] { height: var(--size-element-lg); }

		.icon-button {
			display: flex;
			align-items: center;
			justify-content: center;
			flex-shrink: 0;
			padding: 0;
			margin: 0;
			border: 0 none;
			background-color: transparent;
			border-radius: var(--radius-element);
			cursor: pointer;
		}
		.icon-button[aria-disabled='true'] { cursor: default; }
		.icon-button:focus-visible {
			outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color);
		}
		input {
			display: block;
			flex: 1;
			min-width: 0;
			border: 0 none;
			padding: 0;
			font-family: var(--font-family-body);
			font-size: var(--text-body-size);
			line-height: var(--text-body-leading);
			color: var(--color-text-primary);
			background-color: transparent;
			outline: none;
			caret-color: transparent;
			cursor: pointer;
			user-select: none;
		}
		@media (pointer: coarse) {
			@supports (-webkit-touch-callout: none) {
				input { font-size: max(1rem, var(--text-body-size)); }
			}
		}
		input::placeholder { color: var(--color-text-secondary); }
		input[aria-disabled='true'] { cursor: default; }
		.control :global(.input-clear) { height: 20px; color: var(--color-icon-secondary); }

		.sheet-body {
			display: flex;
			flex-direction: column;
			inline-size: 100%;
			padding-inline: var(--spacing-4);
			padding-block: 0 var(--spacing-4);
			box-sizing: border-box;
		}
		.header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: var(--spacing-2);
			block-size: var(--size-element-lg);
		}
		.title {
			display: flex;
			align-items: center;
			gap: var(--spacing-1);
			block-size: 100%;
			padding-inline: var(--spacing-2);
			margin-inline-start: calc(-1 * var(--spacing-2));
			border: 0 none;
			border-radius: var(--radius-element);
			background-color: transparent;
			color: var(--color-text-primary);
			font-size: var(--text-large-size);
			line-height: var(--text-large-leading);
			font-weight: var(--font-weight-semibold);
			cursor: pointer;
			white-space: nowrap;
			min-inline-size: 0;
			overflow: hidden;
		}
		@media (hover: hover) {
			.title:hover { background-color: var(--color-overlay-hover); }
		}
		.title:focus-visible {
			outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color);
		}
		.title-text {
			min-inline-size: 0;
			overflow: hidden;
			text-overflow: ellipsis;
		}
		.title-chevron {
			display: inline-flex;
			flex-shrink: 0;
			transition: transform var(--duration-fast) var(--ease-standard);
		}
		.title-chevron.open { transform: rotate(180deg); }
		.month-arrows {
			display: flex;
			align-items: center;
			gap: var(--spacing-0-5);
			margin-inline-start: auto;
		}
		.month-arrows :global(.month-arrow.unavailable) { visibility: hidden; }
		.month-arrows :global(.month-arrow:dir(rtl) svg) { transform: scaleX(-1); }
		@media (pointer: coarse) {
			.month-arrows :global(.month-arrow),
			.reset :global(button) { min-block-size: 44px; }
			.month-arrows :global(.month-arrow) { min-inline-size: 44px; }
		}
		.reset {
			display: flex;
			align-items: center;
		}
		.swap {
			transition-property: opacity, visibility;
			transition-duration: var(--duration-fast);
			transition-timing-function: linear;
		}
		.swap.hidden {
			visibility: hidden;
			opacity: 0;
			pointer-events: none;
		}
		.weekdays {
			display: grid;
			grid-template-columns: repeat(7, 1fr);
			block-size: var(--size-element-sm);
			align-items: center;
		}
		.weekday {
			text-align: center;
			font-size: var(--text-supporting-size);
			line-height: var(--text-supporting-leading);
			color: var(--color-text-secondary);
		}
		.body {
			display: grid;
			block-size: calc(6 * 44px);
			position: relative;
		}
		.panel {
			grid-area: 1 / 1;
			min-width: 0;
		}
		.beneath {
			transition: visibility var(--duration-fast);
		}
		.beneath.hidden {
			visibility: hidden;
			pointer-events: none;
		}
		.overlay {
			background-color: var(--color-background-surface);
			isolation: isolate;
		}
		.footer {
			padding-block-start: var(--spacing-2);
			display: grid;
			grid-template-columns: 1fr;
		}
		.footer-action {
			grid-area: 1 / 1;
			display: flex;
		}
		@media (prefers-reduced-motion: reduce) {
			.swap,
			.beneath,
			.title-chevron { transition-duration: 0.01s; }
		}
	}
</style>
