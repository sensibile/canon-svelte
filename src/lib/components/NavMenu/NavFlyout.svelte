<!--
  Internal: the anchored flyout behind SideNavHeading / SideNavItem rail menus (and later TopNav),
  standing in for Astryx's usePopover render in those components. MIT, Meta Platforms, Inc.
  Closes on an outside press, on Escape and when focus leaves. Escape, or closing with focus
  inside, returns focus to `focusReturn` (the anchor by default).
-->
<script lang="ts">
	import { tick, untrack, type Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import Layer from '../Layer/Layer.svelte';
	import { pushLayer } from '../../internal/layerStack.js';
	import type { LayerAlignment, LayerPlacement } from '../../internal/position.js';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		open: boolean;
		anchor: HTMLElement | null | undefined;
		onClose: () => void;
		/** Where focus returns on Escape or a close from inside; defaults to `anchor`. */
		focusReturn?: HTMLElement | null;
		/** Presses inside this element don't count as outside presses; defaults to `anchor`. */
		trigger?: HTMLElement | null;
		/** False drops the popover background, radius and shadow (the content brings its own). */
		hasSurface?: boolean;
		placement?: LayerPlacement;
		alignment?: LayerAlignment;
		offset?: number;
		/** Selector for the element to focus when it opens; null leaves focus alone. */
		autoFocus?: string | null;
		children: Snippet;
	}

	let {
		open,
		anchor,
		onClose,
		focusReturn,
		trigger,
		hasSurface = true,
		placement = 'below',
		alignment = 'start',
		offset = 4,
		autoFocus = null,
		class: className,
		children,
		...rest
	}: Props = $props();

	let surface: HTMLDivElement | undefined = $state();

	$effect(() => {
		const el = surface;
		if (!open || !el) return;
		const doc = el.ownerDocument;
		const layer = pushLayer();
		const focusSel = untrack(() => autoFocus);
		let frame = 0;
		if (focusSel) {
			frame = requestAnimationFrame(() => el.querySelector<HTMLElement>(focusSel)?.focus());
		}
		const onPointerDown = (e: PointerEvent) => {
			if (!layer.isTop()) return;
			const t = e.target as Node;
			if (el.contains(t) || (trigger ?? anchor)?.contains(t)) return;
			onClose();
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key !== 'Escape' || !layer.isTop()) return;
			e.preventDefault();
			onClose();
			(focusReturn ?? anchor)?.focus({ preventScroll: true });
		};
		const onFocusOut = (e: FocusEvent) => {
			const next = e.relatedTarget as Node | null;
			if (!next || el.contains(next) || (trigger ?? anchor)?.contains(next) || !layer.isTop()) return;
			onClose();
		};
		doc.addEventListener('pointerdown', onPointerDown, true);
		doc.addEventListener('keydown', onKey);
		el.addEventListener('focusout', onFocusOut);
		return () => {
			cancelAnimationFrame(frame);
			layer.remove();
			doc.removeEventListener('pointerdown', onPointerDown, true);
			doc.removeEventListener('keydown', onKey);
			el.removeEventListener('focusout', onFocusOut);
		};
	});

	// Closing with focus inside would drop it on <body>; send it back to the anchor instead.
	$effect.pre(() => {
		if (open) return;
		const el = untrack(() => surface);
		if (!el || !el.contains(document.activeElement)) return;
		const target = untrack(() => focusReturn ?? anchor);
		tick().then(() => target?.focus({ preventScroll: true }));
	});
</script>

<Layer
	{...rest}
	open={open && anchor != null}
	{anchor}
	{placement}
	{alignment}
	{offset}
	bind:element={surface}
	class={[hasSurface && 'astryx-nav-flyout', className].filter(Boolean).join(' ')}
>
	{@render children()}
</Layer>

<style>
	@layer astryx-base {
		:global(.astryx-layer.astryx-nav-flyout) {
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
			:global(.astryx-layer.astryx-nav-flyout) { border: 1px solid CanvasText; }
		}
	}
</style>
