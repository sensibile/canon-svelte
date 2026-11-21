<!--
  Port of Astryx `DateInput` (packages/core/src/DateInput/DateInput.tsx, PointerDateField), MIT,
  Meta Platforms, Inc. A text field you can type a date into, with a calendar in a popover.
  Values are ISO `YYYY-MM-DD` strings; use `bind:value`, or `value` + `onChange(value)`.
  Typed text commits on Enter or blur; a complete typed date reports while typing. Text the field
  can't accept stays, with an error, and `onEntryErrorChange` reports why.
  Keyboard: ArrowDown opens the calendar keeping focus in the input; the calendar button moves
  focus into it; Escape closes it.
  Gregorian only (pass `locale`). Not yet ported: the native and bottom-sheet presentations for
  touch, `changeAction` (optimistic async change), FormLayout's default entry error behavior,
  and the "tooltip" status variant.
-->
<script lang="ts" module>
	export type DateInputSize = 'sm' | 'md' | 'lg';
	/** Display formats for the committed date, shared with Timestamp. */
	export type DateInputFormat = 'date' | 'date_long' | 'date_weekday' | 'system_date';
</script>

<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import Field from '../Field/Field.svelte';
	import type { FieldStatusInput, FieldStatusPlacement } from '../Field/types.js';
	import Icon from '../Icon/Icon.svelte';
	import Spinner from '../Spinner/Spinner.svelte';
	import Button from '../Button/Button.svelte';
	import VisuallyHidden from '../VisuallyHidden/VisuallyHidden.svelte';
	import Tooltip from '../Tooltip/Tooltip.svelte';
	import Calendar from '../Calendar/Calendar.svelte';
	import { createDateDisabledCheck } from '../Calendar/calendarDays.js';
	import type { DayOfWeek, DayOfWeekName, ISODateString } from '../../internal/date/dateTypes.js';
	import type { SizeValue } from '../../types.js';
	import { getInputGroupContext, INPUT_GROUP_ITEM, setInputGroupContext } from '../InputGroup/context.js';
	import { TypedDateField, type DateInputEntryError, type EntryErrorBehavior } from './typedDate.svelte.js';
	import DatePopover from './DatePopover.svelte';

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
		/** Why the input is disabled; shown in a tooltip on hover and focus while disabled. */
		disabledMessage?: string;
		/** The selected date, `YYYY-MM-DD`. */
		value?: ISODateString;
		/** Called when the date changes; with undefined when it is cleared. */
		onChange?: (value: ISODateString | undefined) => void;
		/** Busy: the field stays focusable, shows a spinner, and blocks typing, picking and clearing. */
		isLoading?: boolean;
		min?: ISODateString;
		max?: ISODateString;
		/** A date is disabled if ANY of these returns false. */
		dateConstraints?: ReadonlyArray<(date: Date) => boolean>;
		/** Shown while no date is set. */
		placeholder?: string;
		size?: DateInputSize;
		/** Status indicator. A typed date the field rejects shows its own error instead. */
		status?: FieldStatusInput;
		/**
		 * Called when the field's rejection of typed text changes, with null when it ends. With it,
		 * an `error` status with a message words the rejection instead of the field's own message.
		 */
		onEntryErrorChange?: (error: DateInputEntryError | null) => void;
		/** `'complete'`: show a rejection as soon as a typed date is complete. `'blur-or-enter'`: wait. */
		entryErrorBehavior?: EntryErrorBehavior;
		statusVariant?: FieldStatusPlacement;
		width?: SizeValue;
		/** Help text shown in an InfoTip next to the label. */
		labelTooltip?: string;
		/** Show a clear button while a date is set. */
		hasClear?: boolean;
		/** Months shown in the calendar popover. */
		numberOfMonths?: 1 | 2;
		weekStartsOn?: DayOfWeek | DayOfWeekName;
		/** How the committed date shows: a named format or a function of the ISO value. */
		format?: DateInputFormat | ((value: ISODateString) => string);
		/** Locale for reading typed dates and writing them. */
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
		entryErrorBehavior = 'complete',
		statusVariant = 'attached',
		width,
		labelTooltip,
		hasClear = false,
		numberOfMonths = 1,
		weekStartsOn,
		format = 'date_long',
		locale = 'en-US',
		containerClass,
		controlClass,
		id: idProp,
		name,
		form,
		'aria-describedby': describedByProp,
		'aria-labelledby': labelledByProp,
		onfocus,
		onblur,
		onclick,
		onkeydown,
		...rest
	}: Props = $props();

	const inputGroup = getInputGroupContext();
	setInputGroupContext(null);
	const isDisabled = $derived(isDisabledProp || (inputGroup?.isDisabled ?? false));
	const size = $derived(sizeProp ?? inputGroup?.size ?? 'md');
	const isBusy = $derived(isLoading);
	// A disabled or busy field stays focusable (aria-disabled) but takes no input.
	const isEffectivelyDisabled = $derived(isDisabled || isBusy);
	const placeholder = $derived(placeholderProp ?? 'Select a date');

	const uid = $props.id();
	const id = $derived(idProp ?? `${uid}-input`);
	const descriptionID = `${uid}-desc`;
	const statusMessageID = `${uid}-status`;
	const disabledMessageID = `${uid}-disabled-reason`;
	const inputLabelID = `${uid}-input-label`;
	const showsDisabledMessage = $derived(isDisabled && !!disabledMessage);
	let inputEl: HTMLInputElement | undefined = $state();
	let fieldEl: HTMLDivElement | undefined = $state();
	let calendar: Calendar | undefined = $state();
	let isOpen = $state(false);

	const isDateDisabled = $derived(createDateDisabledCheck({ min, max, dateConstraints }));

	function fireChange(next: ISODateString | undefined) {
		if (isEffectivelyDisabled) return;
		value = next;
		onChange?.(next);
	}

	const typed = new TypedDateField(() => ({
		format,
		locale,
		min,
		max,
		isDateDisabled,
		value,
		onChange: fireChange,
		onClear: () => {
			if (value !== undefined) fireChange(undefined);
		},
		onTypedDate: (date) => calendar?.navigateTo(date),
		isDisabled: isEffectivelyDisabled,
		status,
		isStatusAnnounced: !inputGroup,
		onEntryErrorChange,
		entryErrorBehavior
	}));
	// A new value from outside replaces typed text; a re-enabled field shows its value.
	$effect(() => {
		const v = value;
		untrack(() => typed.valueChanged(v));
	});
	let wasDisabled = untrack(() => isEffectivelyDisabled);
	$effect(() => {
		const disabled = isEffectivelyDisabled;
		if (disabled !== wasDisabled) {
			wasDisabled = disabled;
			if (!disabled) untrack(() => typed.enabled());
		}
	});
	// A rejection that a prop change starts, changes or ends reaches the caller too.
	$effect(() => {
		void typed.entryError;
		untrack(() => typed.syncEntryError());
	});
	onDestroy(() => typed.destroy());

	const fieldStatus = $derived(typed.fieldStatus);
	const messagelessError = $derived(!inputGroup && fieldStatus?.type === 'error' && !fieldStatus.message);
	const describedBy = $derived(
		[
			inputGroup?.describedByIDs,
			description && !inputGroup ? descriptionID : null,
			!inputGroup && (fieldStatus?.message || messagelessError) ? statusMessageID : null,
			showsDisabledMessage ? disabledMessageID : null,
			describedByProp
		]
			.filter(Boolean)
			.join(' ') || undefined
	);
	const labelledBy = $derived(
		inputGroup ? [inputGroup.labelID, inputLabelID, labelledByProp].filter(Boolean).join(' ') : labelledByProp
	);

	function show(focusCalendar: boolean) {
		if (isEffectivelyDisabled || isOpen) return;
		isOpen = true;
		pendingCalendarFocus = focusCalendar;
	}
	let pendingCalendarFocus = $state(false);
	function hide(restoreFocus: boolean) {
		isOpen = false;
		if (restoreFocus) inputEl?.focus({ preventScroll: true });
	}

	function handleToggle() {
		if (isEffectivelyDisabled) return;
		if (isOpen) hide(false);
		else show(true);
	}

	function handleInputClick(e: MouseEvent & { currentTarget: HTMLInputElement }) {
		(onclick as ((e: MouseEvent) => void) | undefined)?.(e);
		if (!isEffectivelyDisabled) show(false);
	}

	function handleClear(e: MouseEvent) {
		fireChange(undefined);
		typed.reset();
		inputEl?.focus({ preventScroll: e.detail !== 0 });
	}

	function handleDateSelect(selected: ISODateString) {
		// An open calendar can outlive an enabled owner: reject the whole pick.
		if (isDisabled) return;
		fireChange(selected);
		typed.reset();
		hide(true);
	}

	function handleKeydown(e: KeyboardEvent & { currentTarget: HTMLInputElement }) {
		// An IME composition uses Enter and Escape for its own candidates.
		if (!e.isComposing && e.keyCode !== 229) {
			if (e.key === 'Escape' && isOpen) {
				e.preventDefault();
				hide(false);
			} else if (e.key === 'ArrowDown' && !isOpen) {
				// APG combobox: ArrowDown opens the calendar, keeping focus in the input.
				e.preventDefault();
				show(false);
			} else if (e.key === 'Enter' && (typed.isPending || isEffectivelyDisabled)) {
				// Typed text holds Enter back, or a form would submit the value from before the commit.
				e.preventDefault();
				typed.commit();
			}
		}
		onkeydown?.(e);
	}

	// A press on the field's own label focuses the input; it isn't an outside press.
	function isOwnPress(target: EventTarget | null): boolean {
		if (!(target instanceof Node)) return false;
		const node = target;
		if (fieldEl?.contains(node)) return true;
		return node instanceof HTMLLabelElement && node.control === inputEl;
	}

	// Close when focus leaves the field for somewhere other than the calendar.
	function handleFieldFocusOut(e: FocusEvent) {
		const next = e.relatedTarget as Node | null;
		if (!isOpen || next == null) return;
		if (fieldEl?.contains(next) || popoverEl?.contains(next)) return;
		hide(false);
	}
	let popoverEl: HTMLElement | undefined = $state();
