<!--
  Port of Astryx `CommandPaletteItem` (packages/core/src/CommandPalette/CommandPaletteItem.tsx), MIT,
  Meta Platforms, Inc. One option. Inside a CommandPalette it reads its highlight and selection from
  the palette, and a click selects it and closes the palette; outside one, pass the states yourself.
  Not yet ported: press feedback.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { getCommandPaletteContext } from './context.js';

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'onselect'> {
		value: string;
		onSelect?: (value: string) => void;
		isHighlighted?: boolean;
		isSelected?: boolean;
		isDisabled?: boolean;
		children: Snippet;
	}
	let {
		value,
		onSelect,
		isHighlighted: controlledHighlighted,
		isSelected: controlledSelected,
		isDisabled = false,
		id: idProp,
		onclick,
		class: className,
		children,
		...rest
	}: Props = $props();

	const ctx = getCommandPaletteContext();
	let item: HTMLDivElement | undefined = $state();
	const itemIndex = $derived(ctx ? ctx.selectableItems.findIndex((i) => i.value === value) : -1);
	const isHighlighted = $derived(controlledHighlighted ?? (ctx ? ctx.highlightedIndex === itemIndex && itemIndex >= 0 : false));
	const isSelected = $derived(controlledSelected ?? (ctx ? ctx.value === value : false));

	// Outside a palette, keep a highlighted item in view (the palette scrolls its own on keyboard moves).
	$effect(() => {
		if (!ctx && isHighlighted) item?.scrollIntoView?.({ block: 'nearest' });
	});

	function handleClick(e: MouseEvent & { currentTarget: EventTarget & HTMLDivElement }) {
		if (isDisabled) return;
		onclick?.(e);
		if (e.defaultPrevented) return;
		onSelect?.(value);
		if (ctx) {
			ctx.selectItem(value);
			ctx.onClose();
		}
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
	bind:this={item}
	{...rest}
	id={ctx && itemIndex >= 0 ? ctx.getItemId(itemIndex) : idProp}
	role="option"
	tabindex="-1"
	aria-selected={isSelected}
	aria-disabled={isDisabled || undefined}
	data-value={value}
	data-highlighted={isHighlighted || undefined}
	data-selected={isSelected || undefined}
	data-disabled={isDisabled || undefined}
	class={['astryx-command-palette-item', 'item', className]}
	onclick={handleClick}
>
	{@render children()}
</div>

<style>
	@layer astryx-base {
		.item {
			display: flex;
			align-items: center;
			gap: var(--spacing-2);
			width: 100%;
			box-sizing: border-box;
			padding-inline: var(--spacing-3);
			padding-block: var(--spacing-2);
			border-radius: var(--radius-inner);
			font-family: var(--font-family-body);
			font-size: var(--text-label-size);
			line-height: var(--text-label-leading);
			color: var(--color-text-primary);
			background-color: transparent;
			border: 0 none;
			cursor: pointer;
			text-align: start;
			outline: none;
			user-select: none;
		}
		.item[data-highlighted] { background-color: var(--color-overlay-hover); }
		.item[data-selected] { background-color: var(--color-accent-muted); }
		.item[data-disabled] { opacity: 0.5; cursor: default; }
	}
</style>
