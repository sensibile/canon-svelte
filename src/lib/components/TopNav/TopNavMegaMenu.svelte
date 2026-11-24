<!--
  Port of Astryx `TopNavMegaMenu` (packages/core/src/TopNav/TopNavMegaMenu.tsx), MIT, Meta Platforms, Inc.
  A TopNav button that opens a wide panel below the whole TopNav, on hover after `delay` or on
  click: a two-column grid of `items` (TopNavMegaMenuItem) and an optional `featured` column
  (e.g. TopNavMegaMenuFeaturedCard). The panel aligns with the TopNav region the button is in.
  Escape closes it and returns focus to the button.
  Port change: `items` and `featured` are snippets. A press elsewhere in the TopNav closes the
  panel (Astryx treats the whole bar as the trigger).
  Not yet ported: the AppShell drawer layout, safe-triangle hover.
-->
<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import Icon from '../Icon/Icon.svelte';
	import Grid from '../Grid/Grid.svelte';
	import NavFlyout from '../NavMenu/NavFlyout.svelte';
	import { createMenuHover } from '../../internal/menuHover.svelte.js';
	import { getTopNavSlot, setTopNavMegaMenuClose } from './context.js';

	interface Props {
		label: string;
		items?: Snippet;
		featured?: Snippet;
		/** ms before a hover opens the panel. */
		delay?: number;
		/** ms before the panel closes after the pointer leaves. */
		hideDelay?: number;
		onOpenChange?: (isOpen: boolean) => void;
		class?: string;
		style?: string;
		'data-testid'?: string;
	}

	let {
		label,
		items,
		featured,
		delay = 150,
		hideDelay = 250,
		onOpenChange,
		class: className,
		style,
		'data-testid': testId
	}: Props = $props();

	const uid = $props.id();
	const panelId = `${uid}-panel`;
	const slot = getTopNavSlot();
	const hover = createMenuHover({
		isEnabled: () => true,
		showDelay: untrack(() => delay),
		hideDelay: untrack(() => hideDelay)
	});
	setTopNavMegaMenuClose(() => hover.hide());
	$effect(() => () => hover.destroy());

	let trigger: HTMLButtonElement | undefined = $state();
	const nav = $derived(trigger?.closest('nav') ?? trigger);

	let wasOpen = false;
	$effect(() => {
		const open = hover.isOpen;
		if (open === wasOpen) return;
		wasOpen = open;
		untrack(() => onOpenChange?.(open));
	});
</script>

<button
	bind:this={trigger}
	type="button"
	class={['astryx-top-nav-mega-menu', 'trigger', className]}
	data-open={hover.isOpen || undefined}
	data-testid={testId}
	{style}
	aria-haspopup="true"
	aria-expanded={hover.isOpen}
	aria-controls={hover.isOpen ? panelId : undefined}
	onpointerenter={hover.onTriggerEnter}
	onpointerleave={hover.onTriggerLeave}
	onclick={hover.onTriggerClick}
>
	{label}
	<span class="chevron" class:open={hover.isOpen}><Icon icon="chevronDown" size="sm" color="inherit" /></span>
</button>

<NavFlyout
	open={hover.isOpen}
	anchor={nav}
	{trigger}
	focusReturn={trigger}
	onClose={() => hover.hide()}
	placement="below"
	alignment={slot}
	offset={0}
	hasSurface={false}
	autoFocus={hover.openedByClick ? 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])' : null}
	class="astryx-top-nav-mega-menu-layer"
	onpointerenter={hover.onContentEnter}
	onpointerleave={hover.onContentLeave}
>
	<div id={panelId} role="group" aria-label={label} class="panel">
		<div class="panel-content">
			{#if items}
				<div class="menu-wrapper"><Grid columns={2} gap={2}>{@render items()}</Grid></div>
			{/if}
			{#if featured}
				<div class="featured">{@render featured()}</div>
			{/if}
		</div>
	</div>
</NavFlyout>

<style>
	@layer astryx-base {
		.trigger {
			display: inline-flex;
			align-items: center;
			gap: var(--spacing-2);
			padding-block: var(--spacing-1-5);
			padding-inline: var(--spacing-3);
			border-radius: var(--radius-element);
			font-family: inherit;
			font-size: var(--text-label-size);
			line-height: var(--text-label-leading);
			font-weight: var(--font-weight-medium);
			color: var(--color-text-secondary);
			text-decoration: none;
			cursor: pointer;
			transition: background-color var(--duration-fast) var(--ease-standard), color var(--duration-fast) var(--ease-standard);
			background-color: transparent;
			border: 0 none;
			outline: 0 none;
		}
		@media (hover: hover) {
			.trigger:hover { background-color: var(--color-overlay-hover); }
		}
		.trigger:focus-visible {
			outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color);
			outline-offset: var(--focus-outline-offset);
		}
		.trigger[data-open] { color: var(--color-text-primary); background-color: var(--color-overlay-hover); }
		.chevron {
			display: inline-flex;
			align-items: center;
			width: 1em;
			height: 1em;
			transition: transform var(--duration-fast) var(--ease-standard);
		}
		.chevron.open { transform: rotate(180deg); }
		:global(.astryx-layer.astryx-top-nav-mega-menu-layer) {
			display: flex;
			flex-direction: column;
			max-height: calc(100vh - 16px);
		}
		.panel {
			background-color: var(--color-background-popover);
			border-top: var(--border-width) solid var(--color-border);
			border-radius: var(--radius-container);
			box-shadow: var(--shadow-low);
			overflow: hidden;
			display: flex;
			flex-direction: column;
			min-height: 0;
		}
		.panel-content {
			display: flex;
			flex-wrap: wrap;
			gap: var(--spacing-6);
			padding: var(--spacing-3);
			max-width: min(960px, calc(100dvw - var(--spacing-4)));
			box-sizing: border-box;
			overflow-y: auto;
			overscroll-behavior: contain;
		}
		.menu-wrapper { flex: 2 1 300px; min-width: 0; }
		.featured {
			flex: 1 1 200px;
			border-radius: var(--radius-container);
			background-color: var(--color-background-muted);
			overflow: hidden;
			display: flex;
			flex-direction: column;
		}
	}
</style>
