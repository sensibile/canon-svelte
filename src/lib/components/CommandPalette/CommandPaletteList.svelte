<!--
  Port of Astryx `CommandPaletteList` (packages/core/src/CommandPalette/CommandPaletteList.tsx), MIT,
  Meta Platforms, Inc. The scrolling listbox of a CommandPalette (a plain container while empty).
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { getCommandPaletteContext } from './context.js';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		/** Defaults to "Commands". */
		label?: string;
		children: Snippet;
	}
	let { label = 'Commands', class: className, children, ...rest }: Props = $props();
	const ctx = getCommandPaletteContext();
	const hasListbox = $derived(ctx ? ctx.selectableItems.length > 0 : true);
</script>

<div
	{...rest}
	id={ctx?.listId ?? rest.id}
	role={hasListbox ? 'listbox' : undefined}
	aria-label={hasListbox ? label : undefined}
	class={['astryx-command-palette-list', 'list', className]}
>
	{@render children()}
</div>

<style>
	@layer astryx-base {
		.list {
			overflow-y: auto;
			max-height: 100%;
			padding: var(--spacing-1);
			flex: 1;
			display: flex;
			flex-direction: column;
			gap: var(--spacing-0-5);
		}
	}
</style>
