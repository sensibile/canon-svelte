<!--
  Port of Astryx `Outline` (packages/core/src/Outline/Outline.tsx and useScrollSpy.ts), MIT, Meta Platforms, Inc.
  A table of contents for headings on the page. Each item links to `#id`; a click (or Space)
  smooth-scrolls to the heading, moves focus to it and updates the URL hash. While scrolling, the
  item for the last heading above the top edge (plus `offset` and the heading's scroll-margin)
  is marked current, and an indicator on the track follows it. Control the active item with
  `activeId` + `onActiveIdChange`. Build `items` by hand or with `outlineFromDOM`.
  Not yet ported: `parseOutlineFromMarkdown` / `useOutlineFromMarkdown` (wait on Markdown),
  custom link components, and the reduced-motion fade on coarse pointers (reduced motion jumps).
  Port change: `scrollContainerRef` is `scrollContainer` (the element itself).
  Port change: the indicator's anchor name is unique per Outline, so several can share a page.
-->
<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { untrack } from 'svelte';
	import { scrollingAncestor } from '../../internal/scrollingAncestor.js';
	import type { OutlineItem } from './types.js';

	interface Props extends HTMLAttributes<HTMLElement> {
		items: OutlineItem[];
		activeId?: string;
		onActiveIdChange?: (id: string) => void;
		label?: string;
		density?: 'default' | 'compact';
		onNavigateStart?: (id: string) => void;
		onNavigateEnd?: (id: string) => void;
		/** Pixels below the scroll container's top edge where a heading counts as reached. */
		offset?: number;
		/** The element that scrolls; defaults to the Outline's nearest scrolling ancestor, then the window. */
		scrollContainer?: HTMLElement | null;
		hasScrollOnClick?: boolean;
		'data-testid'?: string;
	}

	let {
		items,
		activeId,
		onActiveIdChange,
		label,
		density = 'default',
		onNavigateStart,
		onNavigateEnd,
		offset = 0,
		scrollContainer,
		hasScrollOnClick = true,
		'data-testid': testId,
		'aria-label': ariaLabel,
		class: className,
		...rest
	}: Props = $props();

	if (!Array.isArray(untrack(() => items))) {
		throw new Error(
			"[Outline] `items` must be an array of headings, for example items={[{id: 'intro', label: 'Introduction', level: 1}]}."
		);
	}

	const uid = $props.id();
	const anchorName = `--astryx-outline-${uid.replace(/[^a-zA-Z0-9_-]/g, '')}`;
	const resolvedLabel = $derived(ariaLabel ?? label ?? 'Table of contents');

	const SCROLL_SETTLE_TIMEOUT_MS = 1200;
	const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Spacebar']);

	let root: HTMLElement | undefined = $state();
	const isControlled = $derived(activeId !== undefined);
	let uncontrolledActiveId = $state<string | undefined>(untrack(() => items[0]?.id));
	let currentId: string | undefined = untrack(() => uncontrolledActiveId);
	let suppress = false;
	let navigation: { supersede: () => void; teardown: () => void } | null = null;
	let sync: (() => void) | null = null;
	const resolvedActiveId = $derived(isControlled ? activeId : uncontrolledActiveId);
	const itemIds = $derived(JSON.stringify(items.map((item) => item.id)));

	function getScrollRoot(): HTMLElement | null {
		return scrollContainer ?? (root == null ? null : scrollingAncestor(root));
	}
	const scrollMarginTop = (el: HTMLElement) => Number.parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
	const rootTop = (scrollRoot: HTMLElement | null) => (scrollRoot != null ? scrollRoot.getBoundingClientRect().top : 0);
	const restingTop = (target: HTMLElement, scrollRoot: HTMLElement | null) =>
		rootTop(scrollRoot) + offset + scrollMarginTop(target);

	function resolveActiveId(ids: readonly string[], scrollRoot: HTMLElement | null): string | undefined {
		if (ids.length === 0) return undefined;
		const atBottom =
			scrollRoot != null
				? scrollRoot.scrollTop + scrollRoot.clientHeight >= scrollRoot.scrollHeight - 2
				: window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
		if (atBottom) return ids[ids.length - 1];
		let active = ids[0];
		for (const id of ids) {
			const el = document.getElementById(id);
			if (el == null) continue;
			if (el.getBoundingClientRect().top <= restingTop(el, scrollRoot) + 1) active = id;
			else break;
		}
		return active;
	}

	// Track the heading in view while uncontrolled.
	$effect(() => {
		if (isControlled || typeof window === 'undefined' || !root) return;
		const ids = JSON.parse(itemIds) as string[];
		void offset;
		void scrollContainer;
		return untrack(() => {
			const scrollRoot = getScrollRoot();
			const scrollTarget: HTMLElement | Window = scrollRoot ?? window;
			let frame = 0;
			const update = () => {
				frame = 0;
				if (suppress) return;
				const next = resolveActiveId(ids, scrollRoot);
				if (next != null && next !== currentId) {
					currentId = next;
					uncontrolledActiveId = next;
					onActiveIdChange?.(next);
				}
			};
			const onScroll = () => {
				if (frame === 0) frame = requestAnimationFrame(update);
			};
			sync = update;
			update();
			scrollTarget.addEventListener('scroll', onScroll, { passive: true });
			window.addEventListener('resize', onScroll, { passive: true });
			return () => {
				sync = null;
				scrollTarget.removeEventListener('scroll', onScroll);
				window.removeEventListener('resize', onScroll);
				if (frame !== 0) cancelAnimationFrame(frame);
			};
		});
	});
	$effect(() => () => navigation?.teardown());

	function setActiveId(next: string) {
		if (!isControlled) {
			currentId = next;
			uncontrolledActiveId = next;
		}
		onActiveIdChange?.(next);
	}

	function scrollToTarget(target: HTMLElement, scrollRoot: HTMLElement | null, scrollTarget: HTMLElement | Window) {
		const behavior: ScrollBehavior = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
		if (offset === 0) {
			target.scrollIntoView({ behavior, block: 'start' });
			return;
		}
		const delta = target.getBoundingClientRect().top - restingTop(target, scrollRoot);
		scrollTarget.scrollBy({ top: delta, behavior });
	}

	function scrollTo(id: string): boolean {
		const target = document.getElementById(id);
		if (target == null) return false;
		navigation?.supersede();
		onNavigateStart?.(id);
		const controlled = isControlled;
		if (controlled) setActiveId(id);
		else suppress = true;
		const scrollRoot = getScrollRoot();
		const scrollTarget: HTMLElement | Window = scrollRoot ?? window;
		let settleTimer = 0;
		let isSettled = false;
		const cleanup = () => {
			scrollTarget.removeEventListener('scrollend', onSettle);
			scrollTarget.removeEventListener('wheel', onManual);
			scrollTarget.removeEventListener('touchmove', onManual);
			window.removeEventListener('keydown', onKeyDown);
			if (settleTimer !== 0) {
				clearTimeout(settleTimer);
				settleTimer = 0;
			}
			navigation = null;
		};
		const finish = (didArrive: boolean, shouldResume = true) => {
			if (isSettled) return;
			isSettled = true;
			cleanup();
			if (!controlled) {
				suppress = false;
				if (didArrive) {
					uncontrolledActiveId = id;
					currentId = id;
					onActiveIdChange?.(id);
				} else if (shouldResume) {
					sync?.();
				}
			}
			onNavigateEnd?.(id);
		};
		const onSettle = () => finish(true);
		const onManual = () => finish(false);
		const onKeyDown = (e: KeyboardEvent) => {
			if (!e.defaultPrevented && SCROLL_KEYS.has(e.key)) finish(false);
		};
		if (hasScrollOnClick) {
			scrollTarget.addEventListener('scrollend', onSettle, { once: true });
			scrollTarget.addEventListener('wheel', onManual, { passive: true });
			scrollTarget.addEventListener('touchmove', onManual, { passive: true });
			window.addEventListener('keydown', onKeyDown);
			settleTimer = window.setTimeout(onSettle, SCROLL_SETTLE_TIMEOUT_MS);
			navigation = { supersede: () => finish(false, false), teardown: cleanup };
			scrollToTarget(target, scrollRoot, scrollTarget);
		} else {
			finish(true);
		}
		return true;
	}

	function moveFocusTo(id: string) {
		const target = document.getElementById(id);
		if (target == null) return;
		target.focus({ preventScroll: true });
		if (document.activeElement !== target && !target.hasAttribute('tabindex')) {
			target.setAttribute('tabindex', '-1');
			target.focus({ preventScroll: true });
		}
	}
	function navigate(id: string) {
		if (scrollTo(id)) {
			window.history.pushState(null, '', `#${id}`);
			moveFocusTo(id);
		}
	}
	const hasModifier = (e: MouseEvent | KeyboardEvent) => e.metaKey || e.altKey || e.ctrlKey || e.shiftKey;
	function handleClick(e: MouseEvent, id: string) {
		if (e.defaultPrevented || hasModifier(e)) return;
		if (document.getElementById(id) == null) return;
		e.preventDefault();
		navigate(id);
	}
	function handleKeydown(e: KeyboardEvent, id: string) {
		if (e.key !== ' ' && e.key !== 'Spacebar') return;
		if (e.defaultPrevented || hasModifier(e)) return;
		e.preventDefault();
		navigate(id);
	}
	const indentLevel = (level: number) => Math.max(1, Math.min(4, level - 1 || 1));
</script>

<nav
	{...rest}
	bind:this={root}
	aria-label={resolvedLabel}
	data-testid={testId}
	class={['astryx-outline', className].filter(Boolean).join(' ')}
	data-density={density}
>
	<ul class="list" role="list">
		{#each items as item (item.id)}
			{@const isActive = item.id === resolvedActiveId}
			<li class="item" role="listitem">
				<a
					href={`#${item.id}`}
					class="link"
					class:active={isActive}
					data-indent={indentLevel(item.level)}
					data-level={item.level}
					aria-current={isActive ? 'location' : undefined}
					style:anchor-name={isActive ? anchorName : undefined}
					onclick={(e) => handleClick(e, item.id)}
					onkeydown={(e) => handleKeydown(e, item.id)}
				>
					<span class="label">{item.label}</span>
				</a>
			</li>
		{/each}
	</ul>
	<div class="track" aria-hidden="true"><span class="divider-line"></span></div>
	<span class="indicator" aria-hidden="true" style:position-anchor={anchorName}></span>
</nav>

<style>
	@layer astryx-base {
		.astryx-outline {
			display: flex;
			flex-direction: row;
			position: relative;
			gap: var(--spacing-0-5);
			width: 100%;
		}
		.track {
			position: relative;
			width: 2px;
			flex-shrink: 0;
			order: -1;
		}
		.divider-line {
			position: absolute;
			inset-block: 0;
			inset-inline-start: 0;
			width: 2px;
			background-color: var(--color-border);
			border-radius: var(--radius-full);
			pointer-events: none;
		}
		.indicator {
			position: absolute;
			inset-inline-start: 0;
			width: 2px;
			background-color: var(--color-icon-primary);
			border-radius: var(--radius-full);
			pointer-events: none;
			z-index: 1;
			top: anchor(top, 0px);
			height: anchor-size(height, 0px);
			transition-property: top, height;
			transition-duration: var(--duration-fast-min);
			transition-timing-function: var(--ease-standard);
		}
		@media (prefers-reduced-motion: reduce) {
			.indicator,
			.link { transition-duration: 0s; }
		}
		.list {
			display: flex;
			flex-direction: column;
			gap: var(--spacing-0-5);
			margin: 0;
			padding: 0;
			list-style: none;
			flex: 1;
			min-width: 0;
		}
		.item {
			list-style-type: none;
			margin: 0;
			padding: 0;
		}
		.link {
			align-items: center;
			border-radius: var(--radius-element);
			box-sizing: border-box;
			color: var(--color-text-secondary);
			cursor: pointer;
			display: flex;
			font-weight: var(--font-weight-normal);
			position: relative;
			text-align: start;
			text-decoration: none;
			transition-duration: var(--duration-fast);
			transition-property: background-color, color;
			transition-timing-function: var(--ease-standard);
			width: 100%;
			font-size: var(--text-body-size);
			line-height: var(--text-body-leading);
			padding-block: var(--spacing-2);
			padding-inline-end: var(--spacing-2);
		}
		[data-density='compact'] .link { padding-block: var(--spacing-1); }
		.link[data-indent='1'] { padding-inline-start: var(--spacing-3); }
		.link[data-indent='2'] { padding-inline-start: var(--spacing-7); }
		.link[data-indent='3'] { padding-inline-start: var(--spacing-11); }
		.link[data-indent='4'] { padding-inline-start: var(--spacing-12); }
		@media (hover: hover) {
			.link:hover {
				color: var(--color-text-primary);
				background-color: var(--color-overlay-hover);
			}
		}
		.link:active { background-color: var(--color-overlay-pressed); }
		.link:focus-visible {
			outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color);
			outline-offset: var(--focus-outline-offset);
		}
		.link.active {
			color: var(--color-text-primary);
			font-weight: var(--font-weight-semibold);
		}
		.label {
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
	}
</style>
