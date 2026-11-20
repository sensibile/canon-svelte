<!--
  Port of Astryx `Popover` / `usePopover` (packages/core/src/Popover), MIT, Meta Platforms, Inc.
  Wraps a trigger button; clicking it toggles an anchored dialog surface.
  Closes on outside press, Escape, or `close()` passed to the content snippet, and returns focus to the trigger.
  Not yet ported: bottom-sheet presentation on touch, render-prop trigger.
-->
<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import Layer from '../Layer/Layer.svelte';
	import { focusFirst, trapFocus } from '../../internal/focus.js';
	import { pushLayer } from '../../internal/layerStack.js';
	import { observeChildren } from '../../internal/observeChildren.js';
	import type { LayerAlignment, LayerPlacement } from '../../internal/position.js';
	import { cssSize, spacingVar, type SizeValue, type SpacingStep } from '../../types.js';

	interface Props {
		/** Surface content. Receives `close` to dismiss from inside. */
		content: Snippet<[close: () => void]>;
		/** The trigger; its first button (or [role=button]) toggles the popover. */
		children?: Snippet;
		/** Anchor to this element's button instead of a wrapped child. */
		anchor?: HTMLElement | null;
		placement?: LayerPlacement;
		alignment?: LayerAlignment;
		/** Controlled open state. */
		isOpen?: boolean;
		onOpenChange?: (open: boolean) => void;
		isEnabled?: boolean;
		width?: SizeValue;
		padding?: SpacingStep;
		/** Accessible name of the dialog surface. */
		label?: string;
		role?: 'dialog' | 'none';
		/** Trap focus inside while open. */
		isModal?: boolean;
		/** Adds a close button that is visually hidden until focused. */
		hasCloseButton?: boolean;
		closeButtonLabel?: string;
		/** Move focus into the surface on open. Defaults to true for modal popovers. */
		hasAutoFocus?: boolean;
		hasLightDismiss?: boolean;
		hasEscapeDismiss?: boolean;
		class?: string;
		style?: string;
	}

	let {
		content,
		children,
		anchor,
		placement = 'below',
		alignment = 'start',
		isOpen,
		onOpenChange,
		isEnabled = true,
		width,
		padding = 3,
		label,
		role = 'dialog',
		isModal = false,
		hasCloseButton = false,
		closeButtonLabel = 'Close',
		hasAutoFocus,
		hasLightDismiss = true,
		hasEscapeDismiss = true,
		class: className,
		style
	}: Props = $props();

	const uid = $props.id();
	const surfaceId = `${uid}-popover`;
	let wrapper: HTMLElement | undefined = $state();
	let surface: HTMLDivElement | undefined = $state();
	let internalOpen = $state(false);
	const open = $derived(isEnabled && (isOpen ?? internalOpen));
	const autoFocus = $derived(hasAutoFocus ?? isModal);

	let trigger = $state<HTMLElement | null>(null);
	// Position against the button itself: a wrapping Tooltip span has no box of its own.
	const anchorEl = $derived(anchor ?? trigger);
	$effect(() => {
		const root = anchor ?? wrapper;
		if (!root) return;
		return observeChildren(root, () => {
			trigger = root.matches('button, [role="button"]')
				? root
				: root.querySelector<HTMLElement>('button, [role="button"]');
		});
	});

	function setOpen(next: boolean, restoreFocus = false) {
		if (next && !isEnabled) return;
		if (untrack(() => open) === next) return;
		internalOpen = next;
		onOpenChange?.(next);
		if (!next && restoreFocus) trigger?.focus({ preventScroll: true });
	}
	const close = () => setOpen(false, true);

	// Wire the trigger: ARIA state and click to toggle.
	$effect(() => {
		const btn = trigger;
		if (!btn) return;
		const onClick = () => {
			if (btn.getAttribute('aria-disabled') === 'true') return;
			setOpen(!untrack(() => open));
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Enter' || e.key === ' ') {
				e.preventDefault();
				onClick();
			}
		};
		const needsKey = btn.tagName !== 'BUTTON';
		btn.addEventListener('click', onClick);
		if (needsKey) btn.addEventListener('keydown', onKey);
		return () => {
			btn.removeEventListener('click', onClick);
			if (needsKey) btn.removeEventListener('keydown', onKey);
		};
	});
	$effect(() => {
		const btn = trigger;
		if (!btn) return;
		btn.setAttribute('aria-haspopup', 'dialog');
		btn.setAttribute('aria-expanded', String(open));
		if (open) btn.setAttribute('aria-controls', surfaceId);
		else btn.removeAttribute('aria-controls');
		return () => {
			btn.removeAttribute('aria-haspopup');
			btn.removeAttribute('aria-expanded');
			btn.removeAttribute('aria-controls');
		};
	});

	// Focus, light dismiss and Escape while open.
	$effect(() => {
		const el = surface;
		if (!open || !el) return;
		const doc = el.ownerDocument;
		let frame = 0;
		if (autoFocus) frame = requestAnimationFrame(() => focusFirst(el));
		const untrap = isModal ? trapFocus(el) : () => {};
		const layer = pushLayer();
		const onPointerDown = (e: PointerEvent) => {
			if (!hasLightDismiss) return;
			const t = e.target as Node;
			if (el.contains(t) || trigger?.contains(t)) return;
			setOpen(false);
		};
		const onKey = (e: KeyboardEvent) => {
			// Only the innermost open popover handles Escape.
			if (e.key !== 'Escape' || !hasEscapeDismiss || !layer.isTop()) return;
			e.preventDefault();
			setOpen(false, true);
		};
		const onFocusOut = (e: FocusEvent) => {
			// A non-modal popover closes when focus leaves it for somewhere other than the trigger.
			const next = e.relatedTarget as Node | null;
			if (isModal || !hasLightDismiss || !next) return;
			if (el.contains(next) || trigger?.contains(next)) return;
			setOpen(false);
		};
		doc.addEventListener('pointerdown', onPointerDown, true);
		doc.addEventListener('keydown', onKey);
		el.addEventListener('focusout', onFocusOut);
		return () => {
			cancelAnimationFrame(frame);
			untrap();
			layer.remove();
			doc.removeEventListener('pointerdown', onPointerDown, true);
			doc.removeEventListener('keydown', onKey);
			el.removeEventListener('focusout', onFocusOut);
		};
	});
