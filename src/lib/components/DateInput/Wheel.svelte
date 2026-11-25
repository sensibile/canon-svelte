<!--
  Port of Astryx `ScrollWheel` (packages/core/src/DateInput/Wheel.tsx, with useScrollSettle,
  usePointerDragScroll, useOwnScrollGesture and useWheelListbox), MIT, Meta Platforms, Inc.
  One column of a picker: a listbox whose rows scroll and snap to a band in the middle. The row
  that comes to rest in the band is chosen; a disabled row gives way to the nearest enabled one.
  Arrow keys, Page keys, Home and End step through enabled rows, and a click picks a row.
  A mouse drags it like a finger. A touch that starts on it stays with it, so a sheet around it
  doesn't take the drag.
  Port change: Astryx uses this wheel on fine pointers and a UIKit-physics wheel (PickerWheel)
  under a finger. This port uses this one everywhere: the browser's own scroll momentum and
  snapping stand in for the physics. A reduced-motion setting jumps to the row instead of
  cross-fading to it. Not yet ported: looping wheels and `spinTo`.
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import { endIndex, nearestEnabledIndex, steppedIndex, type WheelOption } from './wheelOptions.js';

	interface Props {
		/** The listbox's accessible name. */
		label: string;
		options: ReadonlyArray<WheelOption>;
		/** The chosen row's value. */
		value: number;
		onChange: (value: number) => void;
		/** Whether the wheel is shown; it parks on its value each time it becomes active. */
		isActive?: boolean;
	}

	let { label, options, value, onChange, isActive = true }: Props = $props();

	const uid = $props.id();
	const PAGE_ROWS = 10;
	/** Quiet time after the last scroll event before a scroll counts as settled. */
	const SCROLL_QUIET_MS = 220;
	/** A mouse moves this far before a press becomes a drag. */
	const DRAG_SLOP = 4;
	const SETTLE_FALLBACK_MS = 260;
	/** Times a keyed or clicked scroll that stopped short is aimed again. */
	const MAX_RE_AIMS = 3;
	const COLUMN_SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ']);

	let scroller: HTMLDivElement | undefined = $state();
	const selectedIndex = $derived(Math.max(0, options.findIndex((option) => option.value === value)));
	let activeIndex = $state(untrack(() => selectedIndex));

	// The row a keyed or clicked scroll is heading for; a hand on the wheel ends it.
	let steered: number | null = null;
	let reAim: { top: number; count: number } | null = null;
	let isAtRest = true;
	let isDragging = false;

	function rowSize(): number {
		const first = scroller?.firstElementChild;
		return first instanceof HTMLElement && first.offsetHeight > 0 ? first.offsetHeight : 0;
	}

	function motion(): ScrollBehavior {
		return matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
	}

	function scrollToIndex(index: number, behavior: ScrollBehavior, isReAim = false) {
		const size = rowSize();
		if (!scroller || size === 0) return;
		steered = index;
		if (!isReAim) reAim = null;
		scroller.scrollTo({ top: index * size, behavior: behavior === 'smooth' ? motion() : behavior });
	}

	function onSettle() {
		const el = scroller;
		const size = rowSize();
		if (!el || size === 0) return;
		if (steered != null) {
			// A smooth scroll a snap cut short is aimed again, unless it is stuck.
			const top = el.scrollTop;
			const last = reAim;
			const isShort = Math.abs(top - steered * size) >= 1;
			const isStuck = last != null && (Math.abs(top - last.top) < 1 || last.count >= MAX_RE_AIMS);
			if (isShort && !isStuck) {
				reAim = { top, count: (last?.count ?? 0) + 1 };
				scrollToIndex(steered, 'smooth', true);
				return;
			}
			steered = null;
			reAim = null;
		}
		const index = Math.min(options.length - 1, Math.max(0, Math.round(el.scrollTop / size)));
		const restIndex = index === selectedIndex ? index : nearestEnabledIndex(options, index, selectedIndex);
		if (restIndex !== index) {
			scrollToIndex(restIndex, 'smooth');
			return;
		}
		const option = options[index];
		if (option != null && !option.isDisabled && option.value !== value) onChange(option.value);
	}

	// ---- Settling: the scroll has gone quiet with no finger or mouse holding it ----
	$effect(() => {
		const el = scroller;
		if (!el || !isActive) {
			isAtRest = true;
			return;
		}
		let timer: ReturnType<typeof setTimeout> | undefined;
		let hasSettled = false;
		let isTouching = false;
		let wasHeld = false;
		const settle = () => {
			if (isDragging) wasHeld = true;
			if (hasSettled || isTouching || isDragging) return;
			hasSettled = true;
			isAtRest = true;
			clearTimeout(timer);
			onSettle();
		};
		const arm = () => {
			clearTimeout(timer);
			timer = setTimeout(settle, SCROLL_QUIET_MS);
		};
		const onScroll = () => {
			hasSettled = false;
			isAtRest = false;
			if (isDragging) wasHeld = true;
			arm();
		};
		const onTouchStart = () => {
			isTouching = true;
			hasSettled = false;
			isAtRest = false;
			steered = null;
			clearTimeout(timer);
		};
		const onTouchEnd = () => {
			isTouching = false;
			arm();
		};
		const onPointerEnd = () => {
			if (wasHeld) {
				wasHeld = false;
				arm();
			}
		};
		const endSteer = () => (steered = null);
		const endSteerOnKey = (e: KeyboardEvent) => {
			if (COLUMN_SCROLL_KEYS.has(e.key)) steered = null;
		};
		el.addEventListener('scroll', onScroll, { passive: true });
		el.addEventListener('scrollend', settle);
		el.addEventListener('touchstart', onTouchStart, { passive: true });
		el.addEventListener('touchend', onTouchEnd, { passive: true });
		el.addEventListener('touchcancel', onTouchEnd, { passive: true });
		el.addEventListener('pointerup', onPointerEnd);
		el.addEventListener('pointercancel', onPointerEnd);
		el.addEventListener('wheel', endSteer, { passive: true });
		el.addEventListener('pointerdown', endSteer, { passive: true });
		el.addEventListener('keydown', endSteerOnKey, { passive: true });
		return () => {
			clearTimeout(timer);
			steered = null;
			el.removeEventListener('scroll', onScroll);
			el.removeEventListener('scrollend', settle);
			el.removeEventListener('touchstart', onTouchStart);
			el.removeEventListener('touchend', onTouchEnd);
			el.removeEventListener('touchcancel', onTouchEnd);
			el.removeEventListener('pointerup', onPointerEnd);
			el.removeEventListener('pointercancel', onPointerEnd);
			el.removeEventListener('wheel', endSteer);
			el.removeEventListener('pointerdown', endSteer);
			el.removeEventListener('keydown', endSteerOnKey);
		};
	});

	// ---- A mouse drags the wheel like a finger ----
	$effect(() => {
		const el = scroller;
		if (!el || !isActive) return;
		let pointerId: number | null = null;
		let originY = 0;
		let originScrollTop = 0;
		let wasDragged = false;
		let restoreTimer: number | undefined;
		isDragging = false;
		const restoreSnap = () => {
			clearTimeout(restoreTimer);
			el.removeEventListener('scrollend', restoreSnap);
			el.style.removeProperty('scroll-snap-type');
		};
		const onPointerDown = (e: PointerEvent) => {
			if (e.pointerType !== 'mouse' || e.button !== 0) return;
			// The sheet around the wheel doesn't start its own drag.
			e.stopPropagation();
			pointerId = e.pointerId;
			originY = e.clientY;
			originScrollTop = el.scrollTop;
			isDragging = false;
		};
		const onPointerMove = (e: PointerEvent) => {
			if (pointerId !== e.pointerId) return;
			const delta = e.clientY - originY;
			if (!isDragging) {
				if (Math.abs(delta) < DRAG_SLOP) return;
				isDragging = true;
				el.setPointerCapture(e.pointerId);
				// Snapping would fight each step of the drag.
				clearTimeout(restoreTimer);
				el.removeEventListener('scrollend', restoreSnap);
				el.style.scrollSnapType = 'none';
				el.style.userSelect = 'none';
			}
			el.scrollTop = originScrollTop - delta;
		};
		const onPointerEnd = (e: PointerEvent) => {
			if (pointerId !== e.pointerId) return;
			pointerId = null;
			if (!isDragging) return;
			isDragging = false;
			wasDragged = true;
			el.style.removeProperty('user-select');
			if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
			const size = rowSize();
			if (size > 0) el.scrollTo({ top: Math.round(el.scrollTop / size) * size, behavior: motion() });
			el.addEventListener('scrollend', restoreSnap);
			restoreTimer = window.setTimeout(restoreSnap, SETTLE_FALLBACK_MS);
		};
		// The click that ends a drag doesn't pick the row under it.
		const onClickCapture = (e: MouseEvent) => {
			if (!wasDragged) return;
			wasDragged = false;
			e.stopPropagation();
			e.preventDefault();
		};
		el.addEventListener('pointerdown', onPointerDown);
		el.addEventListener('pointermove', onPointerMove);
		el.addEventListener('pointerup', onPointerEnd);
		el.addEventListener('pointercancel', onPointerEnd);
		el.addEventListener('click', onClickCapture, { capture: true });
		return () => {
			el.removeEventListener('pointerdown', onPointerDown);
			el.removeEventListener('pointermove', onPointerMove);
			el.removeEventListener('pointerup', onPointerEnd);
			el.removeEventListener('pointercancel', onPointerEnd);
			el.removeEventListener('click', onClickCapture, { capture: true });
			isDragging = false;
			restoreSnap();
		};
	});

	// ---- A touch that starts on the wheel stays with it ----
	$effect(() => {
		const el = scroller;
		if (!el || !isActive) return;
		const keep = (e: TouchEvent) => e.stopPropagation();
		el.addEventListener('touchstart', keep, { passive: true });
		el.addEventListener('touchmove', keep, { passive: true });
		return () => {
			el.removeEventListener('touchstart', keep);
			el.removeEventListener('touchmove', keep);
		};
	});

	// ---- Parking on the value ----
	let isParked = false;
	function park() {
		const el = scroller;
		const size = rowSize();
		if (!el || size === 0 || !isAtRest) return;
		if (Math.round(el.scrollTop / size) !== selectedIndex) {
			// The first time it jumps; a later value change scrolls there.
			if (isParked) scrollToIndex(selectedIndex, 'smooth');
			else el.scrollTo({ top: selectedIndex * size, behavior: 'instant' });
		}
		isParked = true;
		activeIndex = selectedIndex;
	}
	$effect(() => {
		void selectedIndex;
		if (!isActive) {
			isParked = false;
			return;
		}
		untrack(park);
	});
	// Port change: a wheel shown before it has a size (a sheet still opening) parks once it has one.
	$effect(() => {
		const el = scroller;
		if (!el || !isActive || typeof ResizeObserver === 'undefined') return;
		const observer = new ResizeObserver(() => {
			if (!isParked) park();
		});
		observer.observe(el);
		return () => observer.disconnect();
	});

	// The row in the band follows the scroll.
	$effect(() => {
		const el = scroller;
		if (!el || !isActive) return;
		let frame: number | undefined;
		const onScroll = () => {
			if (frame != null) return;
			frame = requestAnimationFrame(() => {
				frame = undefined;
				const size = rowSize();
				if (size === 0) return;
				activeIndex = Math.min(options.length - 1, Math.max(0, Math.round(el.scrollTop / size)));
			});
		};
		el.addEventListener('scroll', onScroll, { passive: true });
		return () => {
			el.removeEventListener('scroll', onScroll);
			if (frame != null) cancelAnimationFrame(frame);
		};
	});

	function moveTo(row: number | null) {
		const option = row == null ? undefined : options[row];
		if (row == null || option == null || option.isDisabled) return;
		activeIndex = row;
		scrollToIndex(row, 'smooth');
		if (option.value !== value) onChange(option.value);
	}

	function onkeydown(e: KeyboardEvent) {
		const steps: Record<string, number> = { ArrowDown: 1, ArrowUp: -1, PageDown: PAGE_ROWS, PageUp: -PAGE_ROWS };
		if (steps[e.key] != null) {
			e.preventDefault();
			moveTo(steppedIndex(options, activeIndex, steps[e.key]));
		} else if (e.key === 'Home' || e.key === 'End') {
			e.preventDefault();
			moveTo(endIndex(options, e.key === 'Home' ? 'first' : 'last'));
		}
	}
