<!--
  Port of Astryx `CheckboxInput` + `CheckboxIndicator` (packages/core/src/CheckboxInput, Indicator), MIT, Meta Platforms, Inc.
  `value` is true, false or "indeterminate"; use `bind:value` or `onChange(checked, event)`.
  Not yet ported: `disabledMessage` (needs Tooltip), theme indicators, touch press feedback.
-->
<script lang="ts" module>
	export type CheckboxInputSize = 'sm' | 'md';
	export type CheckboxValue = boolean | 'indeterminate';
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import FieldLabel from '../Field/FieldLabel.svelte';
	import FieldStatus from '../Field/FieldStatus.svelte';
	import type { FieldStatusInput } from '../Field/types.js';
	import type { IconComponent } from '../Icon/Icon.svelte';
	import type { IconName } from '../Icon/defaultIcons.js';
	import Spinner from '../Spinner/Spinner.svelte';
	import { cssSize, type SizeValue } from '../../types.js';

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'onchange'> {
		label: string;
		value?: CheckboxValue;
		isLabelHidden?: boolean;
		description?: string;
		isLoading?: boolean;
		isDisabled?: boolean;
		isReadOnly?: boolean;
		isOptional?: boolean;
		isRequired?: boolean;
		htmlName?: string;
		size?: CheckboxInputSize;
		width?: SizeValue;
		labelIcon?: IconName | IconComponent;
		status?: FieldStatusInput;
		onChange?: (checked: boolean, e: Event) => void;
	}

	let {
		label,
		value = $bindable(false),
		isLabelHidden = false,
		description,
		isLoading = false,
		isDisabled = false,
		isReadOnly = false,
		isOptional = false,
		isRequired = false,
		htmlName,
		size = 'md',
		width,
		labelIcon,
		status,
		onChange,
		id: idProp,
		class: className,
		style,
		'aria-describedby': describedByProp,
		...rest
	}: Props = $props();

	const uid = $props.id();
	const id = $derived(idProp ?? `${uid}-input`);
	const descriptionID = `${uid}-desc`;
	const statusMessageID = `${uid}-status`;

	const isIndeterminate = $derived(value === 'indeterminate');
	const isChecked = $derived(value === true);
	const state = $derived(isIndeterminate ? 'indeterminate' : isChecked ? 'checked' : 'unchecked');
	const describedBy = $derived(
		[describedByProp, description ? descriptionID : null, status?.message ? statusMessageID : null]
			.filter(Boolean)
			.join(' ') || undefined
	);

	function handleChange(e: Event & { currentTarget: HTMLInputElement }) {
		const input = e.currentTarget;
		if (isDisabled || isLoading || isReadOnly) {
			// Undo the browser's toggle.
			input.checked = isChecked;
			input.indeterminate = isIndeterminate;
			return;
		}
		value = input.checked;
		onChange?.(input.checked, e);
	}
</script>

<div
	{...rest}
	class={['astryx-checkbox-input', className]}
	data-checkbox-size={size}
	style={[width != null && `width: ${cssSize(width)}`, style].filter(Boolean).join('; ') || undefined}
