<!--
  Port of Astryx `NativeDateField` (packages/core/src/DateInput/NativeDateField.tsx), MIT, Meta Platforms, Inc.
  DateInput's native surface: the browser's own `<input type="date">` in the field. Where the
  browser only opens a picker (iOS), the field's formatted date shows over it; where it edits in
  place, its segments show while it has focus. A date outside `min`, `max` or `dateConstraints`
  is refused: the field keeps its date, and at blur or Enter it shows why and reports it through
  `onEntryErrorChange`. Clearing the control commits undefined.
  Not yet ported: `changeAction` and the "tooltip" status variant.
-->
<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import Field from '../Field/Field.svelte';
	import type { FieldStatusInput, FieldStatusPlacement } from '../Field/types.js';
	import Icon from '../Icon/Icon.svelte';
	import Spinner from '../Spinner/Spinner.svelte';
	import Button from '../Button/Button.svelte';
	import VisuallyHidden from '../VisuallyHidden/VisuallyHidden.svelte';
	import Tooltip from '../Tooltip/Tooltip.svelte';
	import { createDateDisabledCheck } from '../Calendar/calendarDays.js';
	import type { SizeValue } from '../../types.js';
	import type { ISODateString, PlainDate } from '../../internal/date/dateTypes.js';
	import { plainDateFromISO, plainDateIsAfter, plainDateIsBefore, plainDateToISO } from '../../internal/date/plainDate.js';
	import { hasEditableDateSegments } from '../../internal/date/nativeDateSegments.js';
	import { TOUCH_POINTER_QUERY } from '../../internal/date/inputPresentation.js';
	import { getInputGroupContext, INPUT_GROUP_ITEM, setInputGroupContext } from '../InputGroup/context.js';
	import { formatCommittedDate, typedDateErrorMessage, type DateInputEntryError } from './typedDate.svelte.js';
	import type { DateInputFormat } from './DateInput.svelte';

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
		onEntryErrorChange?: (error: DateInputEntryError | null) => void;
		statusVariant?: FieldStatusPlacement;
		width?: SizeValue;
		labelTooltip?: string;
		hasClear?: boolean;
		format?: DateInputFormat | ((value: ISODateString) => string);
		locale?: string;
		hasAutoFocus?: boolean;
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
		onEntryErrorChange,
		statusVariant = 'attached',
		width,
		labelTooltip,
		hasClear = false,
		format = 'date_long',
		locale = 'en-US',
		hasAutoFocus = false,
		containerClass,
		controlClass,
		id: idProp,
		'aria-describedby': describedByProp,
		'aria-labelledby': labelledByProp,
		onfocus,
		onblur,
		onkeydown,
		onkeyup,
		name,
		...rest
	}: Props = $props();

	const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
	const inputGroup = getInputGroupContext();
	setInputGroupContext(null);
	const isDisabled = $derived(isDisabledProp || (inputGroup?.isDisabled ?? false));
	const isLocked = $derived(isDisabled || isLoading);
	const size = $derived(sizeProp ?? inputGroup?.size ?? 'md');
	const placeholder = $derived(placeholderProp ?? 'Select a date');
	const isDateDisabled = $derived(createDateDisabledCheck({ min, max, dateConstraints }));
	const dateOptions = $derived({ format, locale, min, max, isDateDisabled });

	const uid = $props.id();
	const id = $derived(idProp ?? `${uid}-input`);
	const descriptionID = `${uid}-desc`;
	const statusMessageID = `${uid}-status`;
	const disabledMessageID = `${uid}-disabled-reason`;
	const inputLabelID = `${uid}-input-label`;
	const showsDisabledMessage = $derived(isDisabled && !!disabledMessage);
	let inputEl: HTMLInputElement | undefined = $state();
	let isFocused = $state(false);
	let isSegmentEditable = $state(false);

	// A refused date is held while the control has focus, and shown once it commits (blur or Enter).
	let held = $state<{ text: string; date: PlainDate } | null>(null);
	let shown = $state<{ text: string; date: PlainDate } | null>(null);
	const message = $derived(
		!isLocked && shown != null
			? typedDateErrorMessage({ kind: 'outOfRange', date: shown.date, isComplete: true }, dateOptions)
			: null
	);
	const callerErrorMessage = $derived(
		onEntryErrorChange != null && status?.type === 'error' && status.message ? status.message : null
	);
	const fieldStatus: FieldStatusInput | undefined = $derived(
		message == null || callerErrorMessage != null ? status : { type: 'error', message }
	);
	// The rejection message that a Field around the input does not announce.
	const alertMessage = $derived(message != null && inputGroup ? (callerErrorMessage ?? message) : '');

	function entryErrorOf(refusal: { text: string; date: PlainDate } | null): DateInputEntryError | null {
		if (refusal == null || isLocked) return null;
		const outside =
			(min != null && plainDateIsBefore(refusal.date, plainDateFromISO(min))) ||
			(max != null && plainDateIsAfter(refusal.date, plainDateFromISO(max)));
		return { kind: outside ? 'outOfRange' : 'unavailable', text: refusal.text, date: plainDateToISO(refusal.date) };
	}
	let reported: DateInputEntryError | null = null;
	$effect(() => {
		const error = entryErrorOf(shown);
		if (onEntryErrorChange == null) return;
		const same =
			error === reported ||
			(error != null && reported != null && error.kind === reported.kind && error.date === reported.date);
		if (same) return;
		reported = error;
		onEntryErrorChange(error);
	});
	$effect(() => () => {
		if (reported != null) onEntryErrorChange?.(null);
	});

	// A value from outside replaces a refusal, and shows in the control even while it has focus.
	let lastValue = $state.snapshot(value);
	$effect(() => {
		if (value !== lastValue) {
			lastValue = value;
			held = null;
			shown = null;
			if (inputEl) inputEl.value = value != null && ISO_DATE.test(value) ? value : '';
		}
	});

	const nativeValue = $derived(value != null && ISO_DATE.test(value) ? value : '');
	const overlayText = $derived(nativeValue ? formatCommittedDate(nativeValue as ISODateString, dateOptions) : placeholder);
	const showsOverlay = $derived(!!overlayText && !(isFocused && isSegmentEditable));

	function fireChange(next: ISODateString | undefined) {
		if (isLocked) return;
		lastValue = next;
		value = next;
		onChange?.(next);
	}

	function commitText(text: string) {
		if (isLocked) return;
		if (!text) {
			// Deleting one segment leaves the control empty but holding a partial entry: that isn't a clear.
			if (inputEl?.validity.badInput) return;
			held = null;
			shown = null;
			if (value !== undefined) fireChange(undefined);
			return;
		}
		// Half-entered segments read as no date yet.
		if (!ISO_DATE.test(text)) return;
		const date = plainDateFromISO(text as ISODateString);
		if (isDateDisabled(date)) {
			held = { text, date };
			return;
		}
		held = null;
		shown = null;
		if (text !== value) fireChange(text as ISODateString);
	}

	// Clearing the last segment of a partial entry fires no input event (the value stays empty), so a
	// fully cleared control is caught as the keys go up and at blur.
	function commitIfCleared() {
		if (inputEl && inputEl.value === '' && !inputEl.validity.badInput && value !== undefined) commitText('');
	}

	function commitRefusal() {
		if (isLocked) return;
		if (held != null) {
			shown = held;
			held = null;
		}
	}

	// The control shows the committed date whenever it doesn't have focus.
	$effect(() => {
		const v = nativeValue;
		if (!isFocused && inputEl && inputEl.value !== v) inputEl.value = v;
	});

	$effect(() => {
		if (hasAutoFocus) inputEl?.focus();
	});

	function openPicker() {
		if (isLocked || !inputEl) return;
		inputEl.focus();
		try {
			inputEl.showPicker?.();
		} catch {
			// A browser that can't open it from here keeps the focus.
		}
	}

	function handleClear() {
		fireChange(undefined);
		held = null;
		shown = null;
		inputEl?.focus({ preventScroll: true });
	}

	const describedBy = $derived(
		[
			inputGroup?.describedByIDs,
			description && !inputGroup ? descriptionID : null,
			!inputGroup && fieldStatus?.message ? statusMessageID : null,
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
			data-status={fieldStatus?.type}
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
				onclick={openPicker}
			>
				<Icon icon="calendar" size="sm" color="secondary" />
			</button>
			<span class="slot">
				<input
					{...rest}
					bind:this={inputEl}
					{id}
					type="date"
					name={isDisabled ? undefined : name}
					{min}
					{max}
					readonly={isLocked || undefined}
					aria-disabled={isLocked ? 'true' : undefined}
					aria-labelledby={labelledBy}
					aria-describedby={describedBy}
					aria-required={isRequired && !isOptional ? 'true' : undefined}
					aria-invalid={fieldStatus?.type === 'error' || message != null ? 'true' : undefined}
					aria-busy={isLoading || undefined}
					data-autofocus={hasAutoFocus || undefined}
					class:text-hidden={showsOverlay}
					class:invalid={message != null}
					oninput={(e) => commitText(e.currentTarget.value)}
					onchange={(e) => commitText(e.currentTarget.value)}
					onfocus={(e) => {
						isSegmentEditable = hasEditableDateSegments(matchMedia(TOUCH_POINTER_QUERY).matches);
						isFocused = true;
						onfocus?.(e);
					}}
					onkeyup={(e) => {
						commitIfCleared();
						onkeyup?.(e);
					}}
					onblur={(e) => {
						commitIfCleared();
						const text = inputEl?.value;
						isFocused = false;
						if (text !== undefined && text !== nativeValue && held == null) commitText(text);
						commitRefusal();
						onblur?.(e);
					}}
					onkeydown={(e) => {
						if (isLocked && e.key === 'Enter') e.preventDefault();
						if (e.key === 'Enter') commitRefusal();
						onkeydown?.(e);
					}}
				/>
				{#if showsOverlay}
					<span class="overlay" class:placeholder={!nativeValue} aria-hidden="true">{overlayText}</span>
				{/if}
			</span>
			<VisuallyHidden role="alert" aria-live="assertive">{alertMessage}</VisuallyHidden>
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
			{#if fieldStatus}<Icon icon={fieldStatus.type} size="md" color={fieldStatus.type} />{/if}
		</div>
	</Tooltip>
	{#if showsDisabledMessage}
		<VisuallyHidden id={disabledMessageID}>{disabledMessage}</VisuallyHidden>
	{/if}
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
		status={fieldStatus
			? {
					type: fieldStatus.type,
					message: fieldStatus.message,
					messageID: fieldStatus.message ? statusMessageID : undefined
				}
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
		.slot {
			position: relative;
			display: flex;
			align-items: center;
			flex: 1;
			min-inline-size: 0;
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
			height: 1lh;
			color: var(--color-text-primary);
			background-color: transparent;
			outline: none;
			-webkit-appearance: none;
			appearance: none;
		}
		input::-webkit-calendar-picker-indicator { display: none; }
		input::-webkit-date-and-time-value {
			text-align: start;
			margin: 0;
			padding: 0;
			line-height: inherit;
			min-height: 0;
		}
		input::-webkit-datetime-edit { padding: 0; line-height: inherit; }
		input[aria-disabled='true'] { cursor: default; }
		input.invalid { color: var(--color-text-secondary); }
		input.text-hidden {
			color: transparent;
			-webkit-text-fill-color: transparent;
		}
		.overlay {
			position: absolute;
			inset: 0;
			display: block;
			font-size: var(--text-body-size);
			line-height: var(--text-body-leading);
			color: var(--color-text-primary);
			pointer-events: none;
			overflow: hidden;
			white-space: nowrap;
			text-overflow: ellipsis;
		}
		.overlay.placeholder { color: var(--color-text-secondary); }
		@media (pointer: coarse) {
			@supports (-webkit-touch-callout: none) {
				input,
				.overlay { font-size: max(1rem, var(--text-body-size)); }
			}
		}
		.control :global(.input-clear) { height: 20px; color: var(--color-icon-secondary); }
	}
</style>
