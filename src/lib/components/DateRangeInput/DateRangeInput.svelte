<!--
  Port of Astryx `DateRangeInput` (packages/core/src/DateRangeInput/DateRangeInput.tsx), MIT,
  Meta Platforms, Inc. A button that shows the selected range and opens a popover with a range
  calendar and optional preset ranges. Values are `{start, end}` ISO dates, or null; use
  `bind:value`, or `value` + `onChange(value)`. Picking a range or a preset closes the popover.
  Gregorian only (pass `locale`). Not yet ported: `changeAction` (optimistic async change), the
  busy announcement, the "tooltip" status variant, and the bottom-sheet presentation for touch.
-->
<script lang="ts" module>
	import type { DateRange } from '../../internal/date/dateTypes.js';

	export type DateRangeInputSize = 'sm' | 'md' | 'lg';
	export interface DateRangePreset {
		label: string;
		getRange: () => DateRange;
	}
</script>

<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';
	import Field from '../Field/Field.svelte';
	import type { FieldStatusInput, FieldStatusPlacement } from '../Field/types.js';
	import Icon from '../Icon/Icon.svelte';
	import Spinner from '../Spinner/Spinner.svelte';
	import Button from '../Button/Button.svelte';
	import VisuallyHidden from '../VisuallyHidden/VisuallyHidden.svelte';
	import Tooltip from '../Tooltip/Tooltip.svelte';
	import Calendar from '../Calendar/Calendar.svelte';
	import { createDateDisabledCheck } from '../Calendar/calendarDays.js';
	import DatePopover from '../DateInput/DatePopover.svelte';
	import type { DayOfWeek, DayOfWeekName, ISODateString } from '../../internal/date/dateTypes.js';
	import {
		DATE_FORMAT_SHORT,
		DATE_FORMAT_SHORT_WITH_YEAR,
		plainDateDiffDays,
		plainDateFromISO,
		plainDateToday,
		type PlainDate
	} from '../../internal/date/plainDate.js';
	import { formatCalendarDate } from '../../internal/date/calendarMonth.js';
	import type { SizeValue } from '../../types.js';

	interface Props
		extends Omit<HTMLButtonAttributes, 'type' | 'value' | 'disabled' | 'onchange' | 'placeholder'> {
		label: string;
		isLabelHidden?: boolean;
		description?: string;
		isOptional?: boolean;
		isRequired?: boolean;
		isDisabled?: boolean;
		/** Why the input is disabled; shown in a tooltip on hover and focus while disabled. */
		disabledMessage?: string;
		/** The selected range, or null. */
		value?: DateRange | null;
		/** Called when the range changes; with null when it is cleared. */
		onChange?: (value: DateRange | null) => void;
		/** Busy: the trigger stays focusable, shows a spinner, and opens nothing. */
		isLoading?: boolean;
		min?: ISODateString;
		max?: ISODateString;
		/** A date is disabled if ANY of these returns false. */
		dateConstraints?: ReadonlyArray<(date: Date) => boolean>;
		/** The most days a range may span, counting both ends. Constrains picking, not `value`. */
		maxRangeSpan?: number;
		/** The fewest days a range must span, counting both ends. Default 1. */
		minRangeSpan?: number;
		/**
		 * Quick picks beside the calendar. A preset is disabled when either end violates `min`,
		 * `max` or `dateConstraints`, or its span violates `minRangeSpan` or `maxRangeSpan`.
		 */
		presets?: ReadonlyArray<DateRangePreset>;
		/** Show a clear button while a range is set. */
		hasClear?: boolean;
		/** Shown while no range is set. */
		placeholder?: string;
		size?: DateRangeInputSize;
		status?: FieldStatusInput;
		statusVariant?: FieldStatusPlacement;
		width?: SizeValue;
		/** Help text shown in an InfoTip next to the label. */
		labelTooltip?: string;
		/** Months shown in the calendar popover. */
		numberOfMonths?: 1 | 2;
		weekStartsOn?: DayOfWeek | DayOfWeekName;
		/** Locale for the trigger text and the calendar. */
		locale?: string;
		/** Class for the outer Field container. */
		containerClass?: string;
		/** Class for the bordered control row. */
		controlClass?: string;
	}

	let {
		label,
		isLabelHidden = false,
		description,
		isOptional = false,
		isRequired = false,
		isDisabled = false,
		disabledMessage,
		value = $bindable(null),
		onChange,
		isLoading = false,
		min,
		max,
		dateConstraints,
		maxRangeSpan,
		minRangeSpan,
		presets,
		hasClear = true,
		placeholder: placeholderProp,
		size = 'md',
		status,
		statusVariant = 'attached',
		width,
		labelTooltip,
		numberOfMonths = 2,
		weekStartsOn,
		locale = 'en-US',
		containerClass,
		controlClass,
		id: idProp,
		'aria-describedby': describedByProp,
		'aria-label': ariaLabelProp,
		'aria-labelledby': labelledByProp,
		onclick,
		...rest
	}: Props = $props();

	const placeholder = $derived(placeholderProp ?? 'Select date range');
	const isBusy = $derived(isLoading);
	const isEffectivelyDisabled = $derived(isDisabled || isBusy);
	const isEffectivelyRequired = $derived(isRequired && !isOptional);
	const showsDisabledMessage = $derived(isDisabled && !!disabledMessage);

	const uid = $props.id();
	const id = $derived(idProp ?? `${uid}-trigger`);
	const triggerNameID = `${uid}-name`;
	const descriptionID = `${uid}-desc`;
	const statusMessageID = `${uid}-status`;
	const requiredID = `${uid}-required`;
	const disabledMessageID = `${uid}-disabled-reason`;

	let triggerEl: HTMLButtonElement | undefined = $state();
	let fieldEl: HTMLDivElement | undefined = $state();
	let isOpen = $state(false);

	// While today is unknown (server render, hydration) the year shows.
	let today = $state<PlainDate | null>(null);
	$effect(() => {
		today = plainDateToday();
	});

	const displayValue = $derived.by(() => {
		if (!value) return '';
		const start = plainDateFromISO(value.start);
		const end = plainDateFromISO(value.end);
		const sameYear = today != null && start.year === end.year && start.year === today.year;
		const fmt = sameYear ? DATE_FORMAT_SHORT : DATE_FORMAT_SHORT_WITH_YEAR;
		return `${formatCalendarDate(start, fmt, locale)} – ${formatCalendarDate(end, fmt, locale)}`;
	});
	const triggerAriaLabel = $derived(`${label}: ${value ? displayValue : placeholder}`);

	const describedBy = $derived(
		[
			description ? descriptionID : null,
			status?.message ? statusMessageID : null,
			// A button cannot carry aria-required: describe it with visually hidden required text.
			isEffectivelyRequired ? requiredID : null,
			showsDisabledMessage ? disabledMessageID : null,
			describedByProp
		]
			.filter(Boolean)
			.join(' ') || undefined
	);

	const isDateDisabled = $derived(createDateDisabledCheck({ min, max, dateConstraints }));

	function isRangeEqual(a: DateRange | null | undefined, b: DateRange): boolean {
		return a != null && a.start === b.start && a.end === b.end;
	}

	// A preset outside the span bounds is disabled rather than allowed to override them.
	function isRangeWithinSpan(range: DateRange): boolean {
		if (maxRangeSpan == null && minRangeSpan == null) return true;
		const span = Math.abs(plainDateDiffDays(plainDateFromISO(range.start), plainDateFromISO(range.end))) + 1;
		if (maxRangeSpan != null && span > maxRangeSpan) return false;
		if (minRangeSpan != null && span < minRangeSpan) return false;
		return true;
	}

	function fireChange(next: DateRange | null) {
		if (isEffectivelyDisabled) return;
		value = next;
		onChange?.(next);
	}

	function hide(restoreFocus: boolean) {
		isOpen = false;
		if (restoreFocus) triggerEl?.focus({ preventScroll: true });
	}

	function handleToggle() {
		if (isEffectivelyDisabled) return;
		isOpen = !isOpen;
	}

	function handleRangeSelect(range: DateRange) {
		// An open calendar can outlive an enabled owner: reject the whole pick.
		if (isDisabled) return;
		fireChange(range);
		hide(true);
	}

	function handleClear(e: MouseEvent) {
		e.stopPropagation();
		fireChange(null);
		// A keyboard activation leaves focus on the clear button, which unmounts: hand it over.
		if (e.detail === 0) triggerEl?.focus();
	}

	function isOwnPress(target: EventTarget | null): boolean {
		if (!(target instanceof Node)) return false;
		if (fieldEl?.contains(target)) return true;
		return target instanceof HTMLLabelElement && target.control === triggerEl;
	}
