<!--
  Port of Astryx `TimeInput` (packages/core/src/TimeInput/TimeInput.tsx, TimeField), MIT,
  Meta Platforms, Inc. A text field you type a time into. Values are ISO `HH:MM` (or `HH:MM:SS`
  with `hasSeconds`) strings; use `bind:value`, or `value` + `onChange(value)`.
  A typed time commits while typing once it is complete and allowed; Enter and blur commit the
  rest. A disabled field posts nothing. Text the field can't accept stays, with an error, and `onEntryErrorChange` reports why.
  ArrowUp/ArrowDown step the time by `increment` minutes and announce it.
  Inside an `InputGroup` it renders only its control. Not yet ported: the native and wheel
  presentations for touch (`presentation`, `nativePicker`), `changeAction` (optimistic async
  change), FormLayout's default entry error behavior, and the "tooltip" status variant.
-->
<script lang="ts" module>
	export type TimeInputSize = 'sm' | 'md' | 'lg';
	export type TimeInputHourFormat = '12h' | '24h';
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
	import type { SizeValue } from '../../types.js';
	import { getInputGroupContext, INPUT_GROUP_ITEM, setInputGroupContext } from '../InputGroup/context.js';
	import type { EntryErrorBehavior } from '../DateInput/typedDate.svelte.js';
	import { adjustTime, formatISOTime, isTimeInRange, type ISOTimeString } from '../../internal/date/timeParser.js';
	import { formatLocaleTime, resolveHourFormat } from '../../internal/date/timeFormat.js';
	import { TypedTimeField, type TimeInputEntryError } from './typedTime.svelte.js';

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
		/** The selected time, `HH:MM` or `HH:MM:SS`. */
		value?: ISOTimeString | string;
		/** Called when the time changes; with undefined when it is cleared. */
		onChange?: (value: ISOTimeString | undefined) => void;
		/** Busy: the field shows a spinner and hides a typed rejection. */
		isLoading?: boolean;
		min?: ISOTimeString | string;
		max?: ISOTimeString | string;
		/** Show and accept seconds. */
		hasSeconds?: boolean;
		/** Show a clear button while a time is set. */
		hasClear?: boolean;
		hasAutoFocus?: boolean;
		/** Defaults to the locale's hour cycle. */
		hourFormat?: TimeInputHourFormat;
		/** Minutes that ArrowUp/ArrowDown step. */
		increment?: number;
		/** Shown while no time is set. */
		placeholder?: string;
		size?: TimeInputSize;
		/** Status indicator. A caller error with a message shows in place of the field's own. */
		status?: FieldStatusInput;
		/** Called when the field's rejection of typed text changes, with null when it ends. */
		onEntryErrorChange?: (error: TimeInputEntryError | null) => void;
		/** `'complete'`: show a rejection as soon as a typed time is complete. `'blur-or-enter'`: wait. */
		entryErrorBehavior?: EntryErrorBehavior;
		statusVariant?: FieldStatusPlacement;
		width?: SizeValue;
		/** Help text shown in an InfoTip next to the label. */
		labelTooltip?: string;
		/** Locale for reading typed times and writing them. */
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
		hasSeconds = false,
		hasClear = false,
		hasAutoFocus = false,
		hourFormat: hourFormatProp,
		increment = 1,
		placeholder: placeholderProp,
		size: sizeProp,
		status,
		onEntryErrorChange,
		entryErrorBehavior = 'complete',
		statusVariant = 'attached',
		width,
		labelTooltip,
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
	const placeholder = $derived(placeholderProp ?? 'Select a time');
	const hourFormat = $derived(resolveHourFormat(locale, hourFormatProp));
	const timeValue = $derived(value as ISOTimeString | undefined);

	const uid = $props.id();
	const id = $derived(idProp ?? `${uid}-input`);
	const descriptionID = `${uid}-desc`;
	const statusMessageID = `${uid}-status`;
	const disabledMessageID = `${uid}-disabled-reason`;
	const inputLabelID = `${uid}-input-label`;
	const showsDisabledMessage = $derived(isDisabled && !!disabledMessage);
	let inputEl: HTMLInputElement | undefined = $state();
	let isFocused = $state(false);
	let announcement = $state('');

	function fireChange(next: ISOTimeString | undefined) {
		value = next;
		onChange?.(next);
	}

	const typed = new TypedTimeField(() => ({
		value: timeValue,
		locale,
		hourFormat,
		hasSeconds,
		min: min as ISOTimeString | undefined,
		max: max as ISOTimeString | undefined,
		isDisabled,
		isLocked: isDisabled || isBusy,
		errorMessage: 'Invalid time',
		// Inside an InputGroup the field shows no status of its own.
		isStatusAnnounced: !inputGroup || (status?.type === 'error' && !!status.message),
		status,
		onEntryErrorChange,
		entryErrorBehavior
	}));
	$effect(() => {
		const v = timeValue;
		untrack(() => typed.valueChanged(v));
	});
	let wasDisabled = untrack(() => isDisabled);
	$effect(() => {
		const disabled = isDisabled;
		if (disabled !== wasDisabled) {
			wasDisabled = disabled;
			if (disabled) untrack(() => typed.disabled());
		}
	});
	$effect(() => {
		void typed.entryError;
		untrack(() => typed.syncEntryError());
	});
	onDestroy(() => typed.destroy());

	const fieldStatus = $derived(inputGroup ? status : typed.fieldStatus);
	const messagelessError = $derived(!inputGroup && fieldStatus?.type === 'error' && !fieldStatus.message);

	const formatDisplayTime = (time: ISOTimeString) => formatLocaleTime(time, locale, hourFormat, hasSeconds);
	const displayValue = $derived(typed.pendingInput ?? (timeValue ? formatDisplayTime(timeValue) : ''));
	// While focused and empty, the placeholder shows the format.
	const displayPlaceholder = $derived(
		isFocused && !displayValue ? (hourFormat === '12h' ? 'e.g., 2:30 PM' : 'e.g., 14:30') : placeholder
	);

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

	function handleInput(e: Event & { currentTarget: HTMLInputElement }) {
		const time = typed.handleChange(e.currentTarget.value);
		if (time != null) fireChange(time);
	}

	function handleBlur(e: FocusEvent & { currentTarget: HTMLInputElement }) {
		isFocused = false;
		const time = typed.commit('blur');
		if (time !== null) fireChange(time);
		onblur?.(e);
	}

	function handleKeydown(e: KeyboardEvent & { currentTarget: HTMLInputElement }) {
		// Enter in a focused disabled field would submit a surrounding form.
		if (isDisabled && e.key === 'Enter') e.preventDefault();
		// An IME candidate window uses the arrows too.
		if (!e.isComposing && e.keyCode !== 229 && !isDisabled) {
			if (e.key === 'Enter') {
				// Enter commits the draft without preventing a form's submission.
				const time = typed.commit('enter');
				if (time !== null) fireChange(time);
			} else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
				e.preventDefault();
				let current = timeValue;
				if (!current) {
					const now = new Date();
					current = formatISOTime({ hour: now.getHours(), minute: now.getMinutes(), second: now.getSeconds() }, hasSeconds);
				}
				const next = adjustTime(current, e.key === 'ArrowUp' ? increment : -increment, hasSeconds);
				if (isTimeInRange(next, min as ISOTimeString | undefined, max as ISOTimeString | undefined)) {
					// The step is the committed value: drop a typed draft so blur can't re-commit it.
					typed.reset();
					fireChange(next);
					// Screen readers don't announce a programmatic textbox change.
					announcement = formatDisplayTime(next);
				}
			}
		}
		onkeydown?.(e);
	}

	function handleClear(e: MouseEvent) {
		fireChange(undefined);
		typed.reset();
		inputEl?.focus({ preventScroll: e.detail !== 0 });
	}

	function focusFromWrapper(e: MouseEvent) {
		if (isDisabled || e.target !== e.currentTarget) return;
		inputEl?.focus();
	}

	$effect(() => {
		if (hasAutoFocus) untrack(() => inputEl?.focus());
	});
