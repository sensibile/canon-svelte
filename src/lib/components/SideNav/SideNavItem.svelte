<!--
  Port of Astryx `SideNavItem` (packages/core/src/SideNav/SideNavItem.tsx), MIT, Meta Platforms, Inc.
  A SideNav row: a link when `href` is set, otherwise a button. `isSelected` marks it
  aria-current="page". Nested SideNavItems go in `children` and expand and collapse below
  the row; when the row also navigates (`href`/`onclick`) a separate chevron button toggles them.
  In a collapsed SideNav only rows with an `icon` stay: leaves show a tooltip with the label,
  and rows with children open a flyout listing them on hover or click.
  Port change: `icon` / `selectedIcon` take a built-in icon name or an icon component;
  `endContent` and `actions` are snippets.
  Not yet ported: press feedback animation, LinkProvider (`as`), closing an AppShell mobile drawer.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon, { type IconComponent } from '../Icon/Icon.svelte';
	import Tooltip from '../Tooltip/Tooltip.svelte';
	import NavFlyout from '../NavMenu/NavFlyout.svelte';
	import type { IconName } from '../Icon/defaultIcons.js';
	import { createMenuHover } from '../../internal/menuHover.svelte.js';
	import {
		EXPANDED_COLLAPSE_STATE,
		getSideNavCollapse,
		getSideNavItemDepth,
		setSideNavCollapseContext,
		setSideNavItemDepth
	} from './context.js';
	import '../NavItem/navItem.css';

	type NavItemSize = 'sm' | 'md' | 'lg';

	interface Props {
		label: string;
		icon?: IconName | IconComponent;
		/** Shown instead of `icon` while selected. */
		selectedIcon?: IconName | IconComponent;
		isSelected?: boolean;
		isDisabled?: boolean;
		href?: string;
		target?: string;
		rel?: string;
		onclick?: (e: MouseEvent) => void;
		endContent?: Snippet;
		/** Controls at the end of the row, e.g. an IconButton. */
		actions?: Snippet;
		/** Nested SideNavItems. */
		children?: Snippet;
		collapsible?:
			| boolean
			| { defaultIsCollapsed?: boolean; isCollapsed?: boolean; onCollapsedChange?: (isCollapsed: boolean) => void };
		size?: NavItemSize;
		'aria-label'?: string;
		'aria-describedby'?: string;
		class?: string;
		style?: string;
		'data-testid'?: string;
	}

	let {
		label,
		icon,
		selectedIcon,
		isSelected = false,
		isDisabled = false,
		href,
		target,
		rel,
		onclick,
		endContent,
		actions,
		children,
		collapsible: itemCollapsible,
		size = 'md',
		'aria-label': ariaLabel,
		'aria-describedby': ariaDescribedby,
		class: className,
		style,
		'data-testid': testId
	}: Props = $props();

	const uid = $props.id();
	const nav = getSideNavCollapse();
	const isCollapsed = $derived(nav.isCollapsed);
	const getDepth = getSideNavItemDepth();
	const depth = $derived(getDepth());
	// Nested rows render inline below an expanded row, or at the top of a rail flyout.
	setSideNavItemDepth(() => (isCollapsed ? 0 : depth + 1));
	setSideNavCollapseContext(EXPANDED_COLLAPSE_STATE);

	const hasChildren = $derived(children != null);
	const isKeptInRail = $derived(!!icon && depth === 0);
	const config = $derived(typeof itemCollapsible === 'object' ? itemCollapsible : {});
	const isItemCollapsible = $derived(hasChildren && itemCollapsible !== false);
	let uncontrolledCollapsed = $state<boolean | undefined>(undefined);
	const isItemCollapsed = $derived(config.isCollapsed ?? uncontrolledCollapsed ?? config.defaultIsCollapsed ?? false);
	function toggleItemCollapse() {
		const next = !isItemCollapsed;
		if (config.isCollapsed === undefined) uncontrolledCollapsed = next;
		config.onCollapsedChange?.(next);
	}

	const displayIcon = $derived(isSelected && selectedIcon ? selectedIcon : icon);
	const iconColor = $derived(isSelected ? 'inherit' : isDisabled ? 'disabled' : 'secondary');
	const hasPrimaryAction = $derived(!!href || !!onclick);
	const hasIndependentToggle = $derived(isItemCollapsible && hasPrimaryAction && !isCollapsed);
	const hasRowWrapper = $derived(hasIndependentToggle || actions != null);
	const isLink = $derived(!!href && !isDisabled);
	const childrenId = `${uid}-children`;
	const labelId = `${uid}-label`;
	const railLabel = $derived(ariaLabel != null && ariaLabel.trim() !== '' ? ariaLabel : label);

	function handleClick(e: MouseEvent) {
		if (isDisabled) {
			e.preventDefault();
			return;
		}
		if (isItemCollapsible && !hasIndependentToggle && !isCollapsed) {
			e.preventDefault();
			toggleItemCollapse();
			return;
		}
		onclick?.(e);
	}
	function handleToggleClick(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		toggleItemCollapse();
	}

	// Rail rows with children open a flyout of them.
	const flyout = createMenuHover({ isEnabled: () => isCollapsed && hasChildren, clickGuardMs: 0 });
	let railTrigger: HTMLButtonElement | undefined = $state();
	$effect(() => {
		if (!isCollapsed && flyout.isOpen) flyout.hide();
	});
	$effect(() => () => flyout.destroy());
	// Choosing a row closes the flyout; expanding or collapsing a nested row keeps it open.
	// Port change: Astryx closes on any click inside, which also drops a nested expansion.
	function onFlyoutClick(e: MouseEvent) {
		if ((e.target as Element).closest('[aria-expanded]')) return;
		flyout.hide();
	}
