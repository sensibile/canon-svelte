<!--
  Port of Astryx `TypeaheadItem` (packages/core/src/Typeahead/TypeaheadItem.tsx), MIT, Meta Platforms, Inc.
  The default row content for a Typeahead or Tokenizer result, for use in `renderItem`.
-->
<script lang="ts" generics="T extends SearchableItem">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import type { SearchableItem } from './types.js';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		item: T;
		icon?: Snippet;
		description?: string;
		isDisabled?: boolean;
	}

	let { item, icon, description, isDisabled = false, class: className, ...rest }: Props = $props();
</script>

<div {...rest} class={['astryx-typeahead-item', 'item', className]} class:disabled={isDisabled}>
	{@render icon?.()}
	<div class="content">
		<span class="label">{item.label}</span>
		{#if description}<span class="description">{description}</span>{/if}
	</div>
</div>

<style>
	@layer astryx-base {
		.item { display: flex; align-items: center; gap: var(--spacing-2); min-height: 0; min-width: 0; }
		.content { display: flex; flex-direction: column; flex: 1; min-width: 0; }
		.label,
		.description { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
		.label {
			font-size: var(--text-label-size);
			line-height: var(--text-label-leading);
			font-weight: var(--font-weight-normal);
			color: var(--color-text-primary);
		}
		.description {
			font-size: var(--text-supporting-size);
			line-height: var(--text-supporting-leading);
			color: var(--color-text-secondary);
		}
		.disabled { opacity: 0.5; }
	}
</style>
