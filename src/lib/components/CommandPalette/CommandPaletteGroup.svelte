<!--
  Port of Astryx `CommandPaletteGroup` (packages/core/src/CommandPalette/CommandPaletteGroup.tsx), MIT,
  Meta Platforms, Inc. A labelled group of items under a visible heading.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		heading: string;
		children: Snippet;
	}
	let { heading, class: className, children, ...rest }: Props = $props();
</script>

<div role="group" aria-label={heading} {...rest} class={['astryx-command-palette-group', 'group', className]}>
	<div aria-hidden="true" class="astryx-command-palette-group-heading heading">{heading}</div>
	{@render children()}
</div>

<style>
	@layer astryx-base {
		.group {
			display: flex;
			flex-direction: column;
			gap: var(--spacing-0-5);
			padding-block: var(--spacing-1);
		}
		.heading {
			padding-inline: var(--spacing-3);
			padding-block: var(--spacing-1);
			font-family: var(--font-family-body);
			font-size: var(--text-supporting-size);
			line-height: var(--text-supporting-leading);
			color: var(--color-text-secondary);
			user-select: none;
		}
	}
</style>