</script>

{#if children}
	<span bind:this={wrapper} class="popover-anchor">{@render children()}</span>
{/if}

<Layer
	open={open && anchorEl != null}
	anchor={anchorEl}
	{placement}
	{alignment}
	offset={4}
	bind:element={surface}
	id={surfaceId}
	role={role === 'dialog' ? 'dialog' : undefined}
	aria-label={role === 'dialog' ? label : undefined}
	aria-modal={role === 'dialog' && isModal ? 'true' : undefined}
	class={['astryx-popover', className].filter(Boolean).join(' ')}
	style={[width != null && `width: ${cssSize(width)}`, `--_popover-padding: ${spacingVar(padding)}`, style]
		.filter(Boolean)
		.join('; ')}
>
	<div class="popover-content">
		{@render content(close)}
		{#if hasCloseButton}
			<button type="button" class="close-button" onclick={close}>{closeButtonLabel}</button>
		{/if}
	</div>
</Layer>

<style>
	@layer astryx-base {
		.popover-anchor { display: inline-flex; }
		:global(.astryx-layer.astryx-popover) {
			background-color: var(--color-background-popover);
			color: var(--color-text-primary);
			--_popover-radius: var(--radius-container);
			border-radius: var(--_popover-radius);
			box-shadow: var(--shadow-low);
			padding: var(--_popover-padding);
			box-sizing: border-box;
			max-height: calc(100vh - 16px);
			overflow: auto;
			overscroll-behavior: contain;
			font-family: var(--font-family-body);
			font-size: var(--text-body-size);
			line-height: var(--text-body-leading);
		}
		:global(.astryx-layer.astryx-popover:focus-visible) {
			outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color);
		}
		@media (forced-colors: active) {
			:global(.astryx-layer.astryx-popover) { border: 1px solid CanvasText; }
		}
		.popover-content { position: relative; }
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
			margin-block-start: var(--spacing-1);
			outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color);
		}
	}
</style>
