<!--
  Port of Astryx `SideNav` (packages/core/src/SideNav/SideNav.tsx), MIT, Meta Platforms, Inc.
  A vertical navigation rail: a sticky `header` and `topContent`, a scrolling list of
  SideNavSection / SideNavItem children, and a sticky footer with `footer`, `footerIcons` and
  the collapse button. With `collapsible`, the rail collapses to icons (controlled or not).
  When collapsing moves focus out of a row that disappears, it lands on the nearest row kept in
  the rail, or on the collapse button.
  Port change: rows and the toggle mark themselves with data attributes instead of registering
  through a focus-targets context.
  Not yet ported: `resizable` (Resizable is not ported), AppShell render modes (topbar, mobile
  drawer), the rail width animation, `handleRef`, sizing footer controls through SizeContext.
-->
<script lang="ts">
	import { tick, untrack, type Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import SideNavCollapseButton from './SideNavCollapseButton.svelte';
	import { setSideNavCollapseContext, setSideNavItemDepth, type SideNavCollapsibleConfig } from './context.js';

	interface Props extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
		header?: Snippet;
		topContent?: Snippet;
		children: Snippet;
		footer?: Snippet;
		footerIcons?: Snippet;
		collapsible?: boolean | SideNavCollapsibleConfig;
	}

	let {
		header,
		topContent,
		children,
		footer,
		footerIcons,
		collapsible = false,
		class: className,
		'aria-label': ariaLabel = 'Side navigation',
		...rest
	}: Props = $props();

	const config = $derived(typeof collapsible === 'object' ? collapsible : {});
	const isCollapsible = $derived(!!collapsible);
	let uncontrolledCollapsed = $state<boolean | undefined>(undefined);
	const collapsed = $derived(
		isCollapsible && (config.isCollapsed ?? uncontrolledCollapsed ?? config.defaultIsCollapsed ?? false)
	);
	function toggle() {
		const next = !collapsed;
		if (config.isCollapsed === undefined) uncontrolledCollapsed = next;
		config.onCollapsedChange?.(next);
	}
	setSideNavCollapseContext({
		get isCollapsed() {
			return collapsed;
		},
		toggle,
		get isCollapsible() {
			return isCollapsible;
		}
	});
	setSideNavItemDepth(() => 0);

	const showCollapseButton = $derived(isCollapsible && (config.hasButton ?? true));
	const hasStickyTop = $derived(header != null || topContent != null);
	const hasStickyBottom = $derived(footer != null || footerIcons != null);

	// Keep focus in the rail when collapsing removes the row that held it.
	let nav: HTMLElement | undefined = $state();
	let wasCollapsed = untrack(() => collapsed);
	const ROW = '[data-side-nav-row]';
	const KEPT = 'data-rail-kept';
	const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
	const railRows = (root: HTMLElement) =>
		Array.from(root.querySelectorAll<HTMLElement>(ROW)).filter((row) => row.closest('[popover]') == null);
	const nameOf = (el: Element) => (el.getAttribute('aria-label') ?? el.textContent ?? '').trim();

	$effect.pre(() => {
		const now = collapsed;
		untrack(() => {
			if (now === wasCollapsed) return;
			wasCollapsed = now;
			const root = nav;
			const active = document.activeElement;
			if (!now || !root || !(active instanceof HTMLElement) || !root.contains(active)) return;
			const rows = railRows(root);
			const index = rows.findIndex((row) => row.contains(active));
			const isRowKept = index >= 0 && rows[index].hasAttribute(KEPT);
			const keptBefore = rows.slice(0, Math.max(index, 0)).filter((row) => row.hasAttribute(KEPT)).length;
			const wasOnToggle = active.closest('[data-side-nav-toggle]') != null;
			const outsideName = index < 0 && !wasOnToggle ? nameOf(active) : null;
			tick().then(() => {
				if (active.isConnected && document.activeElement === active) return;
				const kept = railRows(root);
				const controlOf = (row: HTMLElement | undefined) => row?.querySelector<HTMLElement>(FOCUSABLE) ?? undefined;
				const toggleEl = root.querySelector<HTMLElement>('[data-side-nav-toggle]') ?? undefined;
				let sameOutside: HTMLElement | undefined;
				if (wasOnToggle) sameOutside = toggleEl;
				else if (outsideName != null) {
					sameOutside = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).find(
						(el) => !kept.some((row) => row.contains(el)) && nameOf(el) === outsideName
					);
				}
				const target = isRowKept
					? controlOf(kept[keptBefore])
					: (sameOutside ?? toggleEl ?? controlOf(kept[keptBefore - 1]) ?? controlOf(kept[keptBefore]));
				target?.focus({ preventScroll: true });
			});
		});
	});
</script>

<nav
	{...rest}
	bind:this={nav}
	aria-label={ariaLabel}
	class={['astryx-side-nav', 'root', className]}
	data-collapsed={collapsed || undefined}
>
	{#if hasStickyTop}
		<div class="sticky-top">
			{@render header?.()}
			{#if topContent}<div class="top-content">{@render topContent()}</div>{/if}
		</div>
	{/if}
	<div class="scrollable" class:with-top={hasStickyTop} class:with-bottom={hasStickyBottom}>
		{@render children()}
	</div>
	{#if hasStickyBottom || showCollapseButton}
		<div class="sticky-bottom">
			{@render footer?.()}
			{#if showCollapseButton || footerIcons}
				<div class="footer-row">
					{#if showCollapseButton}<SideNavCollapseButton label={config.buttonLabel} />{/if}
					{@render footerIcons?.()}
				</div>
			{/if}
		</div>
	{/if}
</nav>

<style>
	@layer astryx-base {
		.root {
			display: flex;
			flex-direction: column;
			height: 100%;
			width: 260px;
			background-color: inherit;
			box-sizing: border-box;
			overflow: hidden;
		}
		.root[data-collapsed] { width: var(--spacing-12); }
		.sticky-top {
			display: flex;
			flex-direction: column;
			flex-shrink: 0;
			position: sticky;
			top: 0;
			z-index: 1;
			background-color: inherit;
			padding-block: var(--spacing-2);
			padding-inline: var(--spacing-2);
			gap: var(--spacing-2);
		}
		.root[data-collapsed] .sticky-top { align-items: center; }
		.scrollable {
			flex: 1;
			overflow-y: auto;
			overflow-x: hidden;
			padding-inline: var(--spacing-2);
			padding-block: var(--spacing-2);
		}
		.scrollable.with-top { padding-block-start: var(--spacing-1); }
		.scrollable.with-bottom { padding-block-end: var(--spacing-1); }
		.root[data-collapsed] .scrollable { display: flex; flex-direction: column; align-items: center; }
		.sticky-bottom {
			display: flex;
			flex-direction: column;
			flex-shrink: 0;
			margin-top: auto;
			position: sticky;
			bottom: 0;
			background-color: inherit;
			gap: var(--spacing-2);
			padding-inline: var(--spacing-2);
			padding-block-start: var(--spacing-1);
			padding-block-end: var(--spacing-2);
		}
		.root[data-collapsed] .sticky-bottom { padding-block-start: 0; align-items: center; }
		.footer-row { display: flex; align-items: center; gap: var(--spacing-1); }
		.root[data-collapsed] .footer-row { flex-direction: column-reverse; }
	}
</style>
