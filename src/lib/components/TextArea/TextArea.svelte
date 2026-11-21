<!--
  Port of Astryx `TextArea` (packages/core/src/TextArea/TextArea.tsx), MIT, Meta Platforms, Inc.
  Use `bind:value`, or `value` + `onChange(value, event)` like Astryx.
  `maxLength` shows a counter and marks the field invalid past it without blocking input;
  `htmlMaxLength` is the hard native limit.
  Not yet ported: `changeAction` (optimistic async change), the "tooltip" status variant.
-->
<script lang="ts" module>
	export type TextAreaSize = 'sm' | 'md' | 'lg';
</script>

<script lang="ts">
	import type { HTMLTextareaAttributes } from 'svelte/elements';
	import Field from '../Field/Field.svelte';
	import type { FieldStatusInput, FieldStatusPlacement } from '../Field/types.js';
	import Icon, { type IconComponent } from '../Icon/Icon.svelte';
	import type { IconName } from '../Icon/defaultIcons.js';
	import Spinner from '../Spinner/Spinner.svelte';
	import VisuallyHidden from '../VisuallyHidden/VisuallyHidden.svelte';
	import Tooltip from '../Tooltip/Tooltip.svelte';
	import { characterCount } from '../../internal/characters.js';
	import type { SizeValue } from '../../types.js';

	interface Props
		extends Omit<
			HTMLTextareaAttributes,
			'value' | 'disabled' | 'readonly' | 'required' | 'onchange' | 'maxlength' | 'rows'
		> {
		label: string;
		value?: string;
		isLabelHidden?: boolean;
		description?: string;
		isOptional?: boolean;
		isRequired?: boolean;
		isDisabled?: boolean;
		isReadOnly?: boolean;
		/** Why the field is disabled; shown in a tooltip on hover and focus while disabled. */
		disabledMessage?: string;
		labelTooltip?: string;
		startIcon?: IconName | IconComponent;
		status?: FieldStatusInput;
		statusVariant?: FieldStatusPlacement;
		size?: TextAreaSize;
		isLoading?: boolean;
		placeholder?: string;
		rows?: number;
		width?: SizeValue;
		/** Soft limit: shows a counter and flags the field invalid when exceeded. */
		maxLength?: number;
		/** Hard native `maxlength`. */
		htmlMaxLength?: number;
		hasAutoFocus?: boolean;
		htmlName?: string;
		hasSpellCheck?: boolean;
		onChange?: (value: string, e: Event) => void;
		containerClass?: string;
		controlClass?: string;
	}

	let {
		label,
		value = $bindable(''),
		isLabelHidden = false,
		description,
		isOptional = false,
		isRequired = false,
		isDisabled = false,
		isReadOnly = false,
		disabledMessage,
		labelTooltip,
		startIcon,
		status,
		statusVariant = 'attached',
		size = 'md',
		isLoading = false,
		placeholder,
		rows = 3,
		width,
		maxLength,
		htmlMaxLength,
		hasAutoFocus = false,
		htmlName,
		hasSpellCheck = true,
		onChange,
		oninput,
		onpaste,
		containerClass,
		controlClass,
		id: idProp,
		'aria-describedby': describedByProp,
		...rest
	}: Props = $props();

	const COUNTER_WARNING_THRESHOLD = 0.8;
	const uid = $props.id();
	const id = $derived(idProp ?? `${uid}-textarea`);
	const descriptionID = `${uid}-desc`;
	const statusMessageID = `${uid}-status`;
	const counterID = `${uid}-counter`;
	const disabledMessageID = `${uid}-disabled-reason`;
	const showsDisabledMessage = $derived(isDisabled && !!disabledMessage);
	let textareaEl: HTMLTextAreaElement | undefined = $state();

	const messagelessError = $derived(status?.type === 'error' && !status.message);
	const valueLength = $derived(maxLength != null ? characterCount(value) : 0);
	const isOver = $derived(maxLength != null && valueLength > maxLength);
	const describedBy = $derived(
		[
			describedByProp,
			description ? descriptionID : null,
			status?.message || messagelessError ? statusMessageID : null,
			maxLength != null ? counterID : null,
			showsDisabledMessage ? disabledMessageID : null
		]
			.filter(Boolean)
			.join(' ') || undefined
	);

	// Announce once when the count crosses into "near the limit" or "over the limit".
	let counterZone: 'under' | 'near' | 'over' | null = null;
	let politeAnnouncement = $state('');
	let assertiveAnnouncement = $state('');
	const plural = (n: number) => `${n.toLocaleString()} ${n === 1 ? 'character' : 'characters'}`;
	function announceCounter(length: number) {
		if (maxLength == null) return;
		const zone =
			length > maxLength ? 'over' : length >= maxLength * COUNTER_WARNING_THRESHOLD ? 'near' : 'under';
		if (zone === counterZone) return;
		counterZone = zone;
		if (zone === 'over') assertiveAnnouncement = `${plural(length - maxLength)} over the limit`;
		else if (zone === 'near') politeAnnouncement = `${plural(maxLength - length)} remaining`;
	}

	function handleInput(e: Event) {
		if (isDisabled || isReadOnly) return;
		const next = (e.currentTarget as HTMLTextAreaElement).value;
		if (maxLength != null) announceCounter(characterCount(next));
		value = next;
		onChange?.(next, e);
		(oninput as ((e: Event) => void) | undefined)?.(e);
	}

	function focusFromWrapper(e: MouseEvent) {
		if (isDisabled || isLoading || e.target !== e.currentTarget) return;
		textareaEl?.focus();
	}

	$effect(() => {
		if (hasAutoFocus) textareaEl?.focus();
	});
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
	{isDisabled}
	{labelTooltip}
	status={status
		? { type: status.type, message: status.message, messageID: status.message ? statusMessageID : undefined }
		: undefined}
	{statusVariant}
	{width}