</script>

{#snippet control()}
	<Tooltip content={disabledMessage ?? ''} isEnabled={showsDisabledMessage} focusTrigger="always">
		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
		<div
			class={['astryx-time-input', 'control', controlClass]}
			class:disabled={isDisabled}
			class:in-group={inputGroup != null}
			data-size={size}
			data-status={fieldStatus?.type}
			data-disabled={isDisabled ? 'disabled' : undefined}
			{...{ [INPUT_GROUP_ITEM]: inputGroup ? '' : undefined }}
			onclick={focusFromWrapper}
		>
			{#if inputGroup}<VisuallyHidden id={inputLabelID}>{label}</VisuallyHidden>{/if}
			<span class="icon"><Icon icon="clock" size="sm" color="secondary" /></span>
			<input
				{...rest}
				bind:this={inputEl}
				{id}
				type="text"
				name={typed.isNameOnHiddenInput || isDisabled ? undefined : name}
				{form}
				value={displayValue}
				placeholder={displayPlaceholder}
				class:invalid={typed.isRejected}
				readonly={isDisabled || undefined}
				aria-disabled={isDisabled ? 'true' : undefined}
				aria-labelledby={labelledBy}
				aria-describedby={describedBy}
				aria-required={isRequired && !isOptional ? 'true' : undefined}
				aria-invalid={fieldStatus?.type === 'error' || typed.isRejected ? 'true' : undefined}
				aria-busy={isBusy || undefined}
				data-autofocus={hasAutoFocus || undefined}
				oninput={handleInput}
				onfocus={(e) => {
					// A disabled field keeps its static placeholder.
					if (!isDisabled) isFocused = true;
					onfocus?.(e);
				}}
				onblur={handleBlur}
				onclick={(e) => {
					// The browser still clicks an aria-disabled input: skip the caller's handler too.
					if (!isDisabled) onclick?.(e);
				}}
				onkeydown={handleKeydown}
			/>
			{#if name != null && typed.isNameOnHiddenInput && !isDisabled}
				<input type="hidden" {name} {form} value={timeValue ? formatDisplayTime(timeValue) : ''} />
			{/if}
			<!-- Announces the rejection message that the field status does not announce. -->
			<VisuallyHidden role="alert" aria-live="assertive">{typed.alertMessage}</VisuallyHidden>
			<VisuallyHidden aria-live="polite">{announcement}</VisuallyHidden>
			{#if isBusy}<Spinner size="sm" aria-hidden="true" />{/if}
			{#if hasClear && value && !isDisabled}
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
			min-width: 120px;
			border: var(--border-width) solid var(--color-border-emphasized);
			--_field-radius: var(--radius-element);
			border-radius: var(--_field-radius);
			background-color: var(--color-background-surface);
			transition-property: border-color, box-shadow;
			transition-duration: var(--duration-fast);
			transition-timing-function: var(--ease-standard);
			box-shadow: none;
			outline: none;
			cursor: text;
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
		.disabled { opacity: 0.5; border-color: var(--color-border-emphasized); box-shadow: none; cursor: default; }
		.disabled:focus-within { box-shadow: none; }

		.control[data-size='sm'] { height: max(var(--size-element-sm), calc(var(--text-body-size) * var(--text-body-leading) + 2 * var(--border-width))); }
		.control[data-size='md'] { height: max(var(--size-element-md), calc(var(--text-body-size) * var(--text-body-leading) + 2 * var(--border-width))); }
		.control[data-size='lg'] { height: max(var(--size-element-lg), calc(var(--text-body-size) * var(--text-body-leading) + 2 * var(--border-width))); }

		.icon {
			display: flex;
			align-items: center;
			justify-content: center;
			flex-shrink: 0;
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
