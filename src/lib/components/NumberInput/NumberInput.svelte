<!--
  Port of Astryx `NumberInput` (packages/core/src/NumberInput/NumberInput.tsx), MIT, Meta Platforms, Inc.
  A text field with spinbutton semantics. Typing is a draft that commits on blur or Enter;
  pasted numbers in local formats ("1,234.5", "(12)", "€5") are read back. Out-of-range values
  clamp; unreadable text shows "Invalid number". Arrow keys, the wheel (while focused) and the
  optional stepper column step by `step` on a grid anchored at `min`.
  Use `bind:value` or `value` + `onChange`. With `hasClear`, emptying the field commits null.
  Not yet ported: the "tooltip" status variant, FormLayout entry-error behavior, selection lock
  during stepper holds.
-->
<script lang="ts" module>
	export type NumberInputSize = 'sm' | 'md' | 'lg';
	export interface NumberInputEntryError {
		kind: 'unreadable' | 'fractional' | 'outOfRange';
		text: string;
		value?: number;
	}
</script>

<script lang="ts">
	import { untrack } from 'svelte';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import Field from '../Field/Field.svelte';
	import type { FieldStatusInput, FieldStatusPlacement } from '../Field/types.js';
	import Icon, { type IconComponent } from '../Icon/Icon.svelte';
	import type { IconName } from '../Icon/defaultIcons.js';
	import Button from '../Button/Button.svelte';
	import Tooltip from '../Tooltip/Tooltip.svelte';
	import VisuallyHidden from '../VisuallyHidden/VisuallyHidden.svelte';
	import { getInputGroupContext, INPUT_GROUP_ITEM, setInputGroupContext } from '../InputGroup/context.js';
	import type { SizeValue } from '../../types.js';
	import { formatEditableNumber } from './numberParser.js';
	import {
		getNumberInputRejection,
		parseNumberInput,
		resolveNumberInputCommit,
		type NumberInputRejection
	} from './numberInputCommit.js';

	interface Props
		extends Omit<
			HTMLInputAttributes,
			'value' | 'type' | 'size' | 'min' | 'max' | 'step' | 'disabled' | 'readonly' | 'required' | 'onchange'
		> {
		label: string;
		value?: number | null;
		onChange?: (value: number | null) => void;
		isLabelHidden?: boolean;
		description?: string;
		isOptional?: boolean;
		isRequired?: boolean;
		isDisabled?: boolean;
		isReadOnly?: boolean;
		disabledMessage?: string;
		startIcon?: IconName | IconComponent;
		labelIcon?: IconName | IconComponent;
		status?: FieldStatusInput;
		statusVariant?: FieldStatusPlacement;
		onEntryErrorChange?: (error: NumberInputEntryError | null) => void;
		size?: NumberInputSize;
		placeholder?: string;
		width?: SizeValue;
		labelTooltip?: string;
		hasAutoFocus?: boolean;
		htmlName?: string;
		min?: number | null;
		max?: number | null;
		step?: number | null;
		/** Display format while not focused, e.g. currency. Editing shows the plain number. */
		formatValue?: (value: number) => string;
		isWheelEnabled?: boolean;
		hasNumberSteppers?: boolean;
		units?: string | null;
		isIntegerOnly?: boolean;
		/** Allow emptying the field to commit null, and show a clear button. */
		hasClear?: boolean;
		onEnter?: () => void;
		locale?: string;
		containerClass?: string;
		controlClass?: string;
	}

	let {
		label,
		value = $bindable(null),
		onChange,
		isLabelHidden = false,
		description,
		isOptional = false,
		isRequired = false,
		isDisabled: isDisabledProp = false,
		isReadOnly = false,
		disabledMessage,
		startIcon,
		labelIcon,
		status,
		statusVariant = 'attached',
		onEntryErrorChange,
		size: sizeProp,
		placeholder,
		width,
		labelTooltip,
		hasAutoFocus = false,
		htmlName,
		min,
		max,
		step,
		formatValue,
		isWheelEnabled = true,
		hasNumberSteppers = false,
		units,
		isIntegerOnly = false,
		hasClear = false,
		onEnter,
		locale,
		containerClass,
		controlClass,
		onfocus,
		onblur,
		onkeydown,
		id: idProp,
		'aria-describedby': describedByProp,
		'aria-labelledby': labelledByProp,
		...rest
	}: Props = $props();

	const inputGroup = getInputGroupContext();
	// Internal buttons (clear, steppers) belong to this control, not to the group row.
	setInputGroupContext(null);
	const isDisabled = $derived(isDisabledProp || (inputGroup?.isDisabled ?? false));
	const size = $derived(sizeProp ?? inputGroup?.size ?? 'md');
	const uid = $props.id();
	const id = $derived(idProp ?? `${uid}-number`);
	const inputLabelID = `${uid}-input-label`;
	const descriptionID = `${uid}-desc`;
	const statusMessageID = `${uid}-status`;
	const unitsID = `${uid}-units`;
	const disabledMessageID = `${uid}-disabled-reason`;
	let inputEl: HTMLInputElement | undefined = $state();

	let pendingInput = $state<string | null>(null);
	let holdDraft = $state<number | null>(null);
	let isFocused = $state(false);
	let shownRejection = $state<NumberInputEntryError | null>(null);
	let isDraftKeptAtBlur = $state(false);
	const rules = $derived({ min, max, isIntegerOnly, locale });

	function toEntryError(text: string, r: NumberInputRejection | null): NumberInputEntryError | null {
		if (r == null) return null;
		return r.kind === 'unreadable' ? { kind: 'unreadable', text } : { kind: r.kind, text, value: r.value };
	}
	let reported: NumberInputEntryError | null = null;
	function reportEntryError(error: NumberInputEntryError | null) {
		const same =
			error === reported ||
			(error != null && reported != null && error.kind === reported.kind && error.text === reported.text);
		if (same) return;
		reported = error;
		onEntryErrorChange?.(error);
	}
	function endDraft() {
		pendingInput = null;
		shownRejection = null;
		isDraftKeptAtBlur = false;
		reportEntryError(null);
	}

	// Disabling drops any draft; a new value from outside replaces a rejected draft.
	$effect(() => {
		if (isDisabled) untrack(endDraft);
	});
	$effect(() => {
		void value;
		untrack(() => {
			if (shownRejection !== null || isDraftKeptAtBlur) endDraft();
		});
	});
	// Re-judge a shown rejection when the rules change.
	$effect(() => {
		const r = rules;
		untrack(() => {
			if (shownRejection !== null && pendingInput !== null) {
				shownRejection = toEntryError(pendingInput, getNumberInputRejection(pendingInput, r));
				reportEntryError(shownRejection);
			}
		});
	});
	$effect(() => {
		if (isDisabled || isReadOnly) holdDraft = null;
	});

	const shownEntryError = $derived(isDisabled || holdDraft !== null ? null : shownRejection);
	const callerErrorMessage = $derived(status?.type === 'error' && status.message ? status.message : null);
	const fieldStatus: FieldStatusInput | undefined = $derived(
		shownEntryError == null || callerErrorMessage != null ? status : { type: 'error', message: 'Invalid number' }
	);
	// Field announces its own status; inside a group the input announces the rejection itself.
	const alertMessage = $derived(shownEntryError != null && callerErrorMessage == null && inputGroup ? 'Invalid number' : '');

	const showsDisabledMessage = $derived(isDisabled && !!disabledMessage);
	const describedBy = $derived(
		[
			describedByProp,
			inputGroup?.describedByIDs,
			description && !inputGroup ? descriptionID : null,
			!inputGroup && fieldStatus?.message ? statusMessageID : null,
			units ? unitsID : null,
			showsDisabledMessage ? disabledMessageID : null
		]
			.filter(Boolean)
			.join(' ') || undefined
	);
	const labelledBy = $derived(
		inputGroup ? [inputGroup.labelID, inputLabelID, labelledByProp].filter(Boolean).join(' ') : labelledByProp
	);

	const formattedValue = $derived(value == null ? '' : (formatValue?.(value) ?? String(value)));
	const displayValue = $derived(
		holdDraft !== null
			? formatEditableNumber(holdDraft, locale)
			: pendingInput !== null
				? pendingInput
				: value == null
					? ''
					: isFocused
						? formatEditableNumber(value, locale)
						: formattedValue
	);
	const hiddenFormValue = $derived(
		value == null ? '' : !formatValue && isFocused ? formatEditableNumber(value, locale) : String(value)
	);

	function emit(next: number | null) {
		value = next;
		onChange?.(next);
	}

	function handleInput(e: Event & { currentTarget: HTMLInputElement }) {
		if (isDisabled || isReadOnly) return;
		const text = e.currentTarget.value;
		pendingInput = text;
		isDraftKeptAtBlur = false;
		if (shownRejection !== null && getNumberInputRejection(text, rules) === null) {
			shownRejection = null;
			reportEntryError(null);
		}
	}

	function handleFocus(e: FocusEvent & { currentTarget: HTMLInputElement }) {
		const input = e.currentTarget;
		const editable = pendingInput ?? (value == null ? '' : formatEditableNumber(value, locale));
		const reselect =
			input.value.length > 0 &&
			input.value !== editable &&
			input.selectionStart === 0 &&
			input.selectionEnd === input.value.length;
		isFocused = true;
		(onfocus as ((e: FocusEvent) => void) | undefined)?.(e);
		// Tabbing in selects all; keep that selection when the display swaps to the editable text.
		if (reselect) queueMicrotask(() => input.setSelectionRange(0, input.value.length));
	}

	/** Commits the draft; returns false when the draft was rejected and stays on screen. */
	function commitPendingInput(trigger: 'blur' | 'Enter'): boolean {
		if (pendingInput === null) return true;
		if (isDisabled) {
			endDraft();
			return true;
		}
		const rejection = toEntryError(pendingInput, getNumberInputRejection(pendingInput, rules));
		if (rejection != null) {
			shownRejection = rejection;
			reportEntryError(rejection);
			if (trigger === 'blur') isDraftKeptAtBlur = true;
			return false;
		}
		shownRejection = null;
		isDraftKeptAtBlur = false;
		reportEntryError(null);
		const decision = resolveNumberInputCommit(pendingInput, { ...rules, hasClear });
		if (trigger === 'blur' || (decision.type === 'commit' && decision.didClamp)) pendingInput = null;
		if (decision.type === 'clear') {
			if (hasClear && value != null) emit(null);
		} else if (decision.type === 'commit' && decision.value !== value) {
			emit(decision.value);
		}
		return true;
	}

	function handleBlur(e: FocusEvent) {
		commitPendingInput('blur');
		isFocused = false;
		(onblur as ((e: FocusEvent) => void) | undefined)?.(e);
	}

	const valueForStepping = $derived(
		pendingInput === null
			? (value ?? null)
			: pendingInput.trim() === ''
				? null
				: (parseNumberInput(pendingInput, rules) ?? value ?? null)
	);

	function decimalPlaces(n: number): number {
		const [coefficient, exponentText] = String(n).toLowerCase().split('e');
		const fraction = coefficient.split('.')[1]?.length ?? 0;
		return Math.max(0, fraction - (exponentText == null ? 0 : Number(exponentText)));
	}
	function steppedValue(current: number | null, direction: 1 | -1): number | null {
		const effectiveStep =
			step == null || !Number.isFinite(step) || step <= 0 || (isIntegerOnly && !Number.isInteger(step)) ? 1 : step;
		const base = min != null && (!isIntegerOnly || Number.isInteger(min)) ? min : 0;
		let next: number;
		if (current == null) {
			next = direction === 1 ? (min ?? 0) : (max ?? 0);
			if (isIntegerOnly) next = direction === 1 ? Math.ceil(next) : Math.floor(next);
		} else {
			const position = (current - base) / effectiveStep;
			const tolerance = Number.EPSILON * Math.max(1, Math.abs(position)) * 4;
			const nextPosition =
				direction === 1 ? Math.floor(position + tolerance) + 1 : Math.ceil(position - tolerance) - 1;
			next = base + nextPosition * effectiveStep;
		}
		// Round to the step/base grid's own precision (Astryx caps this at 12 places, which zeroes
		// steps finer than 1e-12; toFixed's own limit is 100).
		next = Number(next.toFixed(Math.min(100, Math.max(decimalPlaces(effectiveStep), decimalPlaces(base)))));
		if (min != null) next = Math.max(min, next);
		if (max != null) next = Math.min(max, next);
		if (!Number.isFinite(next) || (isIntegerOnly && !Number.isInteger(next))) return current;
		return Object.is(next, -0) ? 0 : next;
	}

	function stepValue(direction: 1 | -1) {
		if (isDisabled || isReadOnly) return;
		const next = steppedValue(valueForStepping, direction);
		if (next == null) return;
		endDraft();
		if (next !== value) emit(next);
	}

	const canIncrement = $derived(steppedValue(holdDraft ?? valueForStepping, 1) !== (holdDraft ?? valueForStepping));
	const canDecrement = $derived(steppedValue(holdDraft ?? valueForStepping, -1) !== (holdDraft ?? valueForStepping));

	function handleKeydown(e: KeyboardEvent & { currentTarget: EventTarget & HTMLInputElement }) {
		if (isDisabled) {
			if (e.key === 'Enter') e.preventDefault();
			return;
		}
		if (e.isComposing) return;
		const hasModifier = e.altKey || e.ctrlKey || e.metaKey || e.shiftKey;
		if (!hasModifier && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
			onkeydown?.(e);
			if (e.defaultPrevented) return;
			e.preventDefault();
			stepValue(e.key === 'ArrowUp' ? 1 : -1);
			return;
		}
		if (e.key === 'Enter') {
			// A rejected draft must not reach the form through implicit submission.
			if (!commitPendingInput('Enter')) e.preventDefault();
			onEnter?.();
		}
		onkeydown?.(e);
	}

	$effect(() => {
		const input = inputEl;
		if (!input || !isWheelEnabled) return;
		const onWheel = (event: WheelEvent) => {
			if (
				document.activeElement !== input ||
				isDisabled ||
				isReadOnly ||
				event.deltaY === 0 ||
				event.altKey ||
				event.ctrlKey ||
				event.metaKey ||
				event.shiftKey
			)
				return;
			event.preventDefault();
			event.stopPropagation();
			stepValue(event.deltaY < 0 ? 1 : -1);
		};
		input.addEventListener('wheel', onWheel, { passive: false });
		return () => input.removeEventListener('wheel', onWheel);
	});

	// Press and hold a stepper: after a delay it repeats, accelerating, and commits on release.
	const HOLD = { delayMs: 500, firstIntervalMs: 250, acceleration: 0.9, minIntervalMs: 50 };
	type Hold = { pointerId: number; timer: ReturnType<typeof setTimeout> | null; held: number | null; intervalMs: number };
	let hold: Hold | null = null;
	let isClickAfterHold = false;
	function cancelHold() {
		if (!hold) return;
		if (hold.timer != null) clearTimeout(hold.timer);
		hold = null;
		holdDraft = null;
	}
	$effect(() => cancelHold);
	function startHold(direction: 1 | -1, canStep: boolean, e: PointerEvent & { currentTarget: HTMLButtonElement }) {
		e.preventDefault();
		isClickAfterHold = false;
		cancelHold();
		if (e.button !== 0 || e.pointerType === 'touch' || !canStep || isDisabled || isReadOnly) return;
		const first = steppedValue(valueForStepping, direction);
		if (first == null) return;
		e.currentTarget.setPointerCapture?.(e.pointerId);
		const h: Hold = { pointerId: e.pointerId, timer: null, held: null, intervalMs: HOLD.firstIntervalMs };
		const repeat = () => {
			const next = h.held == null ? first : steppedValue(h.held, direction);
			if (next == null || next === h.held) {
				h.timer = null;
				return;
			}
			h.held = next;
			holdDraft = next;
			h.timer = setTimeout(repeat, h.intervalMs);
			h.intervalMs = Math.max(HOLD.minIntervalMs, h.intervalMs * HOLD.acceleration);
		};
		h.timer = setTimeout(repeat, HOLD.delayMs);
		hold = h;
	}
	function endHold(end: 'release' | 'cancel', pointerId: number) {
		const h = hold;
		if (!h || h.pointerId !== pointerId) return;
		hold = null;
		if (h.timer != null) clearTimeout(h.timer);
		if (h.held == null) return;
		isClickAfterHold = end === 'release';
		holdDraft = null;
		if (isDisabled || isReadOnly) return;
		endDraft();
		if (h.held !== value) emit(h.held);
	}
	function stepperClick(direction: 1 | -1, canStep: boolean, e: MouseEvent) {
		const afterHold = isClickAfterHold;
		isClickAfterHold = false;
		inputEl?.focus();
		if (afterHold && e.detail > 0) return;
		if (isDisabled || isReadOnly || !canStep) return;
		stepValue(direction);
	}

	function handleClear(e: MouseEvent) {
		if (hasClear) emit(null);
		endDraft();
		inputEl?.focus({ preventScroll: e.detail !== 0 });
	}

	function focusFromWrapper(e: MouseEvent) {
		if (isDisabled || e.target !== e.currentTarget) return;
		inputEl?.focus();
	}

	$effect(() => {
		if (hasAutoFocus) inputEl?.focus();
	});
