<!--
  Internal: one option row of a Selector or MultiSelector listbox. Port of `SelectorOptionRow` and
  `SelectorOption` in Astryx (packages/core/src/Selector), MIT, Meta Platforms, Inc.
  `mark` picks the selection indicator: a check mark (Selector) or a checkbox (MultiSelector).
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from '../Icon/Icon.svelte';
	import CheckboxIndicator from '../Indicator/CheckboxIndicator.svelte';
	import type { IndicatorPosition, SelectorOptionData } from './options.js';

	interface Props {
		item: SelectorOptionData;
		id: string;
		isHighlighted: boolean;
		isKeyboardHighlighted: boolean;
		isSelected: boolean;
		size: 'sm' | 'md' | 'lg';
		indicatorPosition: IndicatorPosition;
		mark?: 'check' | 'checkbox' | 'none';
		/** Overrides the checkbox state, for a partially selected "Select all" row. */
		markState?: 'checked' | 'unchecked' | 'indeterminate';
		ariaLabel?: string;
		renderOption?: Snippet<[SelectorOptionData]>;
		onselect: () => void;
		onhover: () => void;
	}

	let {
		item,
		id,
		isHighlighted,
		isKeyboardHighlighted,
		isSelected,
		size,
		indicatorPosition,
		mark = 'check',
		markState,
		ariaLabel,
		renderOption,
		onselect,
		onhover
	}: Props = $props();
</script>

{#snippet markColumn()}
	{#if mark !== 'none'}
	<span class="mark">
		{#if mark === 'checkbox'}
			<CheckboxIndicator state={markState ?? (isSelected ? 'checked' : 'unchecked')} size="sm" isDisabled={item.disabled ?? false} />
		{:else}
			<span class="astryx-check-indicator check" class:checked={isSelected} aria-hidden="true">
				<Icon icon="check" size="sm" />
			</span>
		{/if}
	</span>
	{/if}
{/snippet}

<!-- Keyboard interaction lives on the combobox; rows are reached with aria-activedescendant. -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_interactive_supports_focus -->
<div
	{id}
	role="option"
	aria-selected={isSelected}
	aria-label={ariaLabel}
	aria-disabled={item.disabled ? 'true' : undefined}
	class={['astryx-selector-option-row', 'row', mark === 'checkbox' && 'astryx-indicator-scope']}
	class:highlighted={isHighlighted}
	class:keyboard={isKeyboardHighlighted}
	class:selected={isSelected && mark === 'check'}
	class:disabled={item.disabled}
	data-size={size}
	data-highlighted={isHighlighted ? 'highlighted' : undefined}
	data-selected={isSelected ? 'selected' : undefined}
	data-disabled={item.disabled ? 'disabled' : undefined}
	onclick={onselect}
	onmousemove={onhover}
>
	{#if indicatorPosition === 'start'}{@render markColumn()}{/if}
	<span class="content">
		{#if renderOption}
			{@render renderOption(item)}
		{:else}
			{#if item.icon}<Icon icon={item.icon} size="sm" color="secondary" />{/if}
			<span class="astryx-selector-option text">
				<span class="label">{item.label ?? item.value}</span>
				{#if item.description}<span class="description">{item.description}</span>{/if}
			</span>
		{/if}
	</span>
	{#if indicatorPosition !== 'start'}{@render markColumn()}{/if}
</div>

<style>
	@layer astryx-base {
		.row {
			box-sizing: border-box;
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: var(--spacing-2);
			width: 100%;
			padding: var(--spacing-2);
			border-radius: var(--radius-element);
			font-family: var(--font-family-body);
			font-size: var(--text-label-size);
			line-height: var(--text-label-leading);
			color: var(--color-text-primary);
			background-color: transparent;
			cursor: pointer;
			text-align: start;
			outline-style: none;
			user-select: none;
		}
		.row[data-size='sm'] { padding-block: var(--spacing-1); padding-inline: var(--spacing-2); }
		.row[data-size='md'] { padding-block: var(--spacing-1-5); }
		.highlighted { background-color: var(--color-overlay-hover); }
		.keyboard {
			outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color);
			outline-offset: calc(-1 * var(--focus-outline-width));
		}
		.selected { font-weight: var(--font-weight-medium); }
		.disabled { opacity: 0.5; cursor: default; }
		.content {
			display: flex;
			align-items: center;
			gap: var(--spacing-2);
			flex: 1;
			min-width: 0;
		}
		.text { display: flex; flex-direction: column; min-width: 0; }
		.label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
		.description {
			font-size: var(--text-supporting-size);
			line-height: var(--text-supporting-leading);
			color: var(--color-text-secondary);
			font-weight: var(--font-weight-normal);
		}
		.mark {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			flex-shrink: 0;
			min-width: 1rem;
		}
		.check { display: inline-flex; color: var(--color-icon-primary); visibility: hidden; }
		.check.checked { visibility: visible; }
	}
</style>