</script>

<div class="astryx-wheel column">
	<div class="band" aria-hidden="true"></div>
	<div
		bind:this={scroller}
		class="scroller"
		role="listbox"
		aria-label={label}
		aria-activedescendant={options[activeIndex] ? `${uid}-${options[activeIndex].value}` : undefined}
		tabindex="0"
		{onkeydown}
	>
		{#each options as option, index (option.value)}
			<!-- svelte-ignore a11y_click_events_have_key_events, a11y_interactive_supports_focus (the listbox takes focus and keys; rows are its active descendants) -->
			<div
				id="{uid}-{option.value}"
				role="option"
				class="item"
				class:fade={index !== activeIndex && !option.isDisabled}
				class:active={index === activeIndex}
				class:disabled={option.isDisabled}
				aria-selected={option.value === value}
				aria-disabled={option.isDisabled || undefined}
				onclick={() => moveTo(index)}
			>
				<span class="item-inner">{option.label}</span>
			</div>
		{/each}
	</div>
</div>

<style>
	@layer astryx-base {
		.column {
			/* Six 44px day rows tall, so the date and time wheels line up with the month grid. */
			--_wheel-item-size: 28px;
			--_wheel-pane-size: calc(6 * 44px);
			position: relative;
			flex: 1 1 0;
			min-width: 0;
		}
		.scroller {
			block-size: var(--_wheel-pane-size);
			box-sizing: border-box;
			overflow-y: auto;
			overflow-x: hidden;
			scroll-snap-type: y mandatory;
			overscroll-behavior: contain;
			padding-block: calc((var(--_wheel-pane-size) - var(--_wheel-item-size)) / 2);
			perspective: 520px;
			transform-style: preserve-3d;
			scrollbar-width: none;
			outline: none;
			touch-action: pan-y pinch-zoom;
		}
		.scroller::-webkit-scrollbar { display: none; }
		.scroller:focus-visible {
			outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color);
			outline-offset: var(--focus-outline-offset);
		}
		.item {
			display: flex;
			align-items: center;
			justify-content: center;
			block-size: var(--_wheel-item-size);
			padding-inline: var(--spacing-2);
			scroll-snap-align: center;
			font-size: var(--text-large-size);
			line-height: var(--text-large-leading);
			font-weight: var(--font-weight-normal);
			color: var(--color-text-primary);
			white-space: nowrap;
			cursor: pointer;
			user-select: none;
			transition-property: color, font-weight;
			transition-duration: var(--duration-fast);
		}
		.item.active {
			color: var(--color-text-accent);
			font-weight: var(--font-weight-semibold);
		}
		.item.disabled {
			color: var(--color-text-disabled);
			cursor: default;
		}
		.item-inner {
			display: flex;
			align-items: center;
			justify-content: center;
			inline-size: 100%;
			block-size: 100%;
			overflow: hidden;
			text-overflow: ellipsis;
			backface-visibility: hidden;
		}
		.band {
			position: absolute;
			inset-inline: 0;
			inset-block-start: calc(50% - (var(--_wheel-item-size) / 2));
			block-size: var(--_wheel-item-size);
			border-radius: var(--radius-element);
			background-color: var(--color-neutral);
			pointer-events: none;
		}
		/* Rows tip away from the band and dim as they scroll off. */
		@supports (animation-timeline: view()) {
			.item-inner,
			.item.fade {
				animation-timeline: view(y);
				animation-range: cover 0% cover 100%;
				animation-fill-mode: both;
				animation-duration: auto;
				animation-timing-function: linear;
			}
			.item-inner { animation-name: astryx-wheel-tip; }
			.item.disabled .item-inner { animation-name: astryx-wheel-tip-and-dim; }
			.item.fade { animation-name: astryx-wheel-fade; }
			@media (prefers-reduced-motion: reduce) {
				.item-inner { animation-name: none; }
				.item.disabled .item-inner { animation-name: astryx-wheel-dim; }
			}
		}
		@keyframes astryx-wheel-tip {
			0% { transform: rotateX(52deg) scale(0.86); }
			50% { transform: rotateX(0deg) scale(1); }
			100% { transform: rotateX(-52deg) scale(0.86); }
		}
		@keyframes astryx-wheel-tip-and-dim {
			0% { opacity: 0.3; transform: rotateX(52deg) scale(0.86); }
			50% { opacity: 1; transform: rotateX(0deg) scale(1); }
			100% { opacity: 0.3; transform: rotateX(-52deg) scale(0.86); }
		}
		@keyframes astryx-wheel-dim {
			0% { opacity: 0.3; }
			50% { opacity: 1; }
			100% { opacity: 0.3; }
		}
		@keyframes astryx-wheel-fade {
			0% { color: color-mix(in oklab, var(--color-text-primary), var(--color-text-secondary)); }
			50% { color: var(--color-text-primary); }
			100% { color: color-mix(in oklab, var(--color-text-primary), var(--color-text-secondary)); }
		}
	}
</style>
