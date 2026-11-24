<!--
  Port of Astryx `BottomSheet` (packages/core/src/BottomSheet/BottomSheet.tsx and BottomSheetPanel.tsx),
  MIT, Meta Platforms, Inc.
  A touch sheet that rises from the bottom edge, with a grab handle. Drag the handle (or, on touch,
  the content when it is scrolled to the top) to move it between `snapPoints` or, for
  `purpose="info"`, to swipe it away. Releases follow UIKit's sheet: a slow release settles on the
  nearest stop, a faster one is projected 0.1s ahead, and a flick goes at least one stop further.
  `purpose` decides dismissal like Dialog: "info" closes on Escape, scrim press and swipe, "form"
  on Escape only, "required" only by its own controls (and is an alertdialog).
  With a scrim it is a modal <dialog>; sheets opened over it stack: the ones beneath recede and only
  the bottom one dims the page. Without a scrim it is a manual popover beside the live page.
  Port change: the drag runs on pointer and touch events with CSS transitions, not Astryx's
  UIKit-style gesture recognizers and springs; `finalFocusRef` is `finalFocus` (an element).
  Not yet ported: BottomSheetSwitcher (deprecated) and the replace handoff between steps,
  mobile-keyboard accommodation for `height="tall"`, resizing the layout at lower detents (the
  content gets matching end padding instead), the reduced-motion cross-fade on touch screens,
  the modal announcer, and holding input during the exit.
