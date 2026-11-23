<!--
  Port of Astryx `MobileNav` (packages/core/src/MobileNav/MobileNav.tsx), MIT, Meta Platforms, Inc.
  A modal navigation drawer for small screens: a header (a string becomes a level-2 heading) with
  a close button, and a scrolling <nav> of children. It slides in from the `start` or `end` edge;
  `side="auto"` picks the edge nearest the control that opened it. Escape, a press on the
  backdrop, or the close button close it; focus stays inside while open (page scroll is locked)
  and returns to the opener after the exit slide.
  Port change: `isOpen` / `onOpenChange` are required, since the AppShell that would own the open
  state isn't ported yet; `header` takes a string or a snippet.
  Not yet ported: AppShell integration, the modal announcer, holding input during the entrance.
-->
<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import type { HTMLDialogAttributes } from 'svelte/elements';
	import Button from '../Button/Button.svelte';
	import Heading from '../Heading/Heading.svelte';
	import { pushLayer } from '../../internal/layerStack.js';
	import { lockScroll } from '../../internal/scrollLock.js';
	import { trapFocus } from '../../internal/focus.js';

	interface Props extends Omit<HTMLDialogAttributes, 'open' | 'children'> {
		isOpen: boolean;
		onOpenChange: (isOpen: boolean) => void;
		children: Snippet;
		header?: string | Snippet;
		/** Drawer width in px (at most 85vw). */
		width?: number;
		side?: 'start' | 'end' | 'auto';
		/** Accessible name; defaults to a string `header`, else "Navigation". */
		label?: string;
	}

	let {
		isOpen,
		onOpenChange,
		children,
		header,
		width = 320,
		side = 'auto',
		label,
		id: idProp,
		class: className,
		style,
		...rest
	}: Props = $props();

	const uid = $props.id();
	const dialogId = $derived(idProp ?? `${uid}-mobile-nav`);
	const MAX_CLOSE_DELAY_MS = 250;
	const CLOSE_WITHIN_HOLD = 0.6;

	let dialog: HTMLDialogElement | undefined = $state();
	let isRendered = $state(false);
	let autoSide = $state<'start' | 'end'>('end');
	const resolvedSide = $derived(side === 'auto' ? autoSide : side);
	const navigationLabel = $derived(label ?? (typeof header === 'string' ? header : 'Navigation'));

	// On an auto-side opening, slide in from the half of the screen the opener is in.
	$effect.pre(() => {
		if (!isOpen) return;
		isRendered = true;
		if (untrack(() => side) !== 'auto') return;
		untrack(() => {
			const active = document.activeElement as HTMLElement | null;
			const hasOpenerFocus = active != null && active !== document.body && !dialog?.contains(active);
			const ids = [dialogId];
			const trigger = hasOpenerFocus
				? active
				: Array.from(document.querySelectorAll<HTMLElement>('[aria-controls]')).find((el) =>
						(el.getAttribute('aria-controls') ?? '').split(/\s+/).some((t) => t !== '' && ids.includes(t))
					);
			if (!trigger) return;
			const rect = trigger.getBoundingClientRect();
			const center = rect.left + rect.width / 2;
			const half = window.innerWidth / 2;
			const rtl = getComputedStyle(trigger).direction === 'rtl';
			autoSide = (rtl ? center > half : center < half) ? 'start' : 'end';
		});
	});

	function parseShortestMs(value: string): number | null {
		const ms = value
			.split(',')
			.map((part) => {
				const t = part.trim();
				const n = Number.parseFloat(t);
				if (!Number.isFinite(n)) return null;
				return t.endsWith('ms') ? n : t.endsWith('s') ? n * 1000 : null;
			})
			.filter((n): n is number => n !== null);
		return ms.length ? Math.min(...ms) : null;
	}
	function closeDelay(el: HTMLDialogElement): number {
		const cap = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : MAX_CLOSE_DELAY_MS;
		const hold = parseShortestMs(getComputedStyle(el).transitionDuration);
		if (hold === null) return cap;
		return hold <= 0 ? 0 : Math.min(cap, hold * CLOSE_WITHIN_HOLD);
	}

	let opener: HTMLElement | null = null;
	function closeAndRestore(el: HTMLDialogElement) {
		if (el.open) el.close();
		isRendered = false;
		const target = opener;
		opener = null;
		if (target && target !== document.body && target.isConnected) target.focus();
	}
	// Show the dialog when opened; after closing, let the slide play before hiding it.
	$effect(() => {
		const el = dialog;
		if (!el) return;
		if (isOpen) {
			if (!el.open) {
				opener = el.ownerDocument.activeElement as HTMLElement | null;
				el.showModal();
			}
			return;
		}
		if (!el.open) {
			if (untrack(() => isRendered)) isRendered = false;
			return;
		}
		const timer = setTimeout(() => closeAndRestore(el), closeDelay(el));
		return () => clearTimeout(timer);
	});
	// Unmounting while open closes the dialog and returns focus.
	$effect(() => {
		const el = dialog;
		return () => {
			if (el?.open) closeAndRestore(el);
		};
	});
	// While open: Escape stacking, scroll lock, and Tab containment.
	$effect(() => {
		const el = dialog;
		if (!el || !isOpen) return;
		const layer = pushLayer();
		const unlock = lockScroll(el.ownerDocument);
		const untrap = trapFocus(el, () => layer.isTop());
		// A <form method="dialog"> closes the element natively; tell the owner.
		const onClose = () => {
			if (isOpen && !el.open) onOpenChange(false);
		};
		el.addEventListener('close', onClose);
		return () => {
			layer.remove();
			unlock();
			untrap();
			el.removeEventListener('close', onClose);
		};
	});

	function oncancel(e: Event) {
		if (e.target !== e.currentTarget) return;
		e.preventDefault();
		onOpenChange(false);
	}
	// The dialog fills the viewport; a click on it (not the drawer) is a backdrop press.
	function onclick(e: MouseEvent) {
		if (e.target === e.currentTarget) onOpenChange(false);
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions (Escape closes through the cancel event) -->
<dialog
	{...rest}
	bind:this={dialog}
	id={dialogId}
	aria-label={navigationLabel}
	class={['astryx-mobile-nav', 'dialog', className]}
	class:rendered={isRendered}
	class:open={isOpen}
	data-side={resolvedSide}
	{style}
	{oncancel}
	{onclick}
>
	<div
		class="astryx-mobile-nav-drawer drawer"
		data-side={resolvedSide}
		tabindex="-1"
		style:width={`${width}px`}
	>
		<div class="header" class:no-title={!header}>
			{#if typeof header === 'string'}
				<span class="header-text"><Heading level={2}>{header}</Heading></span>
			{:else}
				{@render header?.()}
			{/if}
			<Button variant="ghost" label="Close navigation" icon="close" isIconOnly onclick={() => onOpenChange(false)} />
		</div>
		<nav aria-label={navigationLabel} class="content">
			{@render children()}
		</nav>
	</div>
</dialog>

<style>
	@layer astryx-base {
		.dialog {
			position: fixed;
			margin: 0;
			padding: 0;
			border: 0 none;
			max-width: none;
			max-height: none;
			inset: 0;
			width: 100vw;
			height: 100dvh;
			background-color: transparent;
			color: var(--color-text-primary);
			overflow: clip;
			overscroll-behavior: contain;
			touch-action: pinch-zoom;
			outline: none;
			display: none;
			font-family: var(--font-family-body);
			font-size: var(--text-body-size);
			line-height: var(--text-body-leading);
		}
		.dialog.rendered[open] { display: flex; }
		.dialog::backdrop {
			background-color: var(--color-overlay);
			opacity: 0;
			transition: opacity var(--duration-medium) var(--ease-standard);
		}
		.dialog.open::backdrop { opacity: 1; }
		@starting-style {
			.dialog.open::backdrop { opacity: 0; }
		}
		.drawer {
			position: absolute;
			top: 0;
			bottom: 0;
			display: flex;
			flex-direction: column;
			max-width: 85vw;
			background-color: var(--color-background-surface);
			color: var(--color-text-primary);
			box-sizing: border-box;
			overflow: hidden;
			transition: transform var(--duration-medium) var(--ease-standard);
			outline: none;
		}
		.drawer[data-side='start'] {
			inset-inline-start: 0;
			border-inline-end: var(--border-width) solid var(--color-border);
			transform: translateX(-100%);
		}
		.drawer[data-side='start']:dir(rtl) { transform: translateX(100%); }
		.drawer[data-side='end'] {
			inset-inline-end: 0;
			border-inline-start: var(--border-width) solid var(--color-border);
			transform: translateX(100%);
		}
		.drawer[data-side='end']:dir(rtl) { transform: translateX(-100%); }
		.open .drawer[data-side] { transform: translateX(0); }
		@starting-style {
			.open .drawer[data-side='start'] { transform: translateX(-100%); }
			.open .drawer[data-side='start']:dir(rtl) { transform: translateX(100%); }
			.open .drawer[data-side='end'] { transform: translateX(100%); }
			.open .drawer[data-side='end']:dir(rtl) { transform: translateX(-100%); }
		}
		@media (prefers-reduced-motion: reduce) {
			.drawer,
			.dialog::backdrop { transition-duration: 0.01s; }
		}
		.header {
			display: flex;
			align-items: center;
			justify-content: space-between;
			min-height: var(--spacing-12);
			padding-inline: var(--spacing-2);
			flex-shrink: 0;
			border-block-end: var(--border-width) solid var(--color-border);
		}
		.header.no-title { justify-content: flex-end; }
		.header-text { margin-inline-start: var(--spacing-1); }
		.content {
			flex: 1;
			overflow-y: auto;
			overflow-x: hidden;
			overscroll-behavior: contain;
			touch-action: pan-y pinch-zoom;
			padding: var(--spacing-2);
		}
	}
</style>
