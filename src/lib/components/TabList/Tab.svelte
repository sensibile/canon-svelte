<!--
  Port of Astryx `Tab` (packages/core/src/TabList/Tab.tsx), MIT, Meta Platforms, Inc.
  A button, or a link when `href` is set in a navigation TabList. Selected state comes from the TabList value.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon, { type IconComponent } from '../Icon/Icon.svelte';
	import type { IconName } from '../Icon/defaultIcons.js';
	import { getTabListContext } from './context.js';

	interface Props {
		value: string;
		label: string;
		/** Icon-only tab; the label becomes the accessible name. */
		isLabelHidden?: boolean;
		href?: string;
		/** id of the panel this tab controls (role="tablist" only). */
		panelId?: string;
		icon?: IconName | IconComponent;
		selectedIcon?: IconName | IconComponent;
		endContent?: Snippet;
		isDisabled?: boolean;
		onclick?: (e: MouseEvent) => void;
		class?: string;
	}

	let {
		value,
		label,
		isLabelHidden = false,
		href,
		panelId,
		icon,
		selectedIcon,
		endContent,
		isDisabled = false,
		onclick,
		class: className
	}: Props = $props();

	const ctx = getTabListContext();
	const isSelected = $derived(ctx.value === value);
	const isTabRole = $derived(ctx.pattern === 'tabs');
	const isLink = $derived(href != null && !isTabRole);
	const displayIcon = $derived(isSelected && selectedIcon ? selectedIcon : icon);
	const iconPx = $derived({ sm: 14, md: 16, lg: 18 }[ctx.size]);

	function handleClick(e: MouseEvent) {
		if (isDisabled) {
			e.preventDefault();
			return;
		}
		onclick?.(e);
		if (!e.defaultPrevented) ctx.select(value);
	}

	const shared = $derived({
		class: ['astryx-tab', 'tab', className],
		'data-tab-value': value,
		'data-size': ctx.size,
		'data-layout': ctx.layout,
		'data-selected': isSelected ? 'selected' : undefined,
		'aria-label': isLabelHidden ? label : undefined,
		'aria-disabled': isDisabled || undefined,
		role: isTabRole ? 'tab' : undefined,
		'aria-selected': isTabRole ? isSelected : undefined,
		'aria-controls': isTabRole ? panelId : undefined,
		'aria-current': !isTabRole && isSelected ? ('true' as const) : undefined,
		tabindex: isSelected ? 0 : -1,
		onclick: handleClick
	});
</script>

{#snippet body()}
	<span class="hover-bg" aria-hidden="true"></span>
	{#if displayIcon}
		<span class="icon" style="width: {iconPx}px; height: {iconPx}px"><Icon icon={displayIcon} size="sm" /></span>
	{/if}
	{#if !isLabelHidden && label !== ''}
		<span class="label-container">
			<span class="label-text">{label}</span>
			<span class="label-sizer" aria-hidden="true">{label}</span>
		</span>
	{/if}
	{#if endContent}<span class="end">{@render endContent()}</span>{/if}
	<span class="astryx-tab-indicator indicator" data-selected={isSelected ? 'selected' : undefined}></span>
{/snippet}

{#if isLink}
	<a {...shared} href={isDisabled ? undefined : href}>{@render body()}</a>
{:else}
	<button type="button" {...shared}>{@render body()}</button>
{/if}

<style>
	@layer astryx-base {
		.tab {
			position: relative;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			gap: var(--spacing-1);
			padding-inline: var(--spacing-3);
			background-color: transparent;
			border: 0 none;
			border-radius: var(--radius-element);
			font-family: inherit;
			font-size: var(--text-label-size);
			line-height: var(--text-label-leading);
			font-weight: var(--font-weight-normal);
			color: var(--color-text-secondary);
			cursor: pointer;
			text-decoration: none;
			white-space: nowrap;
			flex-shrink: 0;
			outline: 0 none;
			transition: color var(--duration-fast) var(--ease-standard);
		}
		.tab:focus-visible {
			outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color);
			outline-offset: var(--focus-outline-offset);
		}
		.tab[data-size='sm'] { min-height: var(--size-element-sm); }
		.tab[data-size='md'] { min-height: var(--size-element-md); }
		.tab[data-size='lg'] { min-height: var(--size-element-lg); }
		.tab[data-layout='fill'] { flex: 1; }
		.tab[data-selected] { color: var(--color-text-primary); font-weight: var(--font-weight-semibold); }
		.tab[aria-disabled='true'] { cursor: default; opacity: 0.5; }

		.hover-bg {
			position: absolute;
			inset: 0;
			border-radius: var(--radius-element);
			pointer-events: none;
			transition: background-color var(--duration-fast) var(--ease-standard);
		}
		@media (hover: hover) {
			.tab:not([aria-disabled='true']):hover .hover-bg { background-color: var(--color-overlay-hover); }
		}
		.tab:not([aria-disabled='true']):active .hover-bg { background-color: var(--color-overlay-pressed); }
		@media (pointer: coarse) {
			.tab:active .hover-bg { background-color: transparent; }
		}

		.indicator {
			position: absolute;
			bottom: var(--_tab-indicator-bottom, -1px);
			inset-inline: var(--spacing-3);
			height: 2px;
			border-radius: var(--radius-full);
			pointer-events: none;
			background-color: transparent;
			opacity: 0;
			transition-property: opacity, background-color;
			transition-duration: var(--duration-fast);
			transition-timing-function: var(--ease-standard);
		}
		.indicator[data-selected] { background-color: var(--color-accent); opacity: 1; }
		.icon { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
		.label-container { display: inline-grid; text-align: center; }
		.label-text,
		.label-sizer { grid-area: 1 / 1; align-self: center; }
		/* Reserves the bold width so selecting a tab doesn't shift its neighbours. */
		.label-sizer { visibility: hidden; pointer-events: none; font-weight: var(--font-weight-semibold); }
		.end { display: inline-flex; align-items: center; flex-shrink: 0; }
	}
</style>