>
	<div class="row" class:label-hidden={isLabelHidden} class:enabled={!isDisabled}>
		<div class="wrapper">
			<input
				{id}
				type="checkbox"
				name={isDisabled ? undefined : htmlName}
				checked={isChecked}
				indeterminate={isIndeterminate}
				required={isRequired}
				readonly={isReadOnly}
				aria-disabled={isDisabled ? 'true' : undefined}
				aria-readonly={isReadOnly || undefined}
				aria-required={isRequired ? 'true' : undefined}
				aria-describedby={describedBy}
				aria-invalid={status?.type === 'error' ? true : isRequired ? false : undefined}
				aria-busy={isLoading || undefined}
				form={isDisabled ? '' : undefined}
				class:disabled={isDisabled}
				data-size={size}
				onchange={handleChange}
			/>
			<span
				class="astryx-checkbox-indicator box"
				class:checked={state !== 'unchecked'}
				class:box-disabled={isDisabled}
				aria-hidden="true"
				data-size={size}
				data-checked={state === 'unchecked' ? undefined : state}
				data-disabled={isDisabled ? 'disabled' : undefined}
			>
				{#if isLoading}
					<Spinner size="sm" shade="inherit" />
				{:else}
					<svg viewBox="0 0 10 10" class="astryx-checkbox-indicator-check check" class:visible={state === 'checked'}>
						<path d="M8.5 2.5L4 7.5L1.5 5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
					<span class="astryx-checkbox-indicator-dash dash" class:visible={state === 'indeterminate'}></span>
				{/if}
			</span>
		</div>
		<div class="label-wrapper">
			<FieldLabel
				class="astryx-checkbox-label"
				{label}
				inputID={id}
				{isLabelHidden}
				{isDisabled}
				{isOptional}
				{isRequired}
				{labelIcon}
				{description}
				{descriptionID}
			/>
		</div>
	</div>
	{#if status?.message}
		<FieldStatus type={status.type} message={status.message} id={statusMessageID} variant="detached" />
	{/if}
</div>

<style>
	@layer astryx-base {
		.row { display: flex; align-items: center; gap: var(--_checkbox-input-gap, var(--spacing-2)); }
		.label-hidden { gap: 0; }
		.label-wrapper { display: flex; flex-direction: column; }

		.wrapper {
			position: relative;
			display: flex;
			align-items: center;
			justify-content: center;
			flex-shrink: 0;
			isolation: isolate;
		}
		input {
			position: absolute;
			top: 50%;
			inset-inline-start: 50%;
			translate: -50% -50%;
			margin: 0;
			padding: 0;
			opacity: 0;
			cursor: pointer;
			z-index: 1;
		}
		:global([dir='rtl']) input { translate: 50% -50%; }
		input.disabled { cursor: default; }
		@media (pointer: coarse) {
			input { min-inline-size: 24px; min-block-size: 24px; }
		}

		.box {
			box-sizing: border-box;
			display: flex;
			align-items: center;
			justify-content: center;
			flex-shrink: 0;
			border: var(--border-width) solid var(--color-border-emphasized);
			border-radius: var(--radius-inner);
			color: var(--color-accent);
			background-color: var(--color-background-surface);
			transition-property: background-color, border-color;
			transition-duration: var(--duration-fast);
			transition-timing-function: var(--ease-standard);
		}
		@media (prefers-reduced-motion: reduce) {
			.box { transition-duration: 0s; }
		}
		[data-size='sm'] { width: 20px; height: 20px; }
		[data-size='md'] { width: 24px; height: 24px; }

		.checked { color: var(--color-on-accent); border-color: var(--color-accent); background-color: var(--color-accent); }
		@media (hover: hover) {
			.enabled:hover .box:not(.checked) {
				border-color: color-mix(in srgb, var(--color-border-emphasized), var(--color-tint-hover) 20%);
				background-color: color-mix(in srgb, var(--color-background-surface), var(--color-tint-hover) 5%);
			}
			.enabled:hover .checked {
				border-color: color-mix(in srgb, var(--color-accent), var(--color-tint-hover) 15%);
				background-color: color-mix(in srgb, var(--color-accent), var(--color-tint-hover) 15%);
			}
		}
		.enabled:active .box::after {
			content: '';
			position: absolute;
			inset: 0;
			border-radius: var(--radius-inner);
			pointer-events: none;
			background: var(--color-overlay-pressed);
		}
		.box-disabled { opacity: 0.5; border-color: var(--color-border); }
		.box-disabled:not(.checked) { background-color: var(--color-background-muted); }

		.wrapper:has(input:focus-visible) .box {
			outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color);
			outline-offset: var(--focus-outline-offset);
		}

		.check { display: none; color: var(--color-on-accent); }
		.dash { display: none; height: 2px; background-color: var(--color-on-accent); border-radius: var(--radius-full); }
		.visible { display: block; }
		.box[data-size='sm'] .check { width: calc((100% + 2 * var(--border-width)) * 12 / 20); height: calc((100% + 2 * var(--border-width)) * 12 / 20); }
		.box[data-size='md'] .check { width: calc((100% + 2 * var(--border-width)) * 14 / 24); height: calc((100% + 2 * var(--border-width)) * 14 / 24); }
		.dash { width: calc((100% + 2 * var(--border-width)) / 2); }
		@media (forced-colors: active) {
			.check { color: CanvasText; }
			.dash { background-color: CanvasText; }
		}
	}
</style>
