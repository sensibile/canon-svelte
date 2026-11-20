<!--
  Port of Astryx `ToastViewport` (packages/core/src/Toast/ToastViewport.tsx), MIT, Meta Platforms, Inc.
  Renders queued toasts in a corner, in the top layer so they sit above open dialogs.
  Mount one near the app root; if none is mounted, the first showToast() mounts a fallback.
  Not yet ported: custom inset, moving into an open modal's outlet.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import Toast from './Toast.svelte';
	import { toastQueue, type ToastPosition } from './toastStore.svelte.js';

	interface Props {
		position?: ToastPosition;
		maxVisible?: number;
		children?: Snippet;
		/** @internal Set on the viewport showToast() auto-mounts when none is rendered. */
		isFallback?: boolean;
	}
	let { position = 'bottomEnd', maxVisible = 5, children, isFallback = false }: Props = $props();

	let viewport: HTMLDivElement | undefined = $state();
	const isTop = $derived(position === 'topEnd' || position === 'topStart');
	const isStart = $derived(position === 'topStart' || position === 'bottomStart');

	// An explicit viewport registers and retires the fallback, so toasts render once.
	$effect(() => {
		if (!isFallback) return toastQueue.attachViewport();
	});

	const live = $derived(toastQueue.entries.filter((t) => !t.isExiting));
	// Oldest toasts beyond maxVisible are dismissed.
	$effect(() => {
		// Snapshot first: each remove() changes `live`.
		const overflowIds = live.slice(0, Math.max(0, live.length - maxVisible)).map((t) => t.id);
		for (const id of overflowIds) toastQueue.remove(id, 'auto');
	});

	const hasToasts = $derived(toastQueue.entries.length > 0);
	$effect(() => {
		const el = viewport;
		if (!el || !hasToasts) return;
		try {
			el.showPopover();
		} catch {
			/* unsupported or already shown */
		}
		return () => {
			try {
				el.hidePopover();
			} catch {
				/* already hidden */
			}
		};
	});

	// Re-raise above dialogs opened after the viewport.
	$effect(() => {
		const el = viewport;
		if (!el || !hasToasts) return;
		const raise = () => {
			if (!el.matches(':popover-open')) return;
			el.hidePopover();
			el.showPopover();
		};
		const obs = new MutationObserver(raise);
		obs.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['open'] });
		return () => obs.disconnect();
	});

</script>

{@render children?.()}

<div
	bind:this={viewport}
	popover="manual"
	class="astryx-toast-viewport viewport"
	class:top={isTop}
	class:start={isStart}
	class:empty={!hasToasts}
	role="region"
	aria-label="Notifications"
>
	{#each toastQueue.entries as entry (entry.id)}
		{@const o = entry.options}
		<div class="row" class:exiting={entry.isExiting}>
			<div class="row-inner">
				<Toast
					type={o.type}
					body={o.body}
					endContent={o.endContent}
					isAutoHide={o.isAutoHide}
					autoHideDuration={o.autoHideDuration}
					isExiting={entry.isExiting}
					onDismiss={(reason) => toastQueue.remove(entry.id, reason)}
				/>
			</div>
		</div>
	{/each}
</div>

<style>
	@layer astryx-base {
		.viewport {
			position: fixed;
			inset: auto 0 0 0;
			z-index: 500;
			display: flex;
			flex-direction: column;
			align-items: flex-end;
			box-sizing: border-box;
			width: auto;
			margin: 0;
			border: 0 none;
			background-color: transparent;
			color: inherit;
			overflow: visible;
			pointer-events: none;
			padding-block: max(var(--spacing-4), env(safe-area-inset-top, 0px)) calc(var(--spacing-4) + env(safe-area-inset-bottom, 0px));
			padding-inline: max(var(--spacing-4), env(safe-area-inset-left, 0px)) max(var(--spacing-4), env(safe-area-inset-right, 0px));
			--_toast-slide-y: var(--spacing-2);
		}
		.top { inset: 0 0 auto 0; flex-direction: column-reverse; --_toast-slide-y: calc(-1 * var(--spacing-2)); }
		.start { align-items: flex-start; }
		.empty { display: none; }
		.row {
			display: grid;
			grid-template-rows: 1fr;
			width: 400px;
			max-width: 100%;
			padding-block-end: var(--spacing-2);
			transition-property: grid-template-rows, padding;
			transition-duration: var(--duration-fast);
			transition-timing-function: var(--ease-standard);
		}
		.viewport:not(.top) .row:last-child,
		.top .row:first-child { padding-block-end: 0; }
		@starting-style {
			.row { grid-template-rows: 0fr; }
		}
		.row.exiting { grid-template-rows: 0fr; padding-block-end: 0; }
		.row-inner { min-height: 0; min-width: 0; }
		.row.exiting .row-inner { overflow: hidden; }
		@media (prefers-reduced-motion: reduce) {
			.row { transition-duration: 0.01ms; }
		}
	}
</style>
