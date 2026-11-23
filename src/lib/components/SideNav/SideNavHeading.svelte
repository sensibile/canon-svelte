<!--
  Port of Astryx `SideNavHeading` (packages/core/src/SideNav/SideNavHeading.tsx), MIT, Meta Platforms, Inc.
  The SideNav's product heading: an optional icon (usually a NavIcon), a heading with optional
  super- and subheading, each optionally a link, and an optional `menu` (a NavHeadingMenu)
  that opens below the heading on hover or from its chevron button.
  In a collapsed SideNav only the icon shows, with the heading as its tooltip; a heading with a
  menu becomes an icon button that opens the menu.
  Port change: `icon`, `headerEndContent` and `menu` are snippets. Choosing a menu item closes the
  menu in every layout (Astryx relies on press-and-release dismissal there, not yet ported).
  In the rail, a heading with both a menu and `headingHref` stays a menu trigger (Port change).
  Not yet ported: press-drag-release menu activation, press feedback, LinkProvider (`as`).
-->
<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import Icon from '../Icon/Icon.svelte';
	import Link from '../Link/Link.svelte';
	import Tooltip from '../Tooltip/Tooltip.svelte';
	import NavFlyout from '../NavMenu/NavFlyout.svelte';
	import { createMenuHover } from '../../internal/menuHover.svelte.js';
	import {
		setNavHeadingCloseContext,
		setNavHeadingDismissContext,
		setNavHeadingMenuHostContext
	} from '../NavMenu/context.js';
	import { getSideNavCollapse } from './context.js';
	import '../NavItem/navItem.css';

	interface Props {
		icon?: Snippet;
		heading: string;
		headingHref?: string;
		superheading?: string;
		superheadingHref?: string;
		subheading?: string;
		subheadingHref?: string;
		headerEndContent?: Snippet;
		/** A NavHeadingMenu shown from the heading. */
		menu?: Snippet;
		class?: string;
		style?: string;
		'data-testid'?: string;
	}

	let {
		icon,
		heading,
		headingHref,
		superheading,
		superheadingHref,
		subheading,
		subheadingHref,
		headerEndContent,
		menu,
		class: className,
		style,
		'data-testid': testId
	}: Props = $props();

	const uid = $props.id();
	const flyoutId = `${uid}-menu`;
	const collapse = getSideNavCollapse();
	const isCollapsed = $derived(collapse.isCollapsed);

	const hover = createMenuHover({ isEnabled: () => menu != null, showDelay: 0 });
	const closeMenu = () => hover.hide();
	setNavHeadingCloseContext({ closeMenu });
	setNavHeadingDismissContext({ dismiss: closeMenu });
	setNavHeadingMenuHostContext(true);
	$effect(() => () => hover.destroy());

	// The element the menu positions against, and returns focus to.
	let anchorEl: HTMLElement | undefined = $state();
	let menuButton: HTMLButtonElement | undefined = $state();
	let collapsedButton: HTMLButtonElement | undefined = $state();
	// The expanded menu overlaps the heading, so its own copy of the heading sits on top.
	let overlapOffset = $state(4);
	$effect(() => {
		if (hover.isOpen && !isCollapsed && anchorEl) overlapOffset = -(anchorEl.offsetHeight + 8);
	});
	// Collapsing or expanding the rail swaps the trigger; drop an open menu with it.
	let wasCollapsed = untrack(() => isCollapsed);
	$effect.pre(() => {
		if (isCollapsed !== wasCollapsed) {
			wasCollapsed = isCollapsed;
			hover.hide();
		}
	});

	const hasAnyHref = $derived(!!(headingHref || superheadingHref || subheadingHref));
	const hasCompactHeading = $derived(!!(superheading || subheading));
	const isWholeHeadingTrigger = $derived(!!menu && !hasAnyHref);
	const isWholeHeadingLink = $derived(!!headingHref && !menu && !superheadingHref && !subheadingHref);

	function onChevronClick(e: MouseEvent) {
		e.stopPropagation();
		hover.onTriggerClick();
	}
	const hoverHandlers = $derived(
		menu
			? {
					onpointerenter: hover.onTriggerEnter,
					onpointerleave: hover.onTriggerLeave
				}
			: {}
	);