>
	<Tooltip content={disabledMessage ?? ''} isEnabled={showsDisabledMessage} focusTrigger="always">
		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
		<div
			class={['astryx-text-area', 'control', controlClass]}
			class:disabled={isDisabled}
			data-size={size}
			data-status={status?.type}
			data-disabled={isDisabled ? 'disabled' : undefined}
			data-readonly={isReadOnly ? 'readonly' : undefined}
			onclick={focusFromWrapper}
		>
			{#if startIcon}
				<span class="start-icon"><Icon icon={startIcon} size="sm" color="secondary" /></span>
			{/if}
			<textarea
				{...rest}
				bind:this={textareaEl}
				class="astryx-text-area-control textarea"
				class:with-start-icon={startIcon != null}
				class:with-status={isLoading || status != null}
				class:with-busy-status={isLoading && status != null}
				class:with-counter={maxLength != null}
				{id}
				name={isDisabled ? undefined : htmlName}
				{value}
				{placeholder}
				{rows}
				maxlength={htmlMaxLength}
				spellcheck={hasSpellCheck}
				readonly={isReadOnly || isDisabled || undefined}
				aria-disabled={isDisabled ? 'true' : undefined}
				aria-describedby={describedBy}
				aria-required={isRequired && !isOptional ? 'true' : undefined}
				aria-invalid={status?.type === 'error' || isOver ? 'true' : undefined}
				aria-busy={isLoading || undefined}
				data-autofocus={hasAutoFocus || undefined}
				oninput={handleInput}
				onpaste={isDisabled ? undefined : onpaste}
			></textarea>
			{#if isLoading || status}
				<span class="end-slot">
					{#if isLoading}<Spinner size="sm" aria-hidden="true" />{/if}
					{#if status}<Icon icon={status.type} size="md" color={status.type} />{/if}
				</span>
			{/if}
			{#if maxLength != null}
				<div id={counterID} class="astryx-text-area-counter counter" class:over={isOver}>
					{#if isOver}<Icon icon="warning" size="sm" />{/if}
					{valueLength.toLocaleString()}/{maxLength.toLocaleString()}
				</div>
			{/if}
		</div>
	</Tooltip>
	{#if maxLength != null}
		<VisuallyHidden aria-live="polite">{politeAnnouncement}</VisuallyHidden>
		<VisuallyHidden aria-live="assertive">{assertiveAnnouncement}</VisuallyHidden>
	{/if}
	{#if showsDisabledMessage}
		<VisuallyHidden id={disabledMessageID}>{disabledMessage}</VisuallyHidden>
	{/if}
	{#if messagelessError}
		<VisuallyHidden id={statusMessageID}>Invalid value</VisuallyHidden>
	{/if}
</Field>

<style>
	@layer astryx-base {
		.control {
			--_textarea-inline-padding: var(--spacing-2);
			box-sizing: border-box;
			position: relative;
			z-index: 1;
			display: block;
			padding: 0;
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
		.disabled { cursor: default; opacity: 0.5; border-color: var(--color-border-emphasized); box-shadow: none; }
		.disabled:focus-within { box-shadow: none; }

		.textarea {
			display: block;
			width: 100%;
			box-sizing: border-box;
			min-width: 0;
			border: 0 none;
			padding-block: var(--spacing-1);
			padding-inline: var(--_textarea-inline-padding);
			font-family: var(--font-family-body);
			font-size: var(--text-body-size);
			line-height: var(--text-body-leading);
			color: var(--color-text-primary);
			background-color: transparent;
			border-radius: inherit;
			outline: none;
			resize: vertical;
		}
		@media (pointer: coarse) {
			@supports (-webkit-touch-callout: none) {
				.textarea { font-size: max(1rem, var(--text-body-size)); }
			}
		}
		.textarea::placeholder { color: var(--color-text-secondary); }
		.control[data-size='lg'] .textarea { padding-block: var(--spacing-2); }
		.disabled .textarea { cursor: default; }
		.with-start-icon { padding-inline-start: calc(var(--_textarea-inline-padding) + var(--spacing-6)); }
		.with-status { padding-inline-end: calc(var(--_textarea-inline-padding) + var(--spacing-6)); }
		.with-busy-status { padding-inline-end: calc(var(--_textarea-inline-padding) + var(--spacing-12)); }
		.with-counter { padding-bottom: var(--spacing-7); }

		.start-icon {
			position: absolute;
			top: var(--spacing-2);
			inset-inline-start: var(--_textarea-inline-padding);
			pointer-events: none;
			display: flex;
		}
		.end-slot {
			position: absolute;
			top: var(--spacing-2);
			inset-inline-end: var(--_textarea-inline-padding);
			pointer-events: none;
			display: flex;
			align-items: center;
			gap: var(--spacing-2);
		}
		.counter {
			position: absolute;
			bottom: var(--spacing-1);
			inset-inline-end: var(--_textarea-inline-padding);
			pointer-events: none;
			display: flex;
			align-items: center;
			gap: var(--spacing-1);
			font-family: var(--font-family-body);
			font-size: var(--text-supporting-size);
			line-height: var(--text-supporting-leading);
			color: var(--color-text-secondary);
		}
		.counter.over { color: var(--color-text-error); }
	}
</style>
