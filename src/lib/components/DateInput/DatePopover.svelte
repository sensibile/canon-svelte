<!--
  Internal: the calendar popover of the date fields. Port of how Astryx's DateInput uses
  `usePopover` (packages/core/src/DateInput/DateInput.tsx), MIT, Meta Platforms, Inc.
  A manual dialog layer anchored below the field. A press outside the field and the layer closes
  it, as does Escape, which returns focus to the field when nothing else holds it. A visually
  hidden close button at the end lets screen reader users leave the dialog.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import Layer from '../Layer/Layer.svelte';
	import { on } from 'svelte/events';
	import { pushLayer } from '../../internal/layerStack.js';

	interface Props {
		open: boolean;
		anchor: HTMLElement | undefined;
		id: string;
		label: string;
		closeLabel: string;
		/** Presses that count as inside, such as on the field or its label. */
		isOwnPress: (target: EventTarget | null) => boolean;
		/** Close; `restoreFocus` when focus would otherwise be lost. */
		onDismiss: (restoreFocus: boolean) => void;
		/** Move focus into the layer on open. */
		autoFocus: boolean;
		/** Where focus goes on open: the calendar's day tab stop, or the first tab stop. */
		initialFocus?: 'day' | 'first';
		element?: HTMLElement;
		children: Snippet;
	}

	let {
		open,
		anchor,
		id,
		label,
		closeLabel,
		isOwnPress,
		onDismiss,
		autoFocus,
		initialFocus = 'day',
		element = $bindable(),
		children
	}: Props = $props();

	let surface: HTMLDivElement | undefined = $state();
	$effect(() => {
		element = surface;
	});

	/** Focus has nowhere to be: the body, or a node that left the page. */
	function isFocusDetached(doc: Document) {
		const active = doc.activeElement;
		return active == null || active === doc.body || !active.isConnected;
	}

	$effect(() => {
		const el = surface;
		if (!open || !el) return;
		const doc = el.ownerDocument;
		const layer = pushLayer();
		let frame = 0;
		if (autoFocus) {
			// 'day': the calendar's tab stop, the selected day, today, or the month's first enabled
			// day. 'first': the first tab stop in document order, as Astryx's usePopover does.
			const selectors =
				initialFocus === 'day'
					? ['button[data-date][tabindex="0"]', 'button:not([disabled])']
					: ['button:not([disabled]):not([tabindex="-1"]):not(.close-button)', 'button:not([disabled])'];
			frame = requestAnimationFrame(() => {
				for (const selector of selectors) {
					const target = el.querySelector<HTMLElement>(selector);
					if (target) return target.focus();
				}
			});
		}
		const onPointerDown = (e: PointerEvent) => {
			if (!layer.isTop()) return;
			const path = e.composedPath();
			if (path.includes(el) || path.some((t) => isOwnPress(t))) return;
			onDismiss(false);
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key !== 'Escape' || e.defaultPrevented || !layer.isTop()) return;
			e.preventDefault();
			onDismiss(true);
		};
		doc.addEventListener('pointerdown', onPointerDown, true);
		// Through `on`, so a delegated handler inside (the calendar cancelling a range) runs first.
		const offKey = on(el, 'keydown', onKey);
		return () => {
			cancelAnimationFrame(frame);
			layer.remove();
			doc.removeEventListener('pointerdown', onPointerDown, true);
			offKey();
			// Escape, or a press on empty space, leaves focus nowhere: give it back to the field.
			// Checked after the pressing pointer's mousedown has moved focus.
			setTimeout(() => isFocusDetached(doc) && onDismiss(true));
		};
	});
</script>

<Layer
	{open}
	{anchor}
	placement="below"
	alignment="start"
	offset={4}
	bind:element={surface}
	{id}
	role="dialog"
	aria-label={label}
	class="astryx-popover astryx-date-popover"
>
	<div class="content">
		{@render children()}
		<button type="button" class="close-button" onclick={() => onDismiss(true)}>{closeLabel}</button>
	</div>
</Layer>

<style>
	@layer astryx-base {
		:global(.astryx-layer.astryx-date-popover) {
			background-color: var(--color-background-popover);
			color: var(--color-text-primary);
			border-radius: var(--radius-container);
			box-shadow: var(--shadow-low);
			box-sizing: border-box;
			max-height: calc(100vh - 16px);
			overflow: auto;
			overscroll-behavior: contain;
			font-family: var(--font-family-body);
			font-size: var(--text-body-size);
			line-height: var(--text-body-leading);
		}
		@media (forced-colors: active) {
			:global(.astryx-layer.astryx-date-popover) { border: 1px solid CanvasText; }
		}
		.content { position: relative; }
		.close-button {
			position: absolute;
			bottom: 0;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip-path: inset(50%);
			pointer-events: none;
			font: inherit;
			color: var(--color-text-accent);
			background: transparent;
			border: 0;
			padding: 0;
		}
		.close-button:focus-visible {
			position: relative;
			width: auto;
			height: auto;
			clip-path: none;
			pointer-events: auto;
			display: block;
			margin: 0 var(--spacing-3) var(--spacing-2);
			outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color);
		}
	}
</style>
