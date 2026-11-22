<!--
  Port of Astryx `Drawer` (packages/core/src/Drawer/Drawer.tsx), MIT, Meta Platforms, Inc.
  A panel that slides in from the `end` (default) or `start` edge, at full height. With a scrim it
  is a modal <dialog> (focus stays inside, page scroll is locked); without one it is a non-modal
  popover beside the page. `purpose` decides dismissal like Dialog: "info" closes on Escape and scrim
  press, "form" on Escape only, "required" only by its own controls (and is an alertdialog).
  Focus goes to a `data-autofocus` element if any and returns to the opener after the exit slide.
  On screens 640px or less it leaves 56px of the page showing, unless
  `experimental.isFullWidthOnMobile` is set.
  Not yet ported: the theme's drawer padding default (padding defaults to 4), the modal announcer,
  and holding input during the entrance.
-->
<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import type { HTMLDialogAttributes } from 'svelte/elements';
	import { cssSize, spacingVar, type SizeValue, type SpacingStep } from '../../types.js';
	import type { DialogPurpose } from '../Dialog/Dialog.svelte';
	import { setInputGroupContext } from '../InputGroup/context.js';
	import { pushLayer } from '../../internal/layerStack.js';
	import { lockScroll } from '../../internal/scrollLock.js';
	import { trapFocus } from '../../internal/focus.js';

	interface Props extends Omit<HTMLDialogAttributes, 'open'> {
		isOpen: boolean;
		onOpenChange: (isOpen: boolean) => void;
		side?: 'start' | 'end';
		width?: SizeValue;
		experimental?: { isFullWidthOnMobile?: boolean };
		/** The drawer's accessible name. */
		label: string;
		/** A scrim behind the drawer, making it modal. */
		hasScrim?: boolean;
		purpose?: DialogPurpose;
		padding?: SpacingStep;
		children: Snippet;
	}

	let {
		isOpen,
		onOpenChange,
		side = 'end',
		width = 400,
		experimental,
		label,
		hasScrim = true,
		purpose = 'info',
		padding = 4,
		class: className,
		style,
		children,
		...rest
	}: Props = $props();
	setInputGroupContext(null);

	const EXIT_FALLBACK_MS = 250;
	const EXIT_BACKSTOP_BUFFER_MS = 50;

	let dialog: HTMLDialogElement | undefined = $state();
	let isRendered = $state(false);
	// The side the drawer leaves from: a side change while closed waits for the next opening.
	let exitSide = $state<'start' | 'end'>('end');
	$effect.pre(() => {
		if (isOpen) {
			isRendered = true;
			exitSide = side;
		}
	});
	const anchoredSide = $derived(isOpen ? side : exitSide);
	const widthValue = $derived(cssSize(width) ?? '400px');
	const mobileWidth = $derived(
		experimental?.isFullWidthOnMobile ? '100dvw' : `min(${widthValue}, calc(100dvw - 56px))`
	);

	function isHostOpen(el: HTMLDialogElement) {
		try {
			return el.open || el.matches(':popover-open');
		} catch {
			return el.open;
		}
	}
	/** Hide the host however it was shown (the scrim, and so the modality, may have changed since). */
	function hideHost(el: HTMLDialogElement) {
		try {
			if (el.matches(':popover-open')) el.hidePopover();
		} catch {
			/* not a popover */
		}
		if (el.open) el.close();
	}

	let opener: HTMLElement | null = null;
	// Show the host when opened; after closing, wait for the exit slide before hiding it.
	$effect(() => {
		const el = dialog;
		const modal = hasScrim;
		if (!el) return;
		if (isOpen) {
			if (!isHostOpen(el)) {
				opener = el.ownerDocument.activeElement as HTMLElement | null;
				if (modal) el.showModal();
				else el.showPopover();
				el.querySelector<HTMLElement>('[data-autofocus]')?.focus();
			}
			return;
		}
		if (!isHostOpen(el)) {
			// Closed natively (a <form method="dialog">): finish without an exit slide.
			if (untrack(() => isRendered)) {
				isRendered = false;
				if (opener?.isConnected) opener.focus({ preventScroll: true });
				opener = null;
			}
			return;
		}
		return waitForExit(el, () => {
			hideHost(el);
			isRendered = false;
			if (opener?.isConnected) opener.focus({ preventScroll: true });
			opener = null;
		});
	});
	// Unmounting while open hides the host and returns focus.
	$effect(() => {
		const el = dialog;
		return () => {
			if (el && isHostOpen(el)) {
				hideHost(el);
				if (opener?.isConnected) opener.focus({ preventScroll: true });
			}
		};
	});

	function waitForExit(el: HTMLElement, complete: () => void): () => void {
		let done = false;
		const finish = () => {
			if (done) return;
			done = true;
			cleanup();
			complete();
		};
		const onEnd = (e: TransitionEvent) => {
			if (e.target === el && e.propertyName === 'transform') finish();
		};
		el.addEventListener('transitionend', onEnd);
		el.addEventListener('transitioncancel', onEnd);
		const timer = setTimeout(finish, (transformTransitionMs(el) ?? EXIT_FALLBACK_MS) + EXIT_BACKSTOP_BUFFER_MS);
		function cleanup() {
			clearTimeout(timer);
			el.removeEventListener('transitionend', onEnd);
			el.removeEventListener('transitioncancel', onEnd);
		}
		return () => {
			done = true;
			cleanup();
		};
	}
	function transformTransitionMs(el: HTMLElement): number | null {
		const cs = getComputedStyle(el);
		const props = cs.transitionProperty.split(',').map((v) => v.trim());
		const parse = (v: string) =>
			v.split(',').map((part) => {
				const t = part.trim();
				const n = Number.parseFloat(t);
				if (!Number.isFinite(n)) return null;
				return t.endsWith('ms') ? n : t.endsWith('s') ? n * 1000 : null;
			});
		const durations = parse(cs.transitionDuration);
		const delays = parse(cs.transitionDelay);
		if (durations.includes(null) || delays.includes(null)) return null;
		return props.reduce((max, p, i) => {
			if (p !== 'transform' && p !== 'all') return max;
			return Math.max(max, (durations[i % durations.length] ?? 0) + (delays[i % delays.length] ?? 0));
		}, 0);
	}

	// While open: register for Escape, and when modal lock scroll and keep Tab inside.
	$effect(() => {
		const el = dialog;
		if (!el || !isOpen) return;
		const layer = pushLayer();
		const cleanups: (() => void)[] = [() => layer.remove()];
		if (hasScrim) {
			cleanups.push(lockScroll(el.ownerDocument));
			// A modal opened inside the drawer owns Tab while it's on top.
			cleanups.push(trapFocus(el, () => layer.isTop()));
		} else {
			// A non-modal drawer has no native cancel; Escape goes to the topmost layer.
			const onKey = (e: KeyboardEvent) => {
				if (e.key !== 'Escape' || e.defaultPrevented || !layer.isTop()) return;
				if (purpose !== 'required') {
					e.preventDefault();
					onOpenChange(false);
				}
			};
			el.ownerDocument.addEventListener('keydown', onKey);
			cleanups.push(() => el.ownerDocument.removeEventListener('keydown', onKey));
		}
		// A <form method="dialog"> closes the element natively; tell the owner.
		const onClose = () => {
			if (isOpen) onOpenChange(false);
		};
		el.addEventListener('close', onClose);
		cleanups.push(() => el.removeEventListener('close', onClose));
		return () => cleanups.forEach((fn) => fn());
	});

	function oncancel(e: Event) {
		if (e.target !== e.currentTarget) return;
		e.preventDefault();
		if (purpose !== 'required') onOpenChange(false);
	}

	// A scrim press both starts and ends outside the panel.
	let downOnScrim = false;
	function isOutside(e: PointerEvent) {
		if (e.target !== dialog || !dialog) return false;
		const r = dialog.getBoundingClientRect();
		return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
	}
	function onpointerdown(e: PointerEvent) {
		downOnScrim = hasScrim && isOutside(e);
	}
	function onpointerup(e: PointerEvent) {
		if (downOnScrim && isOutside(e) && purpose === 'info') onOpenChange(false);
		downOnScrim = false;
	}
