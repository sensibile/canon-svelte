<!--
  Port of Astryx `TopNavHeading` (packages/core/src/TopNav/TopNavHeading.tsx), MIT, Meta Platforms, Inc.
  The TopNav product heading: an optional `logo`, a heading with optional super- and subheading
  (each optionally a link), and an optional `menu` (a NavHeadingMenu) that opens on hover or from
  its chevron button and overlaps the heading. Choosing a menu item closes it.
  With only a logo it renders a logo link (named by `logoLabel`) or a plain logo.
  Port change: `logo`, `headerEndContent` and `menu` are snippets.
  Not yet ported: press-drag-release menu activation, LinkProvider (`as`), the AppShell drawer mode.
-->
<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import Icon from '../Icon/Icon.svelte';
	import Link from '../Link/Link.svelte';
	import NavFlyout from '../NavMenu/NavFlyout.svelte';
	import { createMenuHover } from '../../internal/menuHover.svelte.js';
	import { setNavHeadingCloseContext, setNavHeadingMenuHostContext } from '../NavMenu/context.js';

	interface Props {
		logo?: Snippet;
		/** Accessible name of the logo link; defaults to `heading`. */
		logoLabel?: string;
		heading?: string;
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
		logo,
		logoLabel,
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
	const hover = createMenuHover({ isEnabled: () => menu != null, showDelay: 0 });
	const closeMenu = () => hover.hide();
	setNavHeadingCloseContext({ closeMenu });
	setNavHeadingMenuHostContext(true);
	$effect(() => () => hover.destroy());

	let anchorEl: HTMLElement | undefined = $state();
	let menuButton: HTMLButtonElement | undefined = $state();
	let overlapOffset = $state(4);
	let anchorWidth = $state(0);
	$effect(() => {
		if (hover.isOpen && anchorEl) {
			untrack(() => {
				overlapOffset = -(anchorEl!.offsetHeight + 8);
				anchorWidth = anchorEl!.offsetWidth;
			});
		}
	});

	const logoLinkLabel = $derived(logoLabel ?? heading);
	const hasAnyHref = $derived(!!(headingHref || superheadingHref || subheadingHref));
	const isWholeHeadingTrigger = $derived(!!menu && !hasAnyHref);
	const isWholeHeadingLink = $derived(!!headingHref && !menu && !superheadingHref && !subheadingHref);
	const columns = $derived(
		!heading && !menu
			? undefined
			: hasAnyHref && !menu && !isWholeHeadingLink
				? logo
					? 'logo-links'
					: 'links'
				: logo
					? menu
						? 'logo-menu'
						: 'logo'
					: menu
						? 'menu'
						: 'text'
	);
	const stop = (e: MouseEvent) => e.stopPropagation();
	function onChevronClick(e: MouseEvent) {
		e.stopPropagation();
		hover.onTriggerClick();
	}
</script>

{#snippet logoSlot()}
	{#if logo}<span class="logo">{@render logo()}</span>{/if}
{/snippet}

{#snippet textContent(inlineChevron: Snippet | undefined)}
	<span class="text">
		{#if superheading}
			{#if superheadingHref && menu}
				<span class="linked-line"><Link href={superheadingHref} color="secondary" size="xsm" onclick={stop}>{superheading}</Link></span>
			{:else}
				<span class="superheading">{superheading}</span>
			{/if}
		{/if}
		<span class="heading-row">
			{#if headingHref && menu}
				<a href={headingHref} class="heading heading-link" onclick={stop}>{heading}</a>
			{:else}
				<span class="heading">{heading}</span>
			{/if}
			{@render inlineChevron?.()}
		</span>
		{#if subheading}
			{#if subheadingHref && menu}
				<span class="linked-line"><Link href={subheadingHref} color="secondary" size="xsm" onclick={stop}>{subheading}</Link></span>
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
		aria-label={heading ? `${heading}, Open menu` : 'Open menu'}
		aria-haspopup="true"
		aria-expanded={hover.isOpen}
		aria-controls={hover.isOpen ? flyoutId : undefined}
		onclick={onChevronClick}
	>
		<Icon icon="chevronDown" size="sm" color="inherit" />
	</button>
{/snippet}

{#snippet popoverChevron()}
	<span class="chevron flipped"><Icon icon="chevronDown" size="sm" color="secondary" /></span>
{/snippet}

{#snippet endSlot()}
	{#if headerEndContent}<span class="header-end">{@render headerEndContent()}</span>{/if}
{/snippet}

{#if !heading && !menu}
	{#if headingHref}
		<a href={headingHref} aria-label={logoLabel} class={['astryx-top-nav-heading', 'root', 'trigger', className]} data-testid={testId} {style}>
			{@render logoSlot()}
		</a>
	{:else}
		<div class={['astryx-top-nav-heading', 'root', className]} data-testid={testId} {style}>{@render logoSlot()}</div>
	{/if}
{:else if isWholeHeadingLink && headingHref}
	<a
		href={headingHref}
		class={['astryx-top-nav-heading', 'root', 'trigger', className]}
		data-columns={columns}
		data-testid={testId}
		{style}
	>
		{@render logoSlot()}
		{@render textContent(undefined)}
		{@render endSlot()}
	</a>
{:else if menu}
	<!-- Hovering anywhere on the heading opens the menu; the chevron button is the keyboard and click trigger. -->
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div
		bind:this={anchorEl}
		class={['astryx-top-nav-heading', 'root', isWholeHeadingTrigger && 'trigger', className]}
		data-columns={columns}
		data-testid={testId}
		{style}
		onpointerenter={hover.onTriggerEnter}
		onpointerleave={hover.onTriggerLeave}
		onclick={() => hover.onTriggerClick()}
	>
		{#if logo && headingHref}
			<a href={headingHref} aria-label={logoLinkLabel} class="logo" onclick={stop}>{@render logo()}</a>
		{:else}
			{@render logoSlot()}
		{/if}
		{@render textContent(chevronButton)}
		{@render endSlot()}
	</div>
	<NavFlyout
		open={hover.isOpen}
		anchor={anchorEl}
		focusReturn={menuButton}
		onClose={closeMenu}
		placement="below"
		alignment="start"
		offset={overlapOffset}
		autoFocus={hover.openedByClick ? '[role="menuitem"]' : null}
		id={flyoutId}
		class="astryx-top-nav-heading-flyout"
		style={`min-width: ${anchorWidth + 16}px`}
		onpointerenter={hover.onContentEnter}
		onpointerleave={hover.onContentLeave}
	>
		<div class="popover-content">
			<button type="button" class="popover-heading" onclick={closeMenu}>
				{@render logoSlot()}
				{@render textContent(popoverChevron)}
			</button>
			<div role="menu" aria-label={heading ?? 'Navigation menu'}>
				{@render menu()}
			</div>
		</div>
	</NavFlyout>
{:else if hasAnyHref}
	<div class={['astryx-top-nav-heading', 'root', className]} data-columns={columns} data-testid={testId} {style}>
		{#if logo && headingHref}
			<a href={headingHref} aria-label={logoLinkLabel} class="logo">{@render logo()}</a>
		{:else}
			{@render logoSlot()}
		{/if}
		<span class="text">
			{#if superheading}
				{#if superheadingHref}
					<span class="linked-line"><Link href={superheadingHref} color="secondary" size="xsm">{superheading}</Link></span>
				{:else}
					<span class="superheading">{superheading}</span>
				{/if}
			{/if}
			{#if headingHref}
				<span class="linked-line"><Link href={headingHref} color="primary" weight="semibold">{heading}</Link></span>
			{:else}
				<span class="heading">{heading}</span>
			{/if}
			{#if subheading}
				{#if subheadingHref}
					<span class="linked-line"><Link href={subheadingHref} color="secondary" size="xsm">{subheading}</Link></span>
				{:else}
					<span class="subheading">{subheading}</span>
				{/if}
			{/if}
		</span>
		{@render endSlot()}
	</div>
{:else}
	<div class={['astryx-top-nav-heading', 'root', className]} data-columns={columns} data-testid={testId} {style}>
		{@render logoSlot()}
		{@render textContent(undefined)}
		{@render endSlot()}
	</div>
{/if}

<style>
	@layer astryx-base {
		.root {
			display: grid;
			grid-auto-flow: column;
			justify-content: start;
			align-items: center;
			gap: var(--spacing-2);
			min-height: var(--spacing-8);
			min-width: 0;
			padding-inline-start: var(--spacing-2);
			padding-inline-end: var(--spacing-2);
			padding-block: 0;
			box-sizing: border-box;
			text-decoration: none;
			color: var(--color-text-primary);
			cursor: default;
			outline: 0 none;
		}
		.root:has(:global(.astryx-nav-icon)) { padding-inline-start: 0; }
		.root[data-columns='logo'] { grid-template-columns: auto minmax(0, 1fr); }
		.root[data-columns='text'] { grid-template-columns: minmax(0, 1fr); }
		.root[data-columns='logo-links'] { grid-template-columns: auto minmax(min-content, 1fr); }
		.root[data-columns='links'] { grid-template-columns: minmax(min-content, 1fr); }
		.root[data-columns='logo-menu'] { grid-template-columns: auto minmax(calc(var(--spacing-7) + var(--spacing-1)), 1fr); }
		.root[data-columns='menu'] { grid-template-columns: minmax(calc(var(--spacing-7) + var(--spacing-1)), 1fr); }
		.trigger {
			cursor: pointer;
			border-radius: var(--radius-element);
			border: 0 none;
			background-color: transparent;
			font-family: inherit;
			font-size: inherit;
			font-weight: var(--font-weight-normal);
			text-align: start;
		}
		a.root:focus-visible,
		.logo:focus-visible,
		.heading-link:focus-visible,
		.chevron.interactive:focus-visible,
		.popover-heading:focus-visible {
			outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color);
			outline-offset: var(--focus-outline-offset);
		}
		.logo { flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: inherit; outline: 0 none; }
		.text { display: flex; flex-direction: column; min-width: 0; }
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
		.heading-link { color: inherit; outline: 0 none; }
		.heading-row { display: flex; align-items: center; gap: var(--spacing-1); }
		.linked-line { display: flex; min-width: 0; max-width: 100%; overflow: hidden; }
		.chevron {
			flex-shrink: 0;
			display: flex;
			align-items: center;
			justify-content: center;
			min-width: var(--spacing-7);
			min-height: var(--spacing-7);
			color: var(--color-icon-secondary);
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
		:global(.astryx-layer.astryx-top-nav-heading-flyout) { margin-inline-start: -8px; }
	}
</style>
