<!--
  Port of Astryx `Field` + `FieldLabel` (packages/core/src/Field), MIT, Meta Platforms, Inc.
  Wraps a control with its label, description and status message.
  Not yet ported: FormLayout's horizontal-labels mode.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import type { IconComponent } from '../Icon/Icon.svelte';
	import FieldLabel from './FieldLabel.svelte';
	import type { IconName } from '../Icon/defaultIcons.js';
	import FieldStatus from './FieldStatus.svelte';
	import type { FieldStatusInput, FieldStatusPlacement } from './types.js';
	import { cssSize, type SizeValue } from '../../types.js';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		label: string;
		isLabelHidden?: boolean;
		description?: string;
		/** id of the control the label points at. */
		inputID: string;
		labelID?: string;
		/** Render the label as a <span> (for groups of controls, e.g. radio lists). */
		isGroupLabel?: boolean;
		descriptionID?: string;
		isOptional?: boolean;
		isRequired?: boolean;
		isDisabled?: boolean;
		labelIcon?: IconName | IconComponent;
		/** Help text shown in an InfoTip next to the label. */
		labelTooltip?: string;
		status?: FieldStatusInput;
		statusVariant?: FieldStatusPlacement;
		width?: SizeValue;
		children: Snippet;
	}

	let {
		label,
		isLabelHidden = false,
		description,
		inputID,
		labelID,
		isGroupLabel = false,
		descriptionID,
		isOptional = false,
		isRequired = false,
		isDisabled = false,
		labelIcon,
		labelTooltip,
		status,
		statusVariant = 'attached',
		width,
		class: className,
		style,
		children,
		...rest
	}: Props = $props();

	const resolvedDescriptionID = $derived(descriptionID ?? (description ? `${inputID}-desc` : undefined));
	const resolvedMessageID = $derived(status?.messageID ?? (status?.message ? `${inputID}-status` : undefined));
</script>



{#snippet statusEl()}
	{#if status?.message}
		<FieldStatus type={status.type} message={status.message} id={resolvedMessageID} variant={statusVariant} />
	{/if}
{/snippet}

<div
	{...rest}
	class={['astryx-field', 'field', className]}
	class:gap={!isLabelHidden}
	style={[width != null && `width: ${cssSize(width)}`, style].filter(Boolean).join('; ') || undefined}
>
	<FieldLabel
		{label}
		{inputID}
		{labelID}
		{isGroupLabel}
		{isLabelHidden}
		{isDisabled}
		{isOptional}
		{isRequired}
		{labelIcon}
		{labelTooltip}
		{description}
		descriptionID={resolvedDescriptionID}
	/>
	{#if statusVariant === 'attached'}
		<div class="input-status" data-field-status-wrapper>
			{@render children()}
			{@render statusEl()}
		</div>
	{:else}
		{@render children()}
		{@render statusEl()}
	{/if}
</div>

<style>
	@layer astryx-base {
		.field { display: flex; flex-direction: column; isolation: isolate; min-width: 0; }
		.gap { gap: var(--spacing-1); }
		.input-status {
			display: flex;
			flex-direction: column;
			isolation: isolate;
			--_field-status-overlap: calc(var(--size-element-md) / 2);
		}
		.input-status:has(> :global([data-size='sm']), > :global(.tooltip-trigger > [data-size='sm'])) { --_field-status-overlap: calc(var(--size-element-sm) / 2); }
		.input-status:has(> :global([data-size='lg']), > :global(.tooltip-trigger > [data-size='lg'])) { --_field-status-overlap: calc(var(--size-element-lg) / 2); }

	}
</style>