</script>

{#snippet control()}
	<Tooltip content={disabledMessage ?? ''} isEnabled={showsDisabledMessage} focusTrigger="always">
		<div
			bind:this={fieldEl}
			class={['astryx-date-input', 'control', controlClass]}
			class:disabled={isDisabled}
			class:busy={isBusy && !isDisabled}
			class:in-group={inputGroup != null}
			data-size={size}
			data-status={fieldStatus?.type}
			data-disabled={isDisabled ? 'disabled' : undefined}
			{...{ [INPUT_GROUP_ITEM]: inputGroup ? '' : undefined }}
			onfocusout={handleFieldFocusOut}
		>
			{#if inputGroup}<VisuallyHidden id={inputLabelID}>{label}</VisuallyHidden>{/if}
			<button
				type="button"
				class="icon-button"
				aria-disabled={isEffectivelyDisabled || undefined}
				aria-describedby={showsDisabledMessage ? disabledMessageID : undefined}
				aria-label={isOpen ? 'Close calendar' : 'Open calendar'}
				onclick={handleToggle}
			>
				<span
					class="astryx-date-input-toggle-icon toggle-icon"
					data-state={isOpen ? 'expanded' : 'collapsed'}
					style="display: contents"
				>
					<Icon icon="calendar" size="sm" color="secondary" />
				</span>
			</button>
			<input
				{...rest}
				bind:this={inputEl}
				{id}
				name={typed.hiddenFormValue === null && !isDisabled ? name : undefined}
				{form}
				type="text"
				role="combobox"
				value={typed.displayValue}
				{placeholder}
				class:invalid={typed.isInvalid}
				readonly={isEffectivelyDisabled || undefined}
				aria-disabled={isEffectivelyDisabled ? 'true' : undefined}
				aria-labelledby={labelledBy}
				aria-describedby={describedBy}
				aria-required={isRequired && !isOptional ? 'true' : undefined}
				aria-invalid={fieldStatus?.type === 'error' || typed.isInvalid ? 'true' : undefined}
				aria-busy={isBusy || undefined}
				aria-expanded={isOpen}
				aria-haspopup="dialog"
				aria-controls={isOpen ? `${uid}-calendar` : undefined}
				aria-autocomplete="none"
				autocomplete="off"
				oninput={(e) => typed.handleChange(e.currentTarget.value)}
				onfocus={(e) => {
					typed.handleFocus();
					onfocus?.(e);
				}}
				onblur={(e) => {
					typed.handleBlur();
					onblur?.(e);
				}}
				onclick={handleInputClick}
				onkeydown={handleKeydown}
			/>
			{#if typed.hiddenFormValue !== null && name != null && !isDisabled}
				<input type="hidden" {name} {form} value={typed.hiddenFormValue} />
			{/if}
			<!-- Announces the rejection message that the field status does not announce. -->
			<VisuallyHidden role="alert" aria-live="assertive">{typed.alertMessage}</VisuallyHidden>
			{#if hasClear && value !== undefined && !isEffectivelyDisabled}
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
			{#if isBusy}<Spinner size="sm" aria-hidden="true" />{/if}
			{#if fieldStatus}<Icon icon={fieldStatus.type} size="md" color={fieldStatus.type} />{/if}
		</div>
	</Tooltip>
	{#if showsDisabledMessage}
		<VisuallyHidden id={disabledMessageID}>{disabledMessage}</VisuallyHidden>
	{/if}
	<DatePopover
		open={isOpen}
		anchor={fieldEl}
		id="{uid}-calendar"
		label="Choose date"
		closeLabel="Close calendar"
		{isOwnPress}
		bind:element={popoverEl}
		onDismiss={hide}
		autoFocus={pendingCalendarFocus}
	>
		<Calendar
			bind:this={calendar}
			mode="single"
			value={value ?? null}
			onChange={handleDateSelect as (value: ISODateString) => void}
			{min}
			{max}
			{dateConstraints}
			{numberOfMonths}
			{weekStartsOn}
			{locale}
		/>
	</DatePopover>
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
			? { type: fieldStatus.type, message: fieldStatus.message, messageID: fieldStatus.message ? statusMessageID : undefined }
			: undefined}
		{statusVariant}
		{width}
	>
		{@render control()}
		{#if messagelessError}
			<VisuallyHidden id={statusMessageID}>This field has an error</VisuallyHidden>
		{/if}
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
			box-shadow: none;
			outline: none;
		}
		@media (prefers-reduced-motion: reduce), (pointer: coarse) {
			.control { transition-duration: 0s; }
		}
		@media (hover: hover) {
			.control:not(.disabled):not(.busy):hover:not(:focus-within) {
				box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--color-border-emphasized) 30%, transparent);
			}
			.control[data-status='warning']:not(.disabled):not(.busy):hover:not(:focus-within) { box-shadow: var(--shadow-inset-warning); }
			.control[data-status='error']:not(.disabled):not(.busy):hover:not(:focus-within) { box-shadow: var(--shadow-inset-error); }
			.control[data-status='success']:not(.disabled):not(.busy):hover:not(:focus-within) { box-shadow: var(--shadow-inset-success); }
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
		.icon-button:focus-visible {
			outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color);
			outline-offset: 2px;
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
		}
		@media (pointer: coarse) {
			@supports (-webkit-touch-callout: none) {
				input { font-size: max(1rem, var(--text-body-size)); }
			}
		}
		input::placeholder { color: var(--color-text-secondary); }
		input[aria-disabled='true'] { cursor: default; }
		input.invalid { color: var(--color-text-secondary); }
		.control :global(.input-clear) { height: 20px; color: var(--color-icon-secondary); }
	}
</style>