</script>

{#snippet chevron(inRow: boolean)}
	<span class="chevron" class:in-row={inRow} class:expanded={!isItemCollapsed}>
		<Icon icon="chevronDown" size="sm" color="inherit" />
	</span>
{/snippet}

{#snippet itemContent()}
	{#if displayIcon}<Icon icon={displayIcon} size="sm" color={iconColor} />{/if}
	<span class="label">{label}</span>
	{#if endContent}<span class="end">{@render endContent()}</span>{/if}
	{#if isItemCollapsible && !hasIndependentToggle}{@render chevron(true)}{/if}
{/snippet}

{#if isCollapsed}
	{#if icon}
		<div class="root" data-side-nav-row data-rail-kept={isKeptInRail || undefined}>
			{#if hasChildren}
				<button
					bind:this={railTrigger}
					type="button"
					class={['astryx-nav-item', 'astryx-side-nav-item', 'rail', className]}
					data-size={size}
					data-selected={isSelected || undefined}
					data-disabled={isDisabled || undefined}
					aria-label={railLabel}
					aria-describedby={ariaDescribedby}
					aria-haspopup="dialog"
					aria-expanded={flyout.isOpen}
					aria-controls={flyout.isOpen ? childrenId : undefined}
					data-testid={testId}
					{style}
					onpointerenter={flyout.onTriggerEnter}
					onpointerleave={flyout.onTriggerLeave}
					onclick={flyout.onTriggerClick}
				>
					{#if displayIcon}<Icon icon={displayIcon} size="sm" color={iconColor} />{/if}
				</button>
				<NavFlyout
					open={flyout.isOpen}
					anchor={railTrigger}
					onClose={() => flyout.hide()}
					placement="end"
					alignment="start"
					autoFocus={flyout.openedByClick ? 'a[href], button:not([disabled])' : null}
					id={childrenId}
					role="dialog"
					aria-label={`${label} submenu`}
					class="astryx-side-nav-item-flyout"
					onpointerenter={flyout.onContentEnter}
					onpointerleave={flyout.onContentLeave}
				>
					<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions (choosing a row closes the flyout; the rows handle keys) -->
					<div class="flyout-surface" onclick={onFlyoutClick}>
						<div class="flyout-header">{label}</div>
						{@render children?.()}
					</div>
				</NavFlyout>
			{:else}
				<Tooltip content={label} placement="end" focusTrigger="always">
					<!-- svelte-ignore a11y_no_static_element_interactions (always an <a> or a <button>) -->
					<svelte:element
						this={isLink ? 'a' : 'button'}
						href={isLink ? href : undefined}
						target={isLink ? target : undefined}
						rel={isLink ? rel : undefined}
						type={isLink ? undefined : 'button'}
						class={['astryx-nav-item', 'astryx-side-nav-item', 'rail', className]}
						data-size={size}
						data-selected={isSelected || undefined}
						data-disabled={isDisabled || undefined}
						aria-current={isSelected ? 'page' : undefined}
						aria-disabled={isDisabled || undefined}
						aria-label={railLabel}
						aria-describedby={ariaDescribedby}
						data-testid={testId}
						{style}
						onclick={handleClick}
					>
						{#if displayIcon}<Icon icon={displayIcon} size="sm" color={iconColor} />{/if}
					</svelte:element>
				</Tooltip>
			{/if}
		</div>
	{/if}
{:else}
	<div class="root" data-side-nav-row data-rail-kept={isKeptInRail || undefined}>
		{#if hasRowWrapper}
			<div
				class={['astryx-nav-item', 'astryx-side-nav-item', 'row']}
				data-size={size}
				data-selected={isSelected || undefined}
				data-disabled={isDisabled || undefined}
				data-focus-within-first={actions != null || undefined}
				data-testid={testId}
			>
				<!-- svelte-ignore a11y_no_static_element_interactions (always an <a> or a <button>) -->
				<svelte:element
					this={isLink ? 'a' : 'button'}
					href={isLink ? href : undefined}
					target={isLink ? target : undefined}
					rel={isLink ? rel : undefined}
					type={isLink ? undefined : 'button'}
					class={['split-action', className]}
					style:--_depth={depth}
					{style}
					aria-current={isSelected ? 'page' : undefined}
					aria-label={ariaLabel}
					aria-describedby={ariaDescribedby}
					aria-disabled={!hasIndependentToggle && isDisabled ? true : undefined}
					aria-expanded={!hasIndependentToggle && isItemCollapsible ? !isItemCollapsed : undefined}
					aria-controls={!hasIndependentToggle && isItemCollapsible ? childrenId : undefined}
					onclick={handleClick}
				>
					{@render itemContent()}
				</svelte:element>
				{#if hasIndependentToggle}
					<button
						type="button"
						class="expand-toggle"
						aria-label={isItemCollapsed ? `Expand ${label}` : `Collapse ${label}`}
						aria-expanded={!isItemCollapsed}
						aria-controls={childrenId}
						onclick={handleToggleClick}
					>
						{@render chevron(false)}
					</button>
				{/if}
				{#if actions}<span class="actions">{@render actions()}</span>{/if}
			</div>
		{:else}
			<!-- svelte-ignore a11y_no_static_element_interactions (always an <a> or a <button>) -->
			<svelte:element
				this={isLink ? 'a' : 'button'}
				href={isLink ? href : undefined}
				target={isLink ? target : undefined}
				rel={isLink ? rel : undefined}
				type={isLink ? undefined : 'button'}
				class={['astryx-nav-item', 'astryx-side-nav-item', 'indented', className]}
				data-size={size}
				data-selected={isSelected || undefined}
				data-disabled={isDisabled || undefined}
				style:--_depth={depth}
				{style}
				aria-current={isSelected ? 'page' : undefined}
				aria-label={ariaLabel}
				aria-describedby={ariaDescribedby}
				aria-disabled={isDisabled || undefined}
				aria-expanded={isItemCollapsible ? !isItemCollapsed : undefined}
				aria-controls={isItemCollapsible ? childrenId : undefined}
				data-testid={testId}
				onclick={handleClick}
			>
				{@render itemContent()}
			</svelte:element>
		{/if}
		{#if hasChildren}
			<div
				id={childrenId}
				role="group"
				aria-labelledby={labelId}
				aria-hidden={isItemCollapsed}
				inert={isItemCollapsed}
				class="children"
				class:collapsed={isItemCollapsed}
			>
				<div class="children-inner">
					<span id={labelId} hidden>{label}</span>
					{@render children?.()}
				</div>
			</div>
		{/if}
	</div>
{/if}

<style>
	@layer astryx-base {
		.root { display: flex; flex-direction: column; width: 100%; }
		.rail {
			justify-content: center;
			width: var(--size-element-md);
			height: var(--size-element-md);
			padding-inline: 0;
		}
		.rail[data-size='sm'] { width: var(--size-element-sm); height: var(--size-element-sm); }
		.rail[data-size='lg'] { width: var(--size-element-lg); height: var(--size-element-lg); }
		.indented { padding-inline-start: calc(var(--spacing-2) + var(--_depth) * var(--spacing-6)); }
		.indented[data-size='sm'] { padding-inline-start: calc(var(--spacing-1) + var(--_depth) * var(--spacing-6)); }
		.label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
		.end { flex-shrink: 0; display: flex; align-items: center; }
		.actions { flex-shrink: 0; display: flex; align-items: center; gap: var(--spacing-1); pointer-events: auto; }
		.split-action {
			display: flex;
			align-items: center;
			align-self: stretch;
			gap: var(--spacing-2);
			flex: 1;
			min-width: 0;
			color: inherit;
			text-decoration: none;
			padding: 0;
			padding-inline-start: calc(var(--_depth) * var(--spacing-6));
			margin: 0;
			border: 0 none;
			background-color: transparent;
			font: inherit;
			text-align: start;
			cursor: pointer;
			outline: 0 none;
			border-radius: var(--radius-element);
		}
		.split-action:is(:disabled, [aria-disabled='true']) { cursor: default; }
		.split-action:focus-visible {
			outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color);
			outline-offset: var(--focus-outline-offset);
		}
		/* With actions the row draws the ring for its first child. */
		.row[data-focus-within-first] .split-action:focus-visible { outline: 0 none; }
		.expand-toggle {
			width: var(--size-element-sm);
			height: var(--size-element-sm);
			display: inline-flex;
			align-items: center;
			justify-content: center;
			flex-shrink: 0;
			padding: 0;
			margin: 0;
			border: 0 none;
			background-color: transparent;
			color: inherit;
			cursor: pointer;
			border-radius: var(--radius-element);
			outline: 0 none;
		}
		@media (hover: hover) {
			.expand-toggle:hover { background-color: var(--color-overlay-hover); }
		}
		.expand-toggle:active { background-color: var(--color-overlay-pressed); }
		.expand-toggle:focus-visible {
			outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color);
			outline-offset: var(--focus-outline-offset);
		}
		.chevron {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			width: var(--spacing-6);
			height: var(--spacing-6);
			flex-shrink: 0;
			transition: transform var(--duration-fast) var(--ease-standard);
		}
		.chevron.in-row { height: auto; }
		.chevron.expanded { transform: rotate(180deg); }
		.children {
			display: grid;
			grid-template-rows: 1fr;
			overflow: visible;
			transition-property: grid-template-rows, overflow;
			transition-behavior: allow-discrete;
			transition-duration: var(--duration-medium), 0s;
			transition-delay: 0s, var(--duration-medium);
			transition-timing-function: var(--ease-standard);
		}
		.children.collapsed { grid-template-rows: 0fr; overflow: hidden; transition-delay: 0s, 0s; }
		.children-inner { min-height: 0; }
		@media (prefers-reduced-motion: reduce) {
			.chevron { transition: none; }
			.children { transition-duration: 0s, 0s; transition-delay: 0s, 0s; }
		}
		.flyout-surface {
			border-radius: var(--radius-container);
			padding: var(--spacing-1);
			min-width: 180px;
		}
		.flyout-header {
			padding-inline: var(--spacing-2);
			padding-block: var(--spacing-1);
			font-size: var(--text-supporting-size);
			font-weight: var(--font-weight-semibold);
			color: var(--color-text-secondary);
			line-height: var(--text-supporting-leading);
		}
		:global(.astryx-layer.astryx-side-nav-item-flyout) { margin-inline: var(--spacing-1); }
	}
</style>