</script>

<dialog
	{...rest}
	bind:this={dialog}
	popover={hasScrim ? undefined : 'manual'}
	aria-label={label}
	aria-modal={hasScrim ? 'true' : undefined}
	role={purpose === 'required' && hasScrim ? 'alertdialog' : rest.role}
	class={['astryx-drawer', 'drawer', className]}
	class:rendered={isRendered}
	class:open={isOpen}
	class:scrim={hasScrim}
	data-side={anchoredSide}
	style={[`--_drawer-width: ${widthValue}; --_drawer-mobile-width: ${mobileWidth}; --_drawer-padding: ${spacingVar(padding)}`, style]
		.filter(Boolean)
		.join('; ')}
	{oncancel}
	{onpointerdown}
	{onpointerup}
>
	{#if isRendered}
		<div class="content" tabindex="-1">{@render children()}</div>
	{/if}
</dialog>

<style>
	@layer astryx-base {
		.drawer {
			position: fixed;
			margin: 0;
			padding: 0;
			border: 0 none;
			border-radius: 0;
			max-width: 100dvw;
			max-height: none;
			box-sizing: border-box;
			flex-direction: column;
			background-color: var(--color-background-surface);
			color: var(--color-text-primary);
			box-shadow: var(--shadow-high);
			overflow: clip;
			outline: none;
			inset-block: 0;
			height: 100dvh;
			width: var(--_drawer-width);
			display: none;
			font-family: var(--font-family-body);
			font-size: var(--text-body-size);
			line-height: var(--text-body-leading);
			transition: transform var(--duration-medium) var(--ease-standard);
		}
		@media (max-width: 640px) {
			.drawer { width: var(--_drawer-mobile-width); }
		}
		.rendered:is([open], :popover-open) { display: flex; }
		.drawer[data-side='end'] {
			inset-inline: auto 0;
			border-inline-start: var(--border-width) solid var(--color-border);
			transform: translateX(100%);
		}
		.drawer[data-side='end']:dir(rtl) { transform: translateX(-100%); }
		.drawer[data-side='start'] {
			inset-inline: 0 auto;
			border-inline-end: var(--border-width) solid var(--color-border);
			transform: translateX(-100%);
		}
		.drawer[data-side='start']:dir(rtl) { transform: translateX(100%); }
		.drawer.open[data-side] { transform: translateX(0); }
		.scrim::backdrop {
			background-color: var(--color-overlay);
			opacity: 0;
			transition: opacity var(--duration-medium) var(--ease-standard);
		}
		.scrim.open::backdrop { opacity: 1; }
		@media (prefers-reduced-motion: reduce) {
			.drawer,
			.scrim::backdrop { transition-duration: 0.01s; }
		}
		.content {
			flex-grow: 1;
			min-height: 0;
			width: 100%;
			box-sizing: border-box;
			display: flex;
			flex-direction: column;
			gap: var(--_drawer-padding);
			padding: var(--_drawer-padding);
			padding-block-end: calc(var(--_drawer-padding) + env(safe-area-inset-bottom, 0px));
			overflow-y: auto;
			overflow-x: hidden;
			overscroll-behavior: contain;
			touch-action: pan-y;
			outline: none;
			background-color: var(--color-background-surface);
		}
		@starting-style {
			.drawer.open[data-side='end'] { transform: translateX(100%); }
			.drawer.open[data-side='start'] { transform: translateX(-100%); }
			.scrim.open::backdrop { opacity: 0; }
		}
	}
</style>
