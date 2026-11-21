<!--
  Internal: the results listbox of Typeahead and Tokenizer. Port of the listbox in Astryx's
  BaseTypeahead (packages/core/src/Typeahead/BaseTypeahead.tsx), MIT, Meta Platforms, Inc.
-->
<script lang="ts" generics="T extends SearchableItem">
	import type { Snippet } from 'svelte';
	import Icon from '../Icon/Icon.svelte';
	import TypeaheadItem from './TypeaheadItem.svelte';
	import type { SearchableItem } from './types.js';

	interface Props {
		id: string;
		itemId: (index: number) => string;
		results: T[];
		highlightedIndex: number;
		isKeyboardHighlight: boolean;
		isSelected: (item: T) => boolean;
		/** Show the empty state (a search answered with nothing). */
		isEmpty: boolean;
		emptySearchText: string;
		size: 'sm' | 'md' | 'lg';
		renderItem?: Snippet<[T]>;
		onselect: (item: T) => void;
		onhover: (index: number) => void;
	}

	let {
		id,
		itemId,
		results,
		highlightedIndex,
		isKeyboardHighlight,
		isSelected,
		isEmpty,
		emptySearchText,
		size,
		renderItem,
		onselect,
		onhover
	}: Props = $props();
</script>

<!-- Pressing a row must not move focus out of the input. -->
<div
	{id}
	role="listbox"
	aria-label="Search results"
	tabindex="-1"
	class="astryx-typeahead-dropdown listbox"
	onmousedown={(e) => e.preventDefault()}
>
	{#if isEmpty}
		<div role="option" aria-selected="false" aria-disabled="true" class="astryx-typeahead-empty-state empty">{emptySearchText}</div>
	{:else}
		{#each results as item, index (item.id)}
			{@const selected = isSelected(item)}
			<!-- Keyboard interaction lives on the input; rows are reached with aria-activedescendant. -->
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<div
				id={itemId(index)}
				role="option"
				aria-selected={selected}
				tabindex="-1"
				class="astryx-typeahead-option row"
				class:highlighted={index === highlightedIndex}
				class:keyboard={index === highlightedIndex && isKeyboardHighlight}
				class:selected
				data-size={size}
				data-highlighted={index === highlightedIndex ? 'highlighted' : undefined}
				onclick={() => onselect(item)}
				onmousemove={() => index !== highlightedIndex && onhover(index)}
			>
				<span class="content">
					{#if renderItem}{@render renderItem(item)}{:else}<TypeaheadItem {item} />{/if}
				</span>
				{#if selected}<Icon icon="check" size="sm" color="primary" />{/if}
			</div>
		{/each}
	{/if}
</div>

<style>
	@layer astryx-base {
		.listbox {
			box-sizing: border-box;
			display: flex;
			flex-direction: column;
			max-height: min(300px, calc(100vh - 16px));
			overflow-y: auto;
			overscroll-behavior: contain;
			padding: var(--spacing-1);
			outline: none;
		}
		.row {
			box-sizing: border-box;
			display: flex;
			align-items: center;
			gap: var(--spacing-2);
			width: 100%;
			padding: var(--spacing-2);
			border-radius: var(--radius-element);
			font-family: var(--font-family-body);
			font-size: var(--text-label-size);
			line-height: var(--text-label-leading);
			color: var(--color-text-primary);
			cursor: pointer;
			outline: none;
			user-select: none;
		}
		.row[data-size='sm'] { padding-block: var(--spacing-1); }
		.row[data-size='md'] { padding-block: var(--spacing-1-5); }
		.highlighted { background-color: var(--color-overlay-hover); }
		.keyboard {
			outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color);
			outline-offset: calc(-1 * var(--focus-outline-width));
		}
		.selected { font-weight: var(--font-weight-medium); }
		.content { flex: 1; min-width: 0; }
		.empty {
			padding: var(--spacing-3);
			text-align: center;
			color: var(--color-text-secondary);
			font-family: var(--font-family-body);
			font-size: var(--text-label-size);
			line-height: var(--text-label-leading);
		}
	}
</style>
