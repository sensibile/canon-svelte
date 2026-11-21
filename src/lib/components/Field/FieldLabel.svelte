<!-- Port of Astryx `FieldLabel` (packages/core/src/Field/FieldLabel.tsx), MIT, Meta Platforms, Inc. -->
<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import Icon, { type IconComponent } from '../Icon/Icon.svelte';
	import type { IconName } from '../Icon/defaultIcons.js';
	import InfoTip from '../InfoTip/InfoTip.svelte';

	interface Props extends HTMLAttributes<HTMLElement> {
		label: string;
		inputID: string;
		labelID?: string;
		isGroupLabel?: boolean;
		isLabelHidden?: boolean;
		isDisabled?: boolean;
		isOptional?: boolean;
		isRequired?: boolean;
		labelIcon?: IconName | IconComponent;
		/** Help text shown in an InfoTip next to the label. */
		labelTooltip?: string;
		description?: string;
		descriptionID?: string;
	}

	let {
		label,
		inputID,
		labelID,
		isGroupLabel = false,
		isLabelHidden = false,
		isDisabled = false,
		isOptional = false,
		isRequired = false,
		labelIcon,
		labelTooltip,
		description,
		descriptionID,
		class: className,
		...rest
	}: Props = $props();

	const statusText = $derived(isOptional ? 'Optional' : isRequired ? 'Required' : null);

	// Clicking the description acts like clicking the label: toggles a checkbox/switch, focuses a text input.
	function forwardClick() {
		if (isGroupLabel || isDisabled) return;
		const el = document.getElementById(inputID);
		if (el instanceof HTMLInputElement && (el.type === 'checkbox' || el.type === 'radio')) el.click();
		else el?.focus();
	}
</script>

{#snippet labelEl()}
	<svelte:element
		this={isGroupLabel ? 'span' : 'label'}
		{...rest}
		id={labelID}
		for={isGroupLabel ? undefined : inputID}
		class={['astryx-field-label', 'label', className]}
		class:group={isGroupLabel}
		class:label-disabled={isDisabled}
		class:sr-only={isLabelHidden}
	>
		{#if labelIcon}<Icon icon={labelIcon} size="sm" color="inherit" />{/if}
		{label}
		{#if statusText}
			<span class="optionality"><span aria-hidden="true"> ∙ </span>{statusText}</span>
		{/if}
	</svelte:element>
{/snippet}

{#snippet labelWithHelp()}
	{#if labelTooltip}
		<span class="label-row" class:hidden-row={isLabelHidden}>
			{@render labelEl()}
			<InfoTip content={labelTooltip} label={`About ${label}`} class={isLabelHidden ? 'info-tip-hidden' : undefined} />
		</span>
	{:else}
		{@render labelEl()}
	{/if}
{/snippet}

{#if description}
	<div class="label-group" class:hidden-group={isLabelHidden}>
		{@render labelWithHelp()}
		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
		<span
			id={descriptionID}
			class="description"
			class:clickable={!isGroupLabel && !isDisabled}
			class:sr-only={isLabelHidden}
			onclick={forwardClick}>{description}</span
		>
	</div>
{:else}
	{@render labelWithHelp()}
{/if}

<style>
	@layer astryx-base {
		.label-group { display: flex; flex-direction: column; }
		.label-row { display: inline-flex; align-items: center; vertical-align: top; gap: var(--spacing-1); }
		.hidden-row { display: contents; }
		/* A hidden label's info button takes no space until it has keyboard focus. */
		.label-row :global(.info-tip-hidden:not(:focus-visible)) {
			position: absolute;
			clip: rect(0, 0, 0, 0);
			overflow: hidden;
			white-space: nowrap;
		}
		.label-row :global(.info-tip-hidden) { align-self: flex-start; }
		.hidden-group { display: contents; }
		.label {
			display: flex;
			align-items: center;
			gap: var(--spacing-1);
			font-family: var(--font-family-body);
			font-size: var(--text-label-size);
			line-height: var(--text-label-leading);
			font-weight: var(--font-weight-semibold);
			color: var(--color-text-primary);
			cursor: pointer;
		}
		.group { cursor: default; }
		.label-disabled { color: var(--color-text-disabled); cursor: default; }
		.optionality {
			font-weight: var(--font-weight-normal);
			font-size: var(--text-supporting-size);
			line-height: var(--text-supporting-leading);
			color: var(--color-text-secondary);
		}
		.description {
			font-family: var(--font-family-body);
			font-size: var(--text-supporting-size);
			line-height: var(--text-supporting-leading);
			font-weight: var(--font-weight-normal);
			color: var(--color-text-secondary);
		}
		.clickable { cursor: pointer; }
		.sr-only {
			border-style: none;
			clip: rect(0, 0, 0, 0);
			height: 1px;
			inset-inline-start: 0;
			margin: -1px;
			overflow: hidden;
			padding: 0;
			pointer-events: none;
			position: absolute;
			top: 0;
			user-select: none;
			white-space: nowrap;
			width: 1px;
		}
	}
</style>