</script>

{#snippet control()}
	<Tooltip content={disabledMessage ?? ''} isEnabled={showsDisabledMessage} focusTrigger="always">
		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
		<div
			class={['astryx-number-input', 'control', controlClass]}
			class:disabled={isDisabled}
			class:in-group={inputGroup != null}
			class:with-steppers={hasNumberSteppers}
			data-size={size}
			data-status={fieldStatus?.type}
			data-disabled={isDisabled ? 'disabled' : undefined}
			data-readonly={isReadOnly ? 'readonly' : undefined}
			{...{ [INPUT_GROUP_ITEM]: inputGroup ? '' : undefined }}
			onclick={focusFromWrapper}
		>
			{#if startIcon}<Icon icon={startIcon} size="sm" color="secondary" />{/if}
			{#if inputGroup}<VisuallyHidden id={inputLabelID}>{label}</VisuallyHidden>{/if}
			<input
				{...rest}
				bind:this={inputEl}
				{id}
				name={isDisabled || formatValue || isDraftKeptAtBlur ? undefined : htmlName}
				type="text"
				inputmode={isIntegerOnly ? 'numeric' : 'decimal'}
				role="spinbutton"
				value={displayValue}
				{placeholder}
				readonly={isReadOnly || isDisabled || undefined}
				aria-disabled={isDisabled ? 'true' : undefined}
				data-autofocus={hasAutoFocus || undefined}
				aria-valuemin={min ?? undefined}
				aria-valuemax={max ?? undefined}
				aria-valuenow={value ?? undefined}
				aria-valuetext={value == null || !formatValue ? undefined : formattedValue}
				aria-describedby={describedBy}
				aria-required={isRequired && !isOptional ? 'true' : undefined}
				aria-invalid={fieldStatus?.type === 'error' || shownEntryError != null ? 'true' : undefined}
				aria-labelledby={labelledBy}
				class:invalid={shownEntryError != null}
				oninput={handleInput}
				onfocus={handleFocus}
				onblur={handleBlur}
				onkeydown={handleKeydown}
			/>
			{#if htmlName && !isDisabled && (formatValue || isDraftKeptAtBlur)}
				<input type="hidden" name={htmlName} form={rest.form} value={hiddenFormValue} />
			{/if}
			{#if units}<span id={unitsID} class="units">{units}</span>{/if}
			<VisuallyHidden role="alert" aria-live="assertive">{alertMessage}</VisuallyHidden>
			{#if hasClear && value != null && !isDisabled && !isReadOnly}
				<Button
					class="astryx-input-clear-button input-clear"
					variant="ghost"
					size="sm"
					label="Clear {label}"
					tooltip="Clear"
					icon="close"
					isIconOnly
					onmousedown={(e) => e.preventDefault()}
					onclick={handleClear}
				/>
			{/if}
			{#if fieldStatus}<Icon icon={fieldStatus.type} size="md" color={fieldStatus.type} />{/if}
			{#if hasNumberSteppers}
				<div class="steppers">
					{#each [1, -1] as const as direction (direction)}
						{@const canStep = direction === 1 ? canIncrement : canDecrement}
						<button
							type="button"
							tabindex={-1}
							class="astryx-number-input-stepper stepper"
							class:decrement={direction === -1}
							class:inactive={isDisabled || isReadOnly || !canStep}
							data-direction={direction === 1 ? 'increment' : 'decrement'}
							aria-disabled={isDisabled || isReadOnly || !canStep || undefined}
							aria-label="{direction === 1 ? 'Increment' : 'Decrement'} {label}"
							onpointerdown={(e) => startHold(direction, canStep, e)}
							onpointerup={(e) => endHold('release', e.pointerId)}
							onpointercancel={(e) => endHold('cancel', e.pointerId)}
							onlostpointercapture={(e) => endHold('cancel', e.pointerId)}
							oncontextmenu={() => {
								if (hold) {
									cancelHold();
									isClickAfterHold = true;
								}
							}}
							onclick={(e) => stepperClick(direction, canStep, e)}
						>
							<span class="stepper-icon" class:up={direction === 1}>
								<Icon icon="numberInput:stepperDown" size="xsm" color="inherit" />
							</span>
						</button>
					{/each}
				</div>
			{/if}
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
		{labelIcon}
		status={fieldStatus
			? {
					type: fieldStatus.type,
					message: fieldStatus.message,
					messageID: fieldStatus.message ? statusMessageID : undefined
				}
			: undefined}
		{statusVariant}
		{labelTooltip}
		{width}
	>
		{@render control()}
	</Field>
{/if}

<style>
	@layer astryx-base {
		.control {
			--_pad-block: var(--astryx-number-input-padding, var(--spacing-1));
			--_pad-inline: var(--astryx-number-input-padding-inline, var(--astryx-number-input-padding, var(--spacing-2)));
			--_pad-block-start: var(--astryx-number-input-padding-block-start, var(--_pad-block));
			--_pad-block-end: var(--astryx-number-input-padding-block-end, var(--_pad-block));
			--_pad-inline-start: var(--astryx-number-input-padding-inline-start, var(--_pad-inline));
			--_pad-inline-end: var(--astryx-number-input-padding-inline-end, var(--_pad-inline));
			box-sizing: border-box;
			position: relative;
			z-index: 1;
			display: flex;
			align-items: center;
			gap: var(--spacing-2);
			padding-block: var(--_pad-block-start) var(--_pad-block-end);
			padding-inline: var(--_pad-inline-start) var(--_pad-inline-end);
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
		.with-steppers { padding-inline-end: 0; }
		@media (pointer: coarse) {
			.with-steppers { padding-inline-end: var(--_pad-inline-end); }
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
		.disabled { cursor: default; opacity: 0.5; border-color: var(--color-border-emphasized); box-shadow: none; }
		.disabled:focus-within { box-shadow: none; }
		.in-group { flex: 1; min-width: 0; }
		.in-group.disabled { opacity: 1; }
		.control[data-size='sm'] { height: var(--size-element-sm); }
		.control[data-size='md'] { height: var(--size-element-md); }
		.control[data-size='lg'] { height: var(--size-element-lg); }

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
		.disabled input { cursor: default; }
		input.invalid { color: var(--color-text-secondary); }
		.units {
			font-family: var(--font-family-body);
			font-size: var(--text-body-size);
			line-height: var(--text-body-leading);
			color: var(--color-text-secondary);
			flex-shrink: 0;
		}
		.control :global(.input-clear) { height: 20px; color: var(--color-icon-secondary); }

		.steppers {
			align-self: stretch;
			display: flex;
			flex-direction: column;
			flex-shrink: 0;
			width: var(--spacing-4);
			margin-block: calc(-1 * var(--_pad-block-start)) calc(-1 * var(--_pad-block-end));
			border-inline-start: var(--border-width) solid var(--color-border-emphasized);
			overflow: hidden;
			border-start-end-radius: var(--_field-radius);
			border-end-end-radius: var(--_field-radius);
		}
		@media (pointer: coarse) {
			.steppers { display: none; }
		}
		.stepper {
			box-sizing: border-box;
			display: flex;
			align-items: center;
			justify-content: center;
			flex: 1;
			min-height: 0;
			padding: 0;
			margin: 0;
			border: 0 none;
			color: var(--color-icon-secondary);
			background-color: var(--color-background-surface);
			cursor: pointer;
			outline: none;
		}
		@media (hover: hover) {
			.stepper:not(.inactive):hover { background-image: linear-gradient(var(--color-overlay-hover), var(--color-overlay-hover)); }
		}
		.stepper:not(.inactive):active { background-image: linear-gradient(var(--color-overlay-pressed), var(--color-overlay-pressed)); }
		.stepper.inactive { color: var(--color-icon-disabled); cursor: default; background-image: none; }
		.decrement { border-block-start: var(--border-width) solid var(--color-border-emphasized); }
		.stepper-icon { display: flex; }
		.stepper-icon.up { transform: rotate(180deg); }
	}
</style>
