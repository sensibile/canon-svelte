<!--
  Port of Astryx `NativeTimeSegment` (packages/core/src/DateTimeInput/NativeTimeSegment.tsx and
  nativePickerSegmentStyles.ts), MIT, Meta Platforms, Inc.
  The browser's own `<input type="time">` inside a time field, for the native presentation. Where
  the browser only opens a picker (iOS), the field's own formatted time shows over it; where it
  edits in place, its segments show while it has focus. The clock button opens the picker. An edit
  outside `min` or `max` is refused and reported through `onRejectedChange`; clearing it commits
  undefined. Minutes only: the value drops seconds, as Astryx does.
-->
<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import Icon from '../Icon/Icon.svelte';
	import { formatISOTime, isTimeInRange, parseISOTime, type ISOTimeString } from '../../internal/date/timeParser.js';
	import { formatLocaleTime } from '../../internal/date/timeFormat.js';
	import { hasEditableDateSegments } from '../../internal/date/nativeDateSegments.js';
	import { TOUCH_POINTER_QUERY } from '../../internal/date/inputPresentation.js';
	import type { TimeInputEntryError } from '../TimeInput/typedTime.svelte.js';

	interface Props
		extends Omit<HTMLInputAttributes, 'type' | 'value' | 'min' | 'max' | 'placeholder' | 'disabled' | 'readonly'> {
		id: string;
		value?: ISOTimeString;
		onChange: (value: ISOTimeString | undefined) => void;
		placeholder: string;
		openPickerLabel: string;
		min?: ISOTimeString;
		max?: ISOTimeString;
		hourFormat: '12h' | '24h';
		locale: string;
		isDisabled: boolean;
		isRequired: boolean;
		isBusy: boolean;
		/** The field's status type, for `aria-invalid`. */
		statusType?: string;
		/** A refused edit shows, dimmed and marked invalid. */
		isRejected: boolean;
		onRejectedChange: (error: TimeInputEntryError | null) => void;
		hasAutoFocus?: boolean;
		/** The native input, for the field to focus. */
		inputEl?: HTMLInputElement;
	}

	let {
		id,
		value,
		onChange,
		placeholder,
		openPickerLabel,
		min,
		max,
		hourFormat,
		locale,
		isDisabled,
		isRequired,
		isBusy,
		statusType,
		isRejected,
		onRejectedChange,
		hasAutoFocus = false,
		inputEl = $bindable(),
		onfocus,
		onblur,
		...rest
	}: Props = $props();

	const FRACTIONAL_SECONDS = /\.\d+$/;
	function normalize(text: string | undefined): ISOTimeString | undefined {
		if (!text) return undefined;
		const parsed = parseISOTime(text.replace(FRACTIONAL_SECONDS, ''));
		return parsed ? formatISOTime(parsed, false) : undefined;
	}

	let isFocused = $state(false);
	let isSegmentEditable = $state(false);
	const nativeValue = $derived(normalize(value) ?? '');
	const overlayText = $derived(nativeValue ? formatLocaleTime(nativeValue as ISOTimeString, locale, hourFormat, false) : placeholder);
	const showsOverlay = $derived(!!overlayText && !(isFocused && isSegmentEditable));

	function commit(text: string) {
		if (isDisabled) return;
		if (!text) {
			onRejectedChange(null);
			if (value !== undefined) onChange(undefined);
			return;
		}
		const normalized = normalize(text);
		// Half-typed segments read as no time yet.
		if (!normalized) return;
		if (!isTimeInRange(normalized, min, max)) {
			onRejectedChange({ kind: 'outOfRange', text, value: normalized });
			return;
		}
		onRejectedChange(null);
		if (normalized !== value) onChange(normalized);
	}

	// The control shows the committed time whenever it doesn't have focus.
	$effect(() => {
		const v = nativeValue;
		if (!isFocused && inputEl && inputEl.value !== v) inputEl.value = v;
	});

	$effect(() => {
		if (hasAutoFocus) inputEl?.focus();
	});

	function openPicker() {
		if (isDisabled || !inputEl) return;
		inputEl.focus();
		try {
			inputEl.showPicker?.();
		} catch {
			// A browser that can't open it from here keeps the focus.
		}
	}
</script>

<button
	type="button"
	class="icon-button"
	tabindex="-1"
	aria-label={openPickerLabel}
	aria-disabled={isDisabled || undefined}
	onclick={openPicker}
>
	<Icon icon="clock" size="sm" color="secondary" />
</button>
<span class="slot">
	<input
		{...rest}
		bind:this={inputEl}
		{id}
		type="time"
		min={min}
		max={max}
		step={60}
		readonly={isDisabled || undefined}
		aria-disabled={isDisabled ? 'true' : undefined}
		aria-required={isRequired ? 'true' : undefined}
		aria-invalid={statusType === 'error' || isRejected ? 'true' : undefined}
		aria-busy={isBusy || undefined}
		data-autofocus={hasAutoFocus || undefined}
		class:text-hidden={showsOverlay}
		class:invalid={isRejected}
		oninput={(e) => commit(e.currentTarget.value)}
		onchange={(e) => commit(e.currentTarget.value)}
		onfocus={(e) => {
			isSegmentEditable = hasEditableDateSegments(matchMedia(TOUCH_POINTER_QUERY).matches);
			isFocused = true;
			onfocus?.(e);
		}}
		onblur={(e) => {
			isFocused = false;
			onblur?.(e);
		}}
	/>
	{#if showsOverlay}
		<span class="overlay" class:placeholder={!nativeValue} class:invalid={isRejected && !!nativeValue} aria-hidden="true">
			{overlayText}
		</span>
	{/if}
</span>

<style>
	@layer astryx-base {
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
			inset-inline: 0;
			inset-block: 0;
			display: block;
			font-size: var(--text-body-size);
			line-height: var(--text-body-leading);
			color: var(--color-text-primary);
			pointer-events: none;
			overflow: hidden;
			white-space: nowrap;
			text-overflow: ellipsis;
		}
		.overlay.placeholder,
		.overlay.invalid { color: var(--color-text-secondary); }
		@media (pointer: coarse) {
			@supports (-webkit-touch-callout: none) {
				input,
				.overlay { font-size: max(1rem, var(--text-body-size)); }
			}
		}
	}
</style>
