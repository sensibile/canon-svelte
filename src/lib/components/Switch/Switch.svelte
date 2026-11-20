<!--
  Port of Astryx `Switch` (packages/core/src/Switch/Switch.tsx), MIT, Meta Platforms, Inc.
  Use `bind:value` or `onChange(checked, event)`.
  Not yet ported: touch drag-to-toggle and press feedback, `disabledMessage` and `labelTooltip` (need Tooltip).
-->
<script lang="ts" module>
	export type SwitchLabelPosition = 'start' | 'end';
	export type SwitchLabelSpacing = 'hug' | 'spread';
	export type SwitchSize = 'sm' | 'md';
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
		value?: boolean;
		isLabelHidden?: boolean;
		description?: string;
		isLoading?: boolean;
		isDisabled?: boolean;
		htmlName?: string;
		isOptional?: boolean;
		isRequired?: boolean;
		labelIcon?: IconName | IconComponent;
		width?: SizeValue;
		labelPosition?: SwitchLabelPosition;
		/** "spread" pushes label and switch to opposite ends of the row. */
		labelSpacing?: SwitchLabelSpacing;
		status?: FieldStatusInput;
		size?: SwitchSize;
		onChange?: (checked: boolean, e: Event) => void;
	}

	let {
		label,
		value = $bindable(false),
		isLabelHidden = false,
		description,
		isLoading = false,
		isDisabled = false,
		htmlName,
		isOptional = false,
		isRequired = false,
		labelIcon,
		width,
		labelPosition = 'end',
		labelSpacing = 'hug',
		status,
		size = 'md',
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
	const describedBy = $derived(
		[describedByProp, description ? descriptionID : null, status?.message ? statusMessageID : null]
			.filter(Boolean)
			.join(' ') || undefined
	);

	function handleChange(e: Event & { currentTarget: HTMLInputElement }) {
		if (isDisabled || isLoading) {
			e.currentTarget.checked = value;
			return;
		}
		value = e.currentTarget.checked;
		onChange?.(value, e);
	}
</script>

{#snippet switchEl()}
	<div class="switch-wrapper">
		<input
			{id}
			type="checkbox"
			role="switch"
			name={isDisabled ? undefined : htmlName}
			checked={value}
			required={isRequired}
			form={isDisabled ? '' : undefined}
			aria-disabled={isDisabled ? 'true' : undefined}
			aria-required={isRequired ? 'true' : undefined}
			aria-describedby={describedBy}
			aria-invalid={status?.type === 'error' ? true : isRequired ? false : undefined}
			aria-busy={isLoading || undefined}
			class:disabled={isDisabled}
			class:busy={isLoading}
			onchange={handleChange}
		/>
		<div
			aria-hidden="true"
			class="astryx-switch track"
			class:on={value}
			class:track-disabled={isDisabled}
			data-checked={value ? 'checked' : undefined}
			data-disabled={isDisabled ? 'disabled' : undefined}
			data-size={size}
		>
			<div class="astryx-switch-thumb thumb" class:on={value} data-checked={value ? 'checked' : undefined} data-size={size}>
				{#if isLoading}<Spinner size="sm" />{/if}
			</div>
		</div>
	</div>
{/snippet}

{#snippet labelEl()}
	<div class="label-wrapper" data-size={size}>
		<FieldLabel
			class="astryx-switch-label"
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
{/snippet}

<div
	{...rest}
	class={['astryx-switch-field', className]}
	data-label-position={labelPosition !== 'end' ? labelPosition : undefined}
	data-label-spacing={labelSpacing !== 'hug' ? labelSpacing : undefined}
	style={[width != null && `width: ${cssSize(width)}`, style].filter(Boolean).join('; ') || undefined}
>
	<div
		class="container"
		class:label-hidden={isLabelHidden}
		class:spread={labelSpacing === 'spread'}
		class:enabled={!isDisabled}
	>
		{#if labelPosition === 'start'}
			{@render labelEl()}{@render switchEl()}
		{:else}
			{@render switchEl()}{@render labelEl()}
		{/if}
	</div>
	{#if status?.message}
		<FieldStatus class="status-gap" type={status.type} message={status.message} id={statusMessageID} variant="detached" />
	{/if}
</div>

<style>
	@layer astryx-base {
		.container { display: flex; align-items: center; gap: var(--_switch-field-gap, var(--spacing-2)); }
		.label-hidden { gap: 0; }
		.spread { justify-content: space-between; width: 100%; }
		.astryx-switch-field :global(.status-gap) { margin-top: var(--spacing-2); }

		.switch-wrapper { position: relative; display: flex; align-items: center; flex-shrink: 0; isolation: isolate; }
		.enabled .switch-wrapper { touch-action: pan-y pinch-zoom; }
		input {
			position: absolute;
			top: 50%;
			inset-inline-start: 50%;
			width: 100%;
			height: 100%;
			translate: -50% -50%;
			margin: 0;
			padding: 0;
			opacity: 0;
			cursor: pointer;
			z-index: 1;
		}
		:global([dir='rtl']) input { translate: 50% -50%; }
		input.disabled { cursor: default; }
		input.busy { pointer-events: none; }

		.track {
			display: flex;
			align-items: center;
			container-type: size;
			box-sizing: border-box;
			border-radius: var(--radius-full);
			border: 0 none;
			background-color: var(--color-background-gray);
			transition: background-color var(--duration-fast) var(--ease-standard);
		}
		.track[data-size='sm'] { width: 32px; height: 20px; padding: 2px; }
		.track[data-size='md'] { width: 40px; height: 24px; padding: 4px; }
		.track.on { background-color: var(--color-accent); }
		@media (hover: hover) {
			.enabled:hover .track:not(.on) { background-color: color-mix(in srgb, var(--color-background-gray), var(--color-tint-hover) 5%); }
			.enabled:hover .track.on { background-color: color-mix(in srgb, var(--color-accent), var(--color-tint-hover) 15%); }
		}
		.enabled:active .track,
		.enabled:active .thumb { background-image: linear-gradient(var(--color-overlay-pressed), var(--color-overlay-pressed)); }
		input:focus-visible + .track {
			outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color);
			outline-offset: var(--focus-outline-offset);
		}
		.track-disabled { opacity: 0.5; }
		.track-disabled:not(.on) { background-color: var(--color-background-gray); }

		.thumb {
			display: flex;
			align-items: center;
			justify-content: center;
			border-radius: 50%;
			background-color: var(--color-background-surface);
			transition-property: transform, width, height;
			transition-duration: var(--duration-fast);
			transition-timing-function: var(--ease-standard);
			transform: translateX(calc(50cqb - 50%));
		}
		.thumb.on { transform: translateX(calc(100cqi - 50cqb - 50%)); }
		:global([dir='rtl']) .thumb { transform: translateX(calc(-1 * (50cqb - 50%))); }
		:global([dir='rtl']) .thumb.on { transform: translateX(calc(-1 * (100cqi - 50cqb - 50%))); }
		.thumb[data-size='sm'] { width: var(--_switch-thumb-width, 14px); height: var(--_switch-thumb-height, 14px); }
		.thumb[data-size='sm'].on { width: var(--_switch-thumb-width, 16px); height: var(--_switch-thumb-height, 16px); }
		.thumb[data-size='md'] { width: var(--_switch-thumb-width, 16px); height: var(--_switch-thumb-height, 16px); }
		.thumb[data-size='md'].on { width: var(--_switch-thumb-width, 20px); height: var(--_switch-thumb-height, 20px); }
		@media (prefers-reduced-motion: reduce) {
			.track, .thumb { transition-duration: 0s; }
		}
		@media (forced-colors: active) {
			.track { border: 1px solid CanvasText; background-color: Canvas; }
			.track.on { background-color: Highlight; }
			.track-disabled { border-color: GrayText; }
			.thumb { background-color: CanvasText; }
			.thumb.on { background-color: HighlightText; }
		}

		.label-wrapper { display: flex; flex-direction: column; justify-content: center; }
		.label-wrapper[data-size='sm'] { min-height: 20px; }
		.label-wrapper[data-size='md'] { min-height: 24px; }
	}
</style>
