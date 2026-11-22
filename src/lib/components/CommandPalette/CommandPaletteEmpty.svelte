<!--
  Port of Astryx `CommandPaletteEmpty` (packages/core/src/CommandPalette/CommandPaletteEmpty.tsx), MIT,
  Meta Platforms, Inc. The message shown in place of results.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		/** The rendered element, so the palette can announce its text. */
		element?: HTMLDivElement;
		children: Snippet;
	}
	let { element = $bindable(), class: className, children, ...rest }: Props = $props();
</script>

<div bind:this={element} {...rest} class={['astryx-command-palette-empty', 'empty', className]}>
	{@render children()}
</div>

<style>
	@layer astryx-base {
		.empty {
			display: flex;
			align-items: center;
			justify-content: center;
			padding-block: var(--spacing-8);
			padding-inline: var(--spacing-4);
			font-family: var(--font-family-body);
			font-size: var(--text-supporting-size);
			line-height: var(--text-supporting-leading);
			color: var(--color-text-secondary);
			text-align: center;
			overflow-wrap: anywhere;
			--_astryx-text-overflow-wrap: anywhere;
		}
	}
</style>