</script>

{#snippet iconSlot()}
	{#if icon}<span class="icon">{@render icon()}</span>{/if}
{/snippet}

{#snippet textContent(inlineChevron: Snippet | undefined)}
	<span class="text">
		{#if superheading}
			{#if superheadingHref && menu}
				<Link href={superheadingHref} color="secondary" size="xsm">{superheading}</Link>
			{:else}
				<span class="superheading">{superheading}</span>
			{/if}
		{/if}
		<span class="heading-row">
			{#if headingHref && menu}
				<a href={headingHref} class="heading heading-link" class:compact={hasCompactHeading}>{heading}</a>
			{:else}
				<span class="heading" class:compact={hasCompactHeading}>{heading}</span>
			{/if}
			{@render inlineChevron?.()}
		</span>
		{#if subheading}
			{#if subheadingHref && menu}
				<Link href={subheadingHref} color="secondary" size="xsm">{subheading}</Link>
			{:else}
				<span class="subheading">{subheading}</span>
			{/if}
		{/if}
	</span>
{/snippet}

{#snippet chevronButton()}
	<button
		bind:this={menuButton}
		type="button"
		class="chevron interactive"
		aria-label={`${heading}, Open menu`}
		aria-haspopup="true"
		aria-expanded={hover.isOpen}
		aria-controls={hover.isOpen ? flyoutId : undefined}
		onclick={onChevronClick}
	>
		<Icon icon="chevronDown" size="sm" color="inherit" />
	</button>
{/snippet}

{#snippet staticChevron()}
	<span class="chevron"><Icon icon="chevronDown" size="sm" color="secondary" /></span>
{/snippet}

{#snippet endSlot()}
	{#if headerEndContent}<span class="header-end">{@render headerEndContent()}</span>{/if}
{/snippet}

{#snippet popoverChevron()}
	<span class="chevron flipped"><Icon icon="chevronDown" size="sm" color="secondary" /></span>
{/snippet}

{#snippet menuFlyout(anchor: HTMLElement | undefined, collapsed: boolean)}
	<NavFlyout
		open={hover.isOpen}
		{anchor}
		focusReturn={collapsed ? collapsedButton : menuButton}
		onClose={closeMenu}
		placement="below"
		alignment="start"
		offset={collapsed ? 4 : overlapOffset}
		autoFocus={hover.openedByClick ? '[role="menuitem"]' : null}
		id={flyoutId}
		class={collapsed ? 'astryx-side-nav-heading-flyout' : 'astryx-side-nav-heading-flyout overlap'}
		style={collapsed
			? `min-width: ${anchor?.offsetWidth ?? 0}px`
			: `min-width: ${(anchor?.offsetWidth ?? 0) + 16}px`}
		onpointerenter={hover.onContentEnter}
		onpointerleave={hover.onContentLeave}
	>
		<div class="popover-content">
			<button type="button" class="popover-heading" onclick={closeMenu}>
				{@render iconSlot()}
				{#if collapsed}
					<span class="text">
						{#if superheading}<span class="superheading">{superheading}</span>{/if}
						<span class="heading-row">
							<span class="heading" class:compact={hasCompactHeading}>{heading}</span>
							{@render popoverChevron()}
						</span>
						{#if subheading}<span class="subheading">{subheading}</span>{/if}
					</span>
				{:else}
					{@render textContent(popoverChevron)}
				{/if}
			</button>
			<div role="menu" aria-label={heading}>
				{@render menu?.()}
			</div>
		</div>
	</NavFlyout>
{/snippet}

{#if isCollapsed}
	{#if icon}
		<Tooltip content={heading} placement="end" focusTrigger="always">
			<!-- Port change: with both a menu and headingHref the rail keeps the menu trigger (Astryx
			     renders the link, which leaves the menu unreachable while collapsed). -->
			{#if menu}
				<button
					bind:this={collapsedButton}
					type="button"
					aria-label={heading}
					aria-haspopup="true"
					aria-expanded={hover.isOpen}
					aria-controls={hover.isOpen ? flyoutId : undefined}
					class={['astryx-nav-item', 'astryx-side-nav-heading', 'collapsed', 'menu-trigger', className]}
					data-testid={testId}
					{style}
					onpointerenter={hover.onTriggerEnter}
					onpointerleave={hover.onTriggerLeave}
					onclick={hover.onTriggerClick}
				>
					{@render iconSlot()}
				</button>
			{:else if headingHref}
				<a
					href={headingHref}
					aria-label={heading}
					class={['astryx-nav-item', 'astryx-side-nav-heading', 'collapsed', className]}
					data-testid={testId}
					{style}
				>
					{@render iconSlot()}
				</a>
			{:else}
				<div
					class={['astryx-side-nav-heading', 'root', 'centered', className]}
					data-testid={testId}
					{style}
				>
					{@render iconSlot()}
				</div>
			{/if}
		</Tooltip>
		{#if menu}{@render menuFlyout(collapsedButton, true)}{/if}
	{/if}
{:else if isWholeHeadingLink && headingHref && headerEndContent}
	<div class={['astryx-side-nav-heading', 'root', className]} data-testid={testId} {style}>
		<a href={headingHref} class="link-beside-end menu-trigger">
			{@render iconSlot()}
			{@render textContent(undefined)}
		</a>
		{@render endSlot()}
	</div>
{:else if isWholeHeadingLink && headingHref}
	<a
		href={headingHref}
		class={['astryx-side-nav-heading', 'root', 'menu-trigger', 'focusable', className]}
		data-testid={testId}
		{style}
	>
		{@render iconSlot()}
		{@render textContent(undefined)}
		{@render endSlot()}
	</a>
{:else if menu}
	<!-- Hovering anywhere on the heading opens the menu; the chevron button is the keyboard and click trigger. -->
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div
		bind:this={anchorEl}
		class={['astryx-side-nav-heading', 'root', isWholeHeadingTrigger && 'menu-trigger', className]}
		data-testid={testId}
		{style}
		{...hoverHandlers}
		onclick={() => hover.onTriggerClick()}
	>
		{#if headingHref && icon}
			<a href={headingHref} aria-label={heading} class="icon focusable">{@render icon()}</a>
		{:else}
			{@render iconSlot()}
		{/if}
		{@render textContent(chevronButton)}
		{@render endSlot()}
	</div>
	{@render menuFlyout(anchorEl, false)}
{:else if hasAnyHref}
	<div class={['astryx-side-nav-heading', 'root', className]} data-testid={testId} {style}>
		{#if headingHref && icon}
			<a href={headingHref} aria-label={heading} class="icon focusable">{@render icon()}</a>
		{:else}
			{@render iconSlot()}
		{/if}
		<span class="text">
			{#if superheading}
				{#if superheadingHref}
					<Link href={superheadingHref} color="secondary" size="xsm">{superheading}</Link>
				{:else}
					<span class="superheading">{superheading}</span>
				{/if}
			{/if}
			{#if headingHref}
				<Link href={headingHref} color="primary" weight="semibold">{heading}</Link>
			{:else}
				<span class="heading" class:compact={hasCompactHeading}>{heading}</span>
			{/if}
			{#if subheading}
				{#if subheadingHref}
					<Link href={subheadingHref} color="secondary" size="xsm">{subheading}</Link>
				{:else}
					<span class="subheading">{subheading}</span>
				{/if}
			{/if}
		</span>
		{@render endSlot()}
	</div>
{:else}
	<div class={['astryx-side-nav-heading', 'root', className]} data-testid={testId} {style}>
		{@render iconSlot()}
		{@render textContent(undefined)}
		{@render endSlot()}
	</div>
{/if}

<style>
	@layer astryx-base {
		.root {
			display: flex;
			align-items: center;
			gap: var(--spacing-2);
			min-height: var(--spacing-8);
			padding-inline-start: var(--spacing-2);
			padding-inline-end: var(--spacing-2);
			padding-block: 0;
			box-sizing: border-box;
			text-decoration: none;
			color: inherit;
			cursor: default;
		}
		.root:has(:global(.astryx-nav-icon)) { padding-inline-start: 0; }
		.root.centered { justify-content: center; }
		.collapsed { justify-content: center; padding-inline: 0; }
		.menu-trigger {
			cursor: pointer;
			border-radius: var(--radius-element);
			border: 0 none;
			background-color: transparent;
			font-family: inherit;
			font-size: inherit;
			font-weight: var(--font-weight-normal);
			text-align: start;
		}
		.focusable { outline: 0 none; }
		.focusable:focus-visible,
		.link-beside-end:focus-visible,
		.heading-link:focus-visible,
		.chevron.interactive:focus-visible,
		.popover-heading:focus-visible {
			outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color);
			outline-offset: var(--focus-outline-offset);
		}
		.icon { flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: inherit; }
		.text { display: flex; flex-direction: column; flex: 1; min-width: 0; }
		.superheading,
		.subheading {
			font-size: var(--text-supporting-size);
			line-height: var(--text-supporting-leading);
			color: var(--color-text-secondary);
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
		.heading {
			font-size: var(--text-large-size);
			font-weight: var(--font-weight-semibold);
			line-height: var(--text-large-leading);
			color: var(--color-text-primary);
			text-decoration: none;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
		.heading-row { display: flex; align-items: center; gap: var(--spacing-1); }
		.heading-link { color: inherit; outline: 0 none; }
		.chevron {
			flex-shrink: 0;
			display: flex;
			align-items: center;
			justify-content: center;
			min-width: var(--spacing-7);
			min-height: var(--spacing-7);
			color: var(--color-icon-secondary);
			font-size: inherit;
		}
		.chevron.flipped { transform: rotate(180deg); }
		.chevron.interactive {
			cursor: pointer;
			border-radius: var(--radius-element);
			border: 0 none;
			background-color: transparent;
			padding: 0;
			outline: 0 none;
		}
		@media (hover: hover) {
			.chevron.interactive:hover { background-color: var(--color-overlay-hover); }
		}
		.link-beside-end {
			display: flex;
			align-items: center;
			align-self: stretch;
			gap: var(--spacing-2);
			flex-grow: 1;
			min-width: 0;
			text-decoration: none;
			color: inherit;
			outline: 0 none;
		}
		.header-end { flex-shrink: 0; display: flex; align-items: center; margin-inline-start: auto; }
		.popover-content { padding: var(--spacing-1); overflow: hidden; }
		.popover-heading {
			display: flex;
			align-items: center;
			gap: var(--spacing-2);
			width: calc(100% - 2 * var(--spacing-1));
			border: 0 none;
			background-color: transparent;
			font-family: inherit;
			font-size: inherit;
			color: inherit;
			text-align: start;
			min-height: var(--spacing-8);
			padding-inline-start: var(--spacing-2);
			padding-inline-end: var(--spacing-2);
			padding-block: 0;
			margin-block-start: var(--spacing-1);
			margin-block-end: var(--spacing-2);
			margin-inline: var(--spacing-1);
			cursor: pointer;
			outline: 0 none;
		}
		.popover-heading:has(:global(.astryx-nav-icon)) { padding-inline-start: 0; }
		:global(.astryx-layer.astryx-side-nav-heading-flyout.overlap) { margin-inline-start: -8px; }
	}
</style>
