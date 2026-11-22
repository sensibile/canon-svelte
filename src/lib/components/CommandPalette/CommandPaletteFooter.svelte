<!--
  Port of Astryx `CommandPaletteFooter` (packages/core/src/CommandPalette/CommandPaletteFooter.tsx), MIT,
  Meta Platforms, Inc. The palette's footer; by default, keyboard hints for navigate, select and close.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import Kbd from '../Kbd/Kbd.svelte';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		children?: Snippet;
	}
	let { class: className, children, ...rest }: Props = $props();
</script>

<div {...rest} class={['astryx-command-palette-footer', 'footer', className]}>
	{#if children}
		{@render children()}
	{:else}
		<span class="hint"><Kbd keys="up" /><Kbd keys="down" />Navigate</span>
		<span class="hint"><Kbd keys="enter" />Select</span>
		<span class="hint"><Kbd keys="escape" />Close</span>
	{/if}
</div>

<style>
	@layer astryx-base {
		.footer {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: var(--spacing-4);
			padding-inline: var(--spacing-4);
			padding-block: var(--spacing-2);
			flex-shrink: 0;
			font-family: var(--font-family-body);
			font-size: var(--text-supporting-size);
			line-height: var(--text-supporting-leading);
			color: var(--color-text-secondary);
		}
		.hint { display: flex; align-items: center; gap: var(--spacing-1); }
	}
</style>
