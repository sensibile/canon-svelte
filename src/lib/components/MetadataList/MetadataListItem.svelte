<!--
  Port of Astryx `MetadataListItem` (packages/core/src/MetadataList/MetadataListItem.tsx), MIT, Meta Platforms, Inc.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { getMetadataListContext } from './context.js';

	interface Props extends HTMLAttributes<HTMLElement> {
		label: string;
		icon?: Snippet;
		children: Snippet;
	}

	let { label, icon, children, class: className, ...rest }: Props = $props();

	const ctx = getMetadataListContext();
	const isStacked = $derived(ctx?.labelPosition === 'top' || ctx?.orientation === 'horizontal');
</script>

{#snippet labelContent()}
	{#if icon}<span class="icon">{@render icon()}</span>{/if}
	{label}
{/snippet}

{#if isStacked}
	<div {...rest} class={['astryx-metadata-list-item', 'stacked', className]} data-metadata-item="">
		<dt class="label">{@render labelContent()}</dt>
		<dd class="value">{@render children()}</dd>
	</div>
{:else}
	<dt {...rest} class={['astryx-metadata-list-item', 'label', 'inline', className]} data-metadata-item="">
		{@render labelContent()}
	</dt>
	<dd class="value inline">{@render children()}</dd>
{/if}

<style>
	@layer astryx-base {
		.label {
			color: var(--color-text-secondary);
			font-size: var(--text-body-size);
			line-height: var(--text-body-leading);
			font-weight: var(--font-weight-medium);
			display: flex;
			align-items: center;
			gap: var(--spacing-2);
			margin: 0;
			padding: 0;
			word-break: break-word;
		}
		.value {
			color: var(--color-text-primary);
			font-size: var(--text-body-size);
			line-height: var(--text-body-leading);
			margin: 0;
			padding: 0;
			overflow-wrap: break-word;
		}
		.inline { min-height: 24px; }
		.stacked { display: flex; flex-direction: column; gap: var(--spacing-0-5); min-width: 0; }
		.icon { display: inline-flex; align-items: center; flex-shrink: 0; color: var(--color-text-secondary); }
		[hidden] { display: none; }
	}
</style>