</script>

<Field
	class={containerClass}
	{label}
	{isLabelHidden}
	{description}
	inputID={id}
	descriptionID={description ? descriptionID : undefined}
	{isOptional}
	{isRequired}
	isDisabled={isEffectivelyDisabled}
	{labelTooltip}
	status={status
		? { type: status.type, message: status.message, messageID: status.message ? statusMessageID : undefined }
		: undefined}
	{statusVariant}
	{width}
>
	<Tooltip content={disabledMessage ?? ''} isEnabled={showsDisabledMessage} focusTrigger="always">
		<div
			bind:this={fieldEl}
			class={['astryx-date-range-input', 'control', controlClass]}
			class:disabled={isEffectivelyDisabled}
			data-size={size}
			data-status={status?.type}
			data-disabled={isDisabled ? 'disabled' : undefined}
		>
			<button
				type="button"
				class="icon-button"
				tabindex={-1}
				aria-disabled={isEffectivelyDisabled || undefined}
				aria-label={isOpen ? 'Close calendar' : 'Open calendar'}
				onclick={handleToggle}
			>
				<span
					class="astryx-date-range-input-toggle-icon"
					data-state={isOpen ? 'expanded' : 'collapsed'}
					style="display: contents"
				>
					<Icon icon="calendar" size="sm" color="secondary" />
				</span>
			</button>
			<!-- Astryx marks the trigger invalid too; a status error reaches the button's description. -->
			<!-- svelte-ignore a11y_role_supports_aria_props_implicit -->
			<button
				{...rest}
				bind:this={triggerEl}
				{id}
				type="button"
				class="trigger"
				class:placeholder={!displayValue}
				onclick={(e) => {
					// The browser still clicks an aria-disabled button: skip the caller's handler too.
					if (isEffectivelyDisabled) return;
					handleToggle();
					onclick?.(e);
				}}
				aria-disabled={isEffectivelyDisabled ? 'true' : undefined}
				aria-label={ariaLabelProp ?? triggerAriaLabel}
				aria-labelledby={labelledByProp != null ? `${triggerNameID} ${labelledByProp}` : undefined}
				aria-describedby={describedBy}
				aria-invalid={status?.type === 'error' ? 'true' : undefined}
				aria-busy={isBusy || undefined}
				aria-expanded={isOpen}
				aria-haspopup="dialog"
				aria-controls={isOpen ? `${uid}-calendar` : undefined}
			>
				{displayValue || placeholder}
			</button>
			{#if hasClear && value != null && !isEffectivelyDisabled}
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
			{#if labelledByProp != null}
				<VisuallyHidden id={triggerNameID}>{ariaLabelProp ?? triggerAriaLabel}</VisuallyHidden>
			{/if}
			{#if isBusy}<Spinner size="sm" aria-hidden="true" />{/if}
			{#if status}<Icon icon={status.type} size="md" color={status.type} />{/if}
		</div>
	</Tooltip>
	{#if isEffectivelyRequired}
		<VisuallyHidden id={requiredID}>Required</VisuallyHidden>
	{/if}
	{#if showsDisabledMessage}
		<VisuallyHidden id={disabledMessageID}>{disabledMessage}</VisuallyHidden>
	{/if}
	<DatePopover
		open={isOpen}
		anchor={fieldEl}
		id="{uid}-calendar"
		label="Choose date range"
		closeLabel="Close calendar"
		{isOwnPress}
		onDismiss={hide}
		autoFocus
		initialFocus="first"
	>
		<div class="popover-scroll">
			<div class="popover-layout">
				{#if presets && presets.length > 0}
					<div role="group" aria-label="Preset date ranges" class="astryx-date-range-input-presets presets">
						{#each presets as preset (preset.label)}
							{@const range = preset.getRange()}
							{@const isActive = isRangeEqual(value, range)}
							{@const isPresetDisabled =
								isDisabled ||
								!isRangeWithinSpan(range) ||
								isDateDisabled(plainDateFromISO(range.start)) ||
								isDateDisabled(plainDateFromISO(range.end))}
							<button
								type="button"
								class="astryx-date-range-input-preset preset"
								data-selected={isActive ? 'selected' : undefined}
								data-disabled={isPresetDisabled ? 'disabled' : undefined}
								aria-current={isActive ? 'true' : undefined}
								aria-disabled={isPresetDisabled || undefined}
								aria-describedby={showsDisabledMessage ? disabledMessageID : undefined}
								onclick={() => {
									if (!isPresetDisabled) handleRangeSelect(range);
								}}
							>
								{preset.label}
							</button>
						{/each}
					</div>
				{/if}
				<!-- Mount the calendar only while open, so it opens on the current value. -->
				{#if isOpen}
					<Calendar
						class={presets && presets.length > 0 ? 'calendar-pane' : undefined}
						mode="range"
						value={value ?? null}
						onChange={handleRangeSelect as (value: DateRange) => void}
						{min}
						{max}
						{dateConstraints}
						{maxRangeSpan}
						{minRangeSpan}
						{numberOfMonths}
						{weekStartsOn}
						{locale}
					/>
				{/if}
			</div>
		</div>
	</DatePopover>
</Field>

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
			box-shadow: none;
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
		.disabled { opacity: 0.5; border-color: var(--color-border-emphasized); box-shadow: none; }
		.disabled:focus-within { box-shadow: none; }

		.control[data-size='sm'] { height: max(var(--size-element-sm), calc(var(--text-body-size) * var(--text-body-leading) + 2 * var(--border-width))); }
		.control[data-size='md'] { height: max(var(--size-element-md), calc(var(--text-body-size) * var(--text-body-leading) + 2 * var(--border-width))); }
		.control[data-size='lg'] { height: max(var(--size-element-lg), calc(var(--text-body-size) * var(--text-body-leading) + 2 * var(--border-width))); }

		.icon-button {
			display: flex;
			align-items: center;
			justify-content: center;
			padding: 0;
			margin: 0;
			border: none;
			background-color: transparent;
			cursor: pointer;
			border-radius: var(--radius-element);
			color: inherit;
		}
		.icon-button[aria-disabled='true'] { cursor: default; }

		.trigger {
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
			cursor: pointer;
			text-align: start;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}
		@media (pointer: coarse) {
			@supports (-webkit-touch-callout: none) {
				.trigger { font-size: max(1rem, var(--text-body-size)); }
			}
		}
		.trigger.placeholder { color: var(--color-text-secondary); }
		.trigger[aria-disabled='true'] { cursor: default; }
		.control :global(.input-clear) { height: 20px; color: var(--color-icon-secondary); }

		/* The content scrolls inside the layer's height cap, so a stacked calendar stays reachable. */
		.popover-scroll {
			overflow-y: auto;
			overscroll-behavior: contain;
			max-block-size: calc(100vh - 16px);
		}
		/*
		 * When the presets and a one-month calendar don't fit side by side, the row wraps and the
		 * presets stack above. The group draws dividers on its inline end and block end, each pushed
		 * one border width past its margin box; the row clips, so only the divider between the two
		 * parts shows.
		 */
		.popover-layout {
			display: flex;
			flex-wrap: wrap;
			overflow: clip;
		}
		.presets {
			display: flex;
			flex-direction: column;
			gap: var(--spacing-1);
			padding: var(--spacing-3);
			border-inline-end: var(--border-width) solid var(--color-border-emphasized);
			border-block-end: var(--border-width) solid var(--color-border-emphasized);
			margin-inline-end: calc(-1 * var(--border-width));
			margin-block-end: calc(-1 * var(--border-width));
			flex-grow: 1;
			min-width: 140px;
		}
		.popover-layout :global(.calendar-pane) {
			margin-inline-start: var(--border-width);
			flex-basis: min-content;
			flex-grow: 1000000;
		}
		.preset {
			display: block;
			width: 100%;
			padding: var(--spacing-1) var(--spacing-2);
			margin: 0;
			border: 0 none;
			border-radius: var(--radius-element);
			background-color: transparent;
			font-family: var(--font-family-body);
			font-size: var(--text-label-size);
			line-height: var(--text-label-leading);
			color: var(--color-text-primary);
			cursor: pointer;
			text-align: start;
		}
		@media (hover: hover) {
			.preset:hover:not([aria-disabled='true']) { background-color: var(--color-overlay-hover); }
		}
		.preset:focus-visible {
			outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color);
			outline-offset: 2px;
		}
		.preset[aria-current='true'] {
			background-color: var(--color-accent-muted);
			color: var(--color-text-accent);
		}
		.preset[aria-disabled='true'] {
			color: var(--color-text-disabled);
			cursor: default;
			background-color: transparent;
		}
	}
</style>