-->
<script lang="ts">
	import { tick, untrack, type Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { spacingVar, type SpacingStep } from '../../types.js';
	import type { DialogPurpose } from '../Dialog/Dialog.svelte';
	import { setInputGroupContext } from '../InputGroup/context.js';
	import { pushLayer } from '../../internal/layerStack.js';
	import { lockScroll } from '../../internal/scrollLock.js';
	import { trapFocus } from '../../internal/focus.js';
	import { joinSheetStack, type SheetStackView } from './sheetStack.svelte.js';
	import {
		computeDetentOffsets,
		isValidSnapPoint,
		peekOffsetFor,
		resolveRelease,
		resolveSnapPoints,
		scrimOpacityForOffset,
		type BottomSheetSnapPoint
	} from './snapOffsets.js';

	export type BottomSheetHeight = 'hug' | 'capped' | 'tall';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		isOpen: boolean;
		onOpenChange: (isOpen: boolean) => void;
		/** The sheet's accessible name; it has no heading of its own. */
		label: string;
		children: Snippet;
		padding?: SpacingStep;
		/** 'hug' fits content up to 92% of the viewport, 'capped' ~62%, 'tall' ~92%, or a px number / CSS length. */
		height?: BottomSheetHeight | number | string;
		/** Extra resting heights: a viewport fraction (0.5), '50%' or '320px'. */
		snapPoints?: readonly BottomSheetSnapPoint[];
		hasScrim?: boolean;
		/** Where focus goes when the sheet closes, instead of the element that opened it. */
		finalFocus?: HTMLElement | null;
		purpose?: DialogPurpose;
	}

	let {
		isOpen,
		onOpenChange,
		label,
		children,
		padding,
		height = 'capped',
		snapPoints,
		hasScrim = true,
		finalFocus = null,
		purpose = 'info',
		class: className,
		style,
		...rest
	}: Props = $props();
	setInputGroupContext(null);

	const HEIGHT_BUDGETS: Record<BottomSheetHeight, string> = { hug: '92dvh', capped: '62dvh', tall: '92dvh' };
	// Surface kept below the screen edge, so an upward overshoot never shows a gap.
	const MIN_RESERVE = 48;
	const RESERVE_VIEWPORT_SHARE = 0.4;
	const DRAG_SLOP = 10;
	const VELOCITY_WINDOW_MS = 100;
	const EXIT_FALLBACK_MS = 250;
	const EXIT_BACKSTOP_BUFFER_MS = 50;

	let dialog: HTMLDialogElement | undefined = $state();
	let panel: HTMLDivElement | undefined = $state();
	let body: HTMLDivElement | undefined = $state();
	let content: HTMLDivElement | undefined = $state();
	let isRendered = $state(false);
	$effect.pre(() => {
		if (isOpen) isRendered = true;
	});

	const budget = $derived(
		typeof height === 'number' ? `${height}px` : height in HEIGHT_BUDGETS ? HEIGHT_BUDGETS[height as BottomSheetHeight] : height
	);
	const canSwipeDismiss = $derived(purpose === 'info');
	const validSnapPoints = $derived((snapPoints ?? []).filter(isValidSnapPoint));
	$effect(() => {
		const ignored = (snapPoints ?? []).filter((p) => !isValidSnapPoint(p));
		if (ignored.length > 0) {
			console.warn(
				`BottomSheet: snapPoints ignored ${JSON.stringify(ignored)}. A snap point is a viewport fraction above 0 and up to 1 (0.5 is half the screen), a px length ('320px'), or a percentage ('50%').`
			);
		}
	});
	$effect(() => {
		if (isOpen && !label) console.warn('BottomSheet: requires a non-empty `label` for an accessible name.');
	});

	let reserve = $state(MIN_RESERVE);
	function measureReserve() {
		const win = dialog?.ownerDocument.defaultView;
		if (!win) return;
		const coarse = win.matchMedia('(any-pointer: coarse)').matches;
		reserve = coarse ? Math.max(MIN_RESERVE, Math.ceil(win.innerHeight * RESERVE_VIEWPORT_SHARE)) : MIN_RESERVE;
	}

	// ---- Stacking ----
	let stackView = $state<SheetStackView | null>(null);
	$effect(() => {
		if (!isOpen || !hasScrim) return;
		const entry = untrack(joinSheetStack);
		stackView = entry.view;
		return () => untrack(entry.leave);
	});
	const depth = $derived(isOpen && stackView ? stackView.depth : 0);
	const isStacked = $derived(isOpen && !!stackView?.isStacked);
	const ownsScrim = $derived(!stackView || stackView.ownsScrim);
	// A sheet that takes the scrim over from one closing beneath it shows it at once, so the dim holds.
	let isScrimTakeover = $state(false);
	let ownedScrim = false;
	$effect.pre(() => {
		const owns = ownsScrim;
		const open = untrack(() => isOpen);
		isScrimTakeover = owns && !ownedScrim && open && untrack(() => isEntered);
		ownedScrim = owns;
	});

	// ---- Showing and hiding the host ----
	function isHostOpen(el: HTMLDialogElement) {
		try {
			return el.open || el.matches(':popover-open');
		} catch {
			return el.open;
		}
	}
	function hideHost(el: HTMLDialogElement) {
		try {
			if (el.matches(':popover-open')) el.hidePopover();
		} catch {
			/* not a popover */
		}
		if (el.open) el.close();
	}
	let opener: HTMLElement | null = null;
	let hostModal: boolean | null = null;
	function showHost(el: HTMLDialogElement, modal: boolean) {
		if (modal) el.showModal();
		else el.showPopover();
		hostModal = modal;
	}
	function returnFocus() {
		const target = finalFocus ?? opener;
		if (target?.isConnected) target.focus({ preventScroll: true });
		opener = null;
	}
	// The open transition has finished: later style changes skip the entrance.
	let isEntered = $state(false);
	$effect(() => {
		const el = dialog;
		const modal = hasScrim;
		if (!el) return;
		if (isOpen) {
			if (!isHostOpen(el)) {
				opener = el.ownerDocument.activeElement as HTMLElement | null;
				measureReserve();
				resetOffset();
				showHost(el, modal);
				el.querySelector<HTMLElement>('[data-autofocus]')?.focus();
			} else if (hostModal !== modal) {
				const focused = el.ownerDocument.activeElement as HTMLElement | null;
				hideHost(el);
				showHost(el, modal);
				if (focused && el.contains(focused)) focused.focus({ preventScroll: true });
			}
			return;
		}
		isEntered = false;
		if (!isHostOpen(el)) {
			if (untrack(() => isRendered)) {
				isRendered = false;
				returnFocus();
			}
			return;
		}
		const p = untrack(() => panel);
		if (p) {
			// Slide out from wherever a drag left it.
			p.style.transition = '';
			p.style.transform = '';
		}
		return waitForExit(p ?? el, () => {
			hideHost(el);
			isRendered = false;
			resetOffset();
			returnFocus();
		});
	});
	$effect(() => {
		const el = dialog;
		return () => {
			if (el && isHostOpen(el)) {
				hideHost(el);
				returnFocus();
			}
		};
	});
	function onPanelTransitionEnd(e: TransitionEvent) {
		if (e.target === panel && e.propertyName === 'transform' && isOpen) isEntered = true;
	}

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

	// ---- While open: Escape, scroll lock, focus containment ----
	$effect(() => {
		const el = dialog;
		if (!el || !isOpen) return;
		const layer = pushLayer();
		const cleanups: (() => void)[] = [() => layer.remove()];
		if (hasScrim) {
			cleanups.push(lockScroll(el.ownerDocument));
			cleanups.push(trapFocus(el, () => layer.isTop()));
		} else {
			const onKey = (e: KeyboardEvent) => {
				if (e.key !== 'Escape' || e.defaultPrevented || !layer.isTop()) return;
				e.preventDefault();
				if (purpose !== 'required') onOpenChange(false);
			};
			el.ownerDocument.addEventListener('keydown', onKey);
			cleanups.push(() => el.ownerDocument.removeEventListener('keydown', onKey));
		}
		const onClose = () => {
			if (isOpen && !isHostOpen(el)) onOpenChange(false);
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
	// A scrim press both starts and ends on the dialog itself, outside the panel.
	let downOnScrim = false;
	function onpointerdown(e: PointerEvent) {
		downOnScrim = hasScrim && e.target === dialog;
	}
	function onpointerup(e: PointerEvent) {
		if (downOnScrim && e.target === dialog && purpose === 'info' && isOpen) onOpenChange(false);
		downOnScrim = false;
	}

	// ---- Dragging between detents ----
	let settledOffset = 0;
	let scrimOpacity = $state(1);
	let isDragging = $state(false);
	interface Drag {
		startY: number;
		startOffset: number;
		offset: number;
		samples: { t: number; y: number }[];
		visible: number;
		offsets: number[];
		peek: number | null;
	}
	let drag: Drag | null = null;

	function geometry() {
		const visible = Math.max(0, (panel?.offsetHeight ?? 0) - reserve);
		const vh = dialog?.ownerDocument.defaultView?.innerHeight ?? visible;
		const offsets = computeDetentOffsets(visible, resolveSnapPoints(validSnapPoints, vh));
		return { visible, offsets, peek: peekOffsetFor(offsets, visible) };
	}
	function rubberBand(overshoot: number, dimension: number) {
		return (1 - 1 / ((overshoot * 0.55) / dimension + 1)) * dimension;
	}
	function writeOffset(offset: number, animate: boolean) {
		if (!panel) return;
		panel.style.transition = animate ? '' : 'none';
		panel.style.transform = offset === 0 ? '' : `translateY(${offset}px)`;
	}
	function resetOffset() {
		settledOffset = 0;
		scrimOpacity = 1;
		drag = null;
		isDragging = false;
		if (panel) {
			panel.style.transition = '';
			panel.style.transform = '';
		}
		if (body) body.style.paddingBlockEnd = '';
	}

	function startDrag(y: number) {
		if (!isOpen || !panel) return;
		const g = geometry();
		drag = { startY: y, startOffset: settledOffset, offset: settledOffset, samples: [{ t: performance.now(), y }], ...g };
		isDragging = true;
		writeOffset(settledOffset, false);
	}
	function moveDrag(y: number) {
		if (!drag) return;
		const now = performance.now();
		drag.samples.push({ t: now, y });
		while (drag.samples.length > 2 && now - drag.samples[0].t > VELOCITY_WINDOW_MS) drag.samples.shift();
		let offset = drag.startOffset + (y - drag.startY);
		const last = drag.offsets[drag.offsets.length - 1];
		if (offset < 0) offset = -rubberBand(-offset, reserve);
		else if (!canSwipeDismiss && offset > last) offset = last + rubberBand(offset - last, reserve);
		drag.offset = offset;
		writeOffset(offset, false);
		if (canSwipeDismiss || drag.peek !== null) {
			scrimOpacity = scrimOpacityForOffset(Math.max(0, offset), drag.offsets, drag.visible, drag.peek);
		}
	}
	function endDrag(cancelled = false) {
		const d = drag;
		if (!d) return;
		drag = null;
		isDragging = false;
		const first = d.samples[0];
		const lastSample = d.samples[d.samples.length - 1];
		const dt = lastSample.t - first.t;
		const velocity = cancelled || dt <= 0 ? 0 : ((lastSample.y - first.y) / dt) * 1000;
		const positions = canSwipeDismiss ? [...d.offsets, d.visible] : d.offsets;
		const target = resolveRelease(d.offset, velocity, positions);
		if (canSwipeDismiss && target === d.visible && d.visible > (d.offsets[d.offsets.length - 1] ?? 0)) {
			scrimOpacity = 0;
			onOpenChange(false);
			// A controlled owner can refuse: then settle back where the sheet was.
			tick().then(() => {
				if (isOpen) settle(settledOffset, d);
			});
			return;
		}
		settle(target, d);
	}
	function settle(offset: number, g: { offsets: number[]; visible: number; peek: number | null }) {
		settledOffset = offset;
		writeOffset(offset, true);
		scrimOpacity = scrimOpacityForOffset(offset, g.offsets, g.visible, g.peek);
		// Keep the end of the content reachable while part of the sheet is below the screen.
		if (body) body.style.paddingBlockEnd = offset > 0 ? `${offset}px` : '';
	}

	// The handle drags with any pointer.
	let handlePointer: number | null = null;
	function onHandlePointerDown(e: PointerEvent) {
		if (e.button !== 0 || !isOpen) return;
		e.preventDefault();
		handlePointer = e.pointerId;
		(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
		startDrag(e.clientY);
	}
	function onHandlePointerMove(e: PointerEvent) {
		if (e.pointerId === handlePointer) moveDrag(e.clientY);
	}
	function onHandlePointerUp(e: PointerEvent) {
		if (e.pointerId !== handlePointer) return;
		handlePointer = null;
		endDrag(e.type === 'pointercancel');
	}

	// On touch, the content drags the sheet when pulled down at its top, or up while the sheet is lowered.
	$effect(() => {
		const el = body;
		if (!el || !isOpen) return;
		let touchId: number | null = null;
		let startX = 0;
		let startY = 0;
		let mode: 'pending' | 'drag' | 'scroll' = 'pending';
		const find = (list: TouchList) => Array.from(list).find((t) => t.identifier === touchId);
		const onStart = (e: TouchEvent) => {
			if (touchId !== null || e.touches.length !== 1) return;
			const t = e.touches[0];
			touchId = t.identifier;
			startX = t.clientX;
			startY = t.clientY;
			mode = 'pending';
		};
		const onMove = (e: TouchEvent) => {
			const t = find(e.changedTouches);
			if (!t) return;
			if (mode === 'pending') {
				const dx = t.clientX - startX;
				const dy = t.clientY - startY;
				if (Math.abs(dy) < DRAG_SLOP || Math.abs(dy) <= Math.abs(dx)) {
					if (Math.abs(dx) >= DRAG_SLOP) mode = 'scroll';
					return;
				}
				const pullsDown = dy > 0 && el.scrollTop <= 0;
				const raises = dy < 0 && settledOffset > 0;
				mode = pullsDown || raises ? 'drag' : 'scroll';
				if (mode === 'drag') startDrag(t.clientY);
			}
			if (mode === 'drag') {
				if (e.cancelable) e.preventDefault();
				moveDrag(t.clientY);
			}
		};
		const onEnd = (e: TouchEvent) => {
			if (!find(e.changedTouches)) return;
			if (mode === 'drag') endDrag(e.type === 'touchcancel');
			touchId = null;
		};
		el.addEventListener('touchstart', onStart, { passive: true });
		el.addEventListener('touchmove', onMove, { passive: false });
		el.addEventListener('touchend', onEnd);
		el.addEventListener('touchcancel', onEnd);
		return () => {
			el.removeEventListener('touchstart', onStart);
			el.removeEventListener('touchmove', onMove);
			el.removeEventListener('touchend', onEnd);
			el.removeEventListener('touchcancel', onEnd);
			if (drag) endDrag(true);
		};
	});

	// An overflowing body is a keyboard stop, so its content can be scrolled without a pointer.
	let isOverflowing = $state(false);
	$effect(() => {
		const el = body;
		const inner = content;
		if (!el || !inner || typeof ResizeObserver === 'undefined') return;
		const check = () => (isOverflowing = el.scrollHeight > el.clientHeight + 1);
		const ro = new ResizeObserver(check);
		ro.observe(el);
		ro.observe(inner);
		check();
		return () => ro.disconnect();
	});

	const paddingValue = $derived(padding == null ? 'var(--astryx-bottom-sheet-padding, var(--spacing-4))' : spacingVar(padding));
	const scrimValue = $derived(!isOpen ? 0 : ownsScrim ? scrimOpacity : 0);
</script>

<dialog
	bind:this={dialog}
	popover={hasScrim ? undefined : 'manual'}
	aria-label={label}
	aria-modal={hasScrim && isOpen ? 'true' : undefined}
	role={purpose === 'required' ? 'alertdialog' : undefined}
	class="sheet-host"
	class:rendered={isRendered}
	class:scrim={hasScrim}
	class:scrim-instant={isScrimTakeover || isDragging}
	class:closing={!isOpen}
	class:stacked={isStacked}
	data-sheet-stack={isStacked ? (depth === 0 ? 'top' : 'covered') : undefined}
	data-sheet-stack-depth={isStacked && depth > 0 ? Math.min(depth, 2) : undefined}
	style:--_sheet-scrim-opacity={scrimValue}
	{oncancel}
	{onpointerdown}
	{onpointerup}
>
	{#if isRendered}
		<div
			{...rest}
			bind:this={panel}
			tabindex="-1"
			class={['astryx-bottom-sheet', 'sheet', className]}
			class:hug={height === 'hug'}
			class:closing={!isOpen}
			inert={!isOpen || undefined}
			style={[`--_sheet-budget: ${budget}; --_sheet-reserve: ${reserve}px; --_sheet-padding: ${paddingValue}`, style]
				.filter(Boolean)
				.join('; ')}
			ontransitionend={onPanelTransitionEnd}
		>
			<div
				class="astryx-bottom-sheet-handle handle"
				aria-hidden="true"
				onpointerdown={onHandlePointerDown}
				onpointermove={onHandlePointerMove}
				onpointerup={onHandlePointerUp}
				onpointercancel={onHandlePointerUp}
			></div>
			<!-- svelte-ignore a11y_no_noninteractive_tabindex (a scrollable region needs a keyboard stop) -->
			<div
				bind:this={body}
				class="body"
				role={isOverflowing ? 'region' : undefined}
				aria-label={isOverflowing ? label : undefined}
				tabindex={isOverflowing ? 0 : undefined}
			>
				<div bind:this={content} class="content">{@render children()}</div>
			</div>
		</div>
		<div class="edge-tint" data-sheet-edge-tint="" aria-hidden="true"></div>
	{/if}
</dialog>

<style>
	@layer astryx-base {
		.sheet-host {
			position: fixed;
			inset: 0;
			width: 100dvw;
			height: 100dvh;
			max-width: none;
			max-height: none;
			margin: 0;
			padding: 0;
			border: 0 none;
			background-color: transparent;
			overflow: visible;
			display: none;
			outline: none;
			transform-origin: 50% 0;
		}
		.rendered:is([open], :popover-open) {
			display: flex;
			justify-content: center;
			align-items: flex-end;
		}
		.sheet-host:not(.scrim) { pointer-events: none; }
		.stacked {
			transition: transform var(--duration-medium) var(--ease-standard);
		}
		.sheet-host[data-sheet-stack-depth='1'] {
			transform: translateY(calc(-1 * var(--spacing-2))) scale(0.96);
		}
		.sheet-host[data-sheet-stack-depth='2'] {
			transform: translateY(calc(-2 * var(--spacing-2))) scale(0.92);
		}
		.scrim::backdrop {
			background-color: var(--color-overlay);
			opacity: var(--_sheet-scrim-opacity, 1);
			transition: opacity var(--duration-medium) var(--ease-standard);
		}
		.scrim.closing::backdrop { transition-timing-function: linear; }
		.scrim.scrim-instant::backdrop { transition-duration: 0s; }
		@starting-style {
			.scrim:not(.closing)::backdrop { opacity: 0; }
		}

		.sheet {
			pointer-events: auto;
			box-sizing: border-box;
			position: relative;
			display: flex;
			flex-direction: column;
			min-height: 0;
			width: 100%;
			max-width: 640px;
			height: calc(var(--_sheet-budget) + var(--_sheet-reserve));
			background-color: var(--color-background-surface);
			color: var(--color-text-primary);
			font-family: var(--font-family-body);
			font-size: var(--text-body-size);
			line-height: var(--text-body-leading);
			border: var(--border-width) solid var(--color-border);
			border-block-end: 0 none;
			border-start-start-radius: var(--radius-container);
			border-start-end-radius: var(--radius-container);
			box-shadow: var(--shadow-high);
			outline: none;
			overflow: hidden;
			padding-block-end: calc(env(safe-area-inset-bottom, 0px) + var(--_sheet-reserve));
			margin-block-end: calc(-1 * var(--_sheet-reserve));
			transform: translateY(0);
			transition: transform var(--duration-medium) var(--ease-standard);
			will-change: transform;
		}
		.sheet.hug {
			height: fit-content;
			max-height: calc(92dvh + var(--_sheet-reserve));
		}
		.sheet.closing {
			transform: translateY(100%);
			transition-duration: var(--duration-medium);
			transition-timing-function: var(--ease-exit);
			pointer-events: none;
		}
		@media (pointer: coarse) {
			.sheet.closing { transition-timing-function: cubic-bezier(0.3, 0, 0.6, 0.6); }
		}
		@starting-style {
			.sheet:not(.closing) { transform: translateY(100%); }
		}
		@media (prefers-reduced-motion: reduce) {
			.sheet,
			.sheet.closing,
			.scrim::backdrop,
			.stacked { transition-duration: 0.01s; }
			.sheet.closing { transform: translateY(0); }
			@starting-style {
				.sheet:not(.closing) { transform: translateY(0); }
			}
		}

		.handle {
			position: absolute;
			inset-block-start: 0;
			inset-inline: 0;
			z-index: 1;
			display: flex;
			align-items: center;
			justify-content: center;
			height: var(--spacing-6);
			background-image: linear-gradient(to bottom, var(--color-background-surface) 60%, transparent);
			will-change: transform;
			touch-action: pinch-zoom;
			cursor: grab;
		}
		.handle::before {
			content: '';
			width: var(--size-element-lg);
			height: var(--spacing-1);
			border-radius: var(--radius-full);
			background-color: var(--color-border);
		}
		.body {
			flex-grow: 1;
			min-height: 0;
			box-sizing: border-box;
			overflow: auto;
			overscroll-behavior: contain;
			touch-action: pan-y pinch-zoom;
			background-color: var(--color-background-surface);
			outline: 0 none;
		}
		.body:focus-visible {
			outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color);
			outline-offset: calc(-1 * var(--focus-outline-width));
		}
		.content {
			--container-padding-inline-start: var(--_sheet-padding);
			--container-padding-inline-end: var(--_sheet-padding);
			/* The first row always starts below the grab bar's band. */
			--container-padding-block-start: max(calc(var(--_sheet-padding) - var(--spacing-6)), 0px);
			--container-padding-block-end: var(--_sheet-padding);
			display: flow-root;
			box-sizing: border-box;
			height: 100%;
			min-height: fit-content;
			padding-inline: var(--_sheet-padding);
			padding-block-start: calc(var(--container-padding-block-start) + var(--spacing-6));
			padding-block-end: var(--_sheet-padding);
		}
		.edge-tint {
			position: fixed;
			inset-inline: 0;
			inset-block-end: 0;
			height: 12px;
			background-color: var(--color-background-surface);
			z-index: 2;
			pointer-events: none;
			mask-image: linear-gradient(transparent, transparent);
		}
	}
</style>
