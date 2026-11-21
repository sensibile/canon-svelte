<!--
  Port of Astryx `Blockquote` (packages/core/src/Blockquote/Blockquote.tsx), MIT, Meta Platforms, Inc.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLBlockquoteAttributes } from 'svelte/elements';

	interface Props extends Omit<HTMLBlockquoteAttributes, 'cite'> {
		children: Snippet;
		/** Attribution shown under the quote. */
		cite?: string | Snippet;
	}

	let { children, cite, class: className, ...rest }: Props = $props();
</script>

<blockquote {...rest} class={['astryx-blockquote', 'blockquote', className]}>
	{@render children()}
	{#if cite != null && cite !== ''}
		<cite>{#if typeof cite === 'function'}{@render cite()}{:else}{cite}{/if}</cite>
	{/if}
</blockquote>

<style>
	@layer astryx-base {
		.blockquote {
			border-inline-start: var(--spacing-0-5) solid var(--color-border-emphasized);
			padding-inline-start: var(--spacing-4);
			color: var(--color-text-secondary);
			overflow-wrap: break-word;
			margin: 0;
		}
		cite {
			display: block;
			margin-block-start: var(--spacing-2);
			font-size: var(--text-supporting-size);
			line-height: var(--text-supporting-leading);
			font-style: normal;
		}
	}
</style>
