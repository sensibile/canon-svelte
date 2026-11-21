<!--
  Internal: an anchored, top-layer surface. Port of the "context" mode of Astryx's Layer
  (packages/core/src/Layer), MIT, Meta Platforms, Inc.
  Uses the native `popover` attribute so the layer escapes overflow and stacking contexts,
  and floating-ui for placement. Not ported: touch bottom-sheet fallback, exit animations.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { anchorLayer, type LayerAlignment, type LayerPlacement } from '../../internal/position.js';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		open: boolean;
		anchor: Element | null | undefined;
		placement?: LayerPlacement;
		alignment?: LayerAlignment;
		offset?: number;
		matchAnchorWidth?: boolean;
		/** The rendered element, for focus management by the caller. */
		element?: HTMLDivElement;
		children: Snippet;
	}

	let {
		open,
		anchor,
		placement = 'below',
		alignment = 'center',
		offset = 4,
		matchAnchorWidth = false,
		element = $bindable(),
		class: className,
		children,
		...rest
	}: Props = $props();

	$effect(() => {
		if (!open || !anchor || !element) return;
		const el = element;
		try {
			el.showPopover();
		} catch {
			/* already open or unsupported */
		}
		const stop = anchorLayer(anchor, el, { placement, alignment, offset, matchAnchorWidth });
		return () => {
			stop();
			try {
				el.hidePopover();
			} catch {
				/* already closed */
			}
		};
	});
</script>

{#if open}
	<div
		{...rest}
		bind:this={element}
		popover="manual"
		class={['astryx-layer', 'layer', className]}
		data-placement={placement}
	>
		{@render children()}
	</div>
{/if}

<style>
	@layer astryx-base {
		.layer {
			position: fixed;
			inset: auto;
			left: 0;
			top: 0;
			margin: 0;
			padding: 0;
			border: 0;
			overflow: visible;
			background: transparent;
			color: inherit;
			width: max-content;
			max-width: calc(100vw - 16px);
			--_step: min(var(--spacing-2), var(--_astryx-layer-enter-gap, var(--spacing-2)));
			animation-duration: var(--duration-fast-max);
			animation-timing-function: var(--ease-standard);
			animation-fill-mode: backwards;
			transform-origin: var(--_astryx-layer-enter-origin, 50% 50%);
		}
		.layer[data-placement='below'] { animation-name: astryx-enter-below; }
		.layer[data-placement='above'] { animation-name: astryx-enter-above; }
		.layer[data-placement='end'] { animation-name: astryx-enter-end; }
		.layer[data-placement='start'] { animation-name: astryx-enter-start; }
		@media (prefers-reduced-motion: reduce) {
			.layer[data-placement] { animation-name: none; }
		}
	}

	@keyframes astryx-enter-below {
		from { opacity: 0; transform: translateY(calc(-1 * var(--_step))) scale(0.95); }
	}
	@keyframes astryx-enter-above {
		from { opacity: 0; transform: translateY(var(--_step)) scale(0.95); }
	}
	@keyframes astryx-enter-end {
		from { opacity: 0; transform: translateX(calc(-1 * var(--_step))) scale(0.95); }
	}
	@keyframes astryx-enter-start {
		from { opacity: 0; transform: translateX(var(--_step)) scale(0.95); }
	}
</style>
