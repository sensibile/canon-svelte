<!--
  Port of Astryx `TextInput` (packages/core/src/TextInput/TextInput.tsx), MIT, Meta Platforms, Inc.
  Use `bind:value`, or `value` + `onChange(value, event)` like Astryx.
  Not yet ported: the "tooltip" status variant, InputGroup integration.
-->
<script lang="ts" module>
	export type TextInputType = 'text' | 'password' | 'email' | 'search' | 'tel' | 'url';
	export type TextInputSize = 'sm' | 'md' | 'lg';
</script>

<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import Field from '../Field/Field.svelte';
	import type { FieldStatusInput, FieldStatusPlacement } from '../Field/types.js';
	import Icon, { type IconComponent } from '../Icon/Icon.svelte';
	import type { IconName } from '../Icon/defaultIcons.js';
	import Spinner from '../Spinner/Spinner.svelte';
	import Button from '../Button/Button.svelte';
	import VisuallyHidden from '../VisuallyHidden/VisuallyHidden.svelte';
	import Tooltip from '../Tooltip/Tooltip.svelte';
	import type { SizeValue } from '../../types.js';

	interface Props
		extends Omit<HTMLInputAttributes, 'type' | 'size' | 'value' | 'disabled' | 'readonly' | 'required' | 'onchange'> {
		label: string;
		value?: string;
		type?: TextInputType;
		isLabelHidden?: boolean;
		description?: string;
		isOptional?: boolean;
		isRequired?: boolean;
		isDisabled?: boolean;
		isReadOnly?: boolean;
		/** Why the input is disabled; shown in a tooltip on hover and focus while disabled. */
		disabledMessage?: string;
		/** Help text shown in an InfoTip next to the label. */
		labelTooltip?: string;
		startIcon?: IconName | IconComponent;
		status?: FieldStatusInput;
		statusVariant?: FieldStatusPlacement;
		size?: TextInputSize;
		isLoading?: boolean;
		placeholder?: string;
		width?: SizeValue;
		/** Show a clear (×) button while there's a value. */
		hasClear?: boolean;
		hasAutoFocus?: boolean;
		/** The input's `name` for form submission. */
		htmlName?: string;
		hasSpellCheck?: boolean;
		onChange?: (value: string, e: Event) => void;
		onEnter?: () => void;
		/** Class/style for the outer Field container. */
		containerClass?: string;
		/** Class for the bordered control row. */
		controlClass?: string;
	}

	let {
		label,
		value = $bindable(''),
		type = 'text',
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
		width,
		hasClear = false,
		hasAutoFocus = false,
		htmlName,
		hasSpellCheck,
		onChange,
		onEnter,
		onkeydown,
		oninput,
		containerClass,
		controlClass,
		id: idProp,
		'aria-describedby': describedByProp,
		...rest
	}: Props = $props();

	const uid = $props.id();
	const id = $derived(idProp ?? `${uid}-input`);
	const descriptionID = `${uid}-desc`;
	const statusMessageID = `${uid}-status`;
	const disabledMessageID = `${uid}-disabled-reason`;
	const showsDisabledMessage = $derived(isDisabled && !!disabledMessage);
	let inputEl: HTMLInputElement | undefined = $state();

	const messagelessError = $derived(status?.type === 'error' && !status.message);
	const describedBy = $derived(
		[
			describedByProp,
			description ? descriptionID : null,
			status?.message || messagelessError ? statusMessageID : null,
			showsDisabledMessage ? disabledMessageID : null
		]
			.filter(Boolean)
			.join(' ') || undefined
	);

	function handleInput(e: Event) {
		if (isDisabled || isReadOnly) return;
		const next = (e.currentTarget as HTMLInputElement).value;
		value = next;
		onChange?.(next, e);
		(oninput as ((e: Event) => void) | undefined)?.(e);
	}

	function handleKeydown(e: KeyboardEvent & { currentTarget: EventTarget & HTMLInputElement }) {
		if (isDisabled) {
			if (e.key === 'Enter') e.preventDefault();
			return;
		}
		if (e.key === 'Enter' && !e.isComposing) onEnter?.();
		onkeydown?.(e);
	}

	function clear(e: MouseEvent) {
		value = '';
		onChange?.('', e);
		inputEl?.focus({ preventScroll: e.detail !== 0 });
	}

	// Clicking the padding around the input focuses it.
	function focusFromWrapper(e: MouseEvent) {
		if (isDisabled || e.target !== e.currentTarget) return;
		inputEl?.focus();
	}

	$effect(() => {
		if (hasAutoFocus) inputEl?.focus();
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
			class={['astryx-text-input', 'control', controlClass]}
			class:disabled={isDisabled}
			data-size={size}
			data-status={status?.type}
			data-disabled={isDisabled ? 'disabled' : undefined}
			data-readonly={isReadOnly ? 'readonly' : undefined}
			onclick={focusFromWrapper}
		>
			{#if startIcon}<Icon icon={startIcon} size="sm" color="secondary" />{/if}
			<input
				{...rest}
				bind:this={inputEl}
				{id}
				name={isDisabled ? undefined : htmlName}
				{type}
				{value}
				{placeholder}
				spellcheck={hasSpellCheck}
				readonly={isReadOnly || isDisabled || undefined}
				aria-disabled={isDisabled ? 'true' : undefined}
				aria-describedby={describedBy}
				aria-required={isRequired && !isOptional ? 'true' : undefined}
				aria-invalid={status?.type === 'error' ? 'true' : undefined}
				aria-busy={isLoading || undefined}
				data-autofocus={hasAutoFocus || undefined}
				oninput={handleInput}
				onkeydown={handleKeydown}
			/>
			{#if isLoading}<Spinner size="sm" aria-hidden="true" />{/if}
			{#if hasClear && value !== '' && !isDisabled && !isReadOnly}
				<Button
					class="astryx-input-clear-button input-clear"
					variant="ghost"
					size="sm"
					label="Clear {label}"
					icon="close"
					isIconOnly
					onmousedown={(e) => e.preventDefault()}
					onclick={clear}
				/>
			{/if}
			{#if status}<Icon icon={status.type} size="md" color={status.type} />{/if}
		</div>
	</Tooltip>
	{#if showsDisabledMessage}
		<VisuallyHidden id={disabledMessageID}>{disabledMessage}</VisuallyHidden>
	{/if}
	{#if messagelessError}
		<VisuallyHidden id={statusMessageID}>This field has an error</VisuallyHidden>
	{/if}
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

		.control[data-size='sm'] { height: max(var(--size-element-sm), calc(var(--text-body-size) * var(--text-body-leading) + 2 * var(--border-width))); }
		.control[data-size='md'] { height: max(var(--size-element-md), calc(var(--text-body-size) * var(--text-body-leading) + 2 * var(--border-width))); }
		.control[data-size='lg'] { height: max(var(--size-element-lg), calc(var(--text-body-size) * var(--text-body-leading) + 2 * var(--border-width))); }

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
		.control :global(.input-clear) { height: 20px; color: var(--color-icon-secondary); }
	}
</style>
