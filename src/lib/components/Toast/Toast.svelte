<!--
  Port of Astryx `Toast` (packages/core/src/Toast/Toast.tsx), MIT, Meta Platforms, Inc.
  One notification card. Auto-hide pauses while hovered or focused.
  Not yet ported: swipe-to-dismiss, renderContent.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import Button from '../Button/Button.svelte';
	import type { ToastDismissReason, ToastType } from './toastStore.svelte.js';

	interface Props {
		type?: ToastType;
		body: string | Snippet;
		endContent?: Snippet;
		isAutoHide?: boolean;
		autoHideDuration?: number;
		isExiting?: boolean;
		onDismiss: (reason: ToastDismissReason) => void;
		dismissLabel?: string;
	}

	let {
		type = 'info',
		body,
		endContent,
		isAutoHide = type !== 'error',
		autoHideDuration = 5000,
		isExiting = false,
		onDismiss,
		dismissLabel = 'Dismiss notification'
	}: Props = $props();

	let pauses = $state(new Set<string>());
	let remaining = 0;
	let startedAt = 0;
	let timer: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		remaining = autoHideDuration;
	});
	$effect(() => {
		if (!isAutoHide || isExiting || pauses.size > 0) return;
		startedAt = Date.now();
		timer = setTimeout(() => onDismiss('auto'), remaining);
		return () => {
			clearTimeout(timer);
			remaining = Math.max(0, remaining - (Date.now() - startedAt));
		};
	});
	function pause(source: string) {
		pauses = new Set([...pauses, source]);
	}
	function resume(source: string) {
		const next = new Set(pauses);
		next.delete(source);
		pauses = next;
	}
</script>

<div
	class="astryx-toast toast"
	class:exiting={isExiting}
	data-type={type}
	role={type === 'error' ? 'alert' : 'status'}
	aria-live={type === 'error' ? 'assertive' : 'polite'}
	onmouseenter={() => pause('pointer')}
	onmouseleave={() => resume('pointer')}
	onfocusin={() => pause('focus')}
	onfocusout={(e) => !(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node) && resume('focus')}
>
	<div class="inner">
		<div class="content">
			{#if typeof body === 'function'}{@render body()}{:else}{body}{/if}
		</div>
		<div class="end">
			{@render endContent?.()}
			<Button variant="ghost" size="sm" icon="close" label={dismissLabel} isIconOnly class="astryx-toast-close" onclick={() => onDismiss('manual')} />
		</div>
	</div>
</div>

<style>
	@layer astryx-base {
		.toast {
			box-sizing: border-box;
			width: 400px;
			max-width: 100%;
			padding: var(--spacing-4);
			border-radius: var(--radius-container);
			box-shadow: var(--shadow-med);
			background-color: var(--color-background-inverted);
			/* Inverted surface: page background colour reads as foreground. */
			color: var(--color-background-surface);
			font-family: var(--font-family-body);
			font-size: var(--text-body-size);
			line-height: var(--text-body-leading);
			pointer-events: auto;
			transition-property: opacity, transform;
			transition-duration: var(--duration-fast);
			transition-timing-function: var(--ease-standard);
		}
		@starting-style {
			.toast { opacity: 0; transform: translateY(var(--_toast-slide-y, var(--spacing-2))); }
		}
		.toast[data-type='error'] { background-color: var(--color-background-error-inverted); }
		.exiting { opacity: 0; transform: translateY(var(--_toast-slide-y, var(--spacing-2))); }
		@media (prefers-reduced-motion: reduce) {
			.toast { transition-duration: 0.01ms; }
		}
		@media (forced-colors: active) {
			.toast { border: 1px solid CanvasText; }
		}
		.inner { display: flex; align-items: flex-start; gap: var(--spacing-3); width: 100%; }
		.content { flex: 1; min-width: 0; overflow-wrap: anywhere; }
		.end {
			flex-shrink: 0;
			display: flex;
			align-items: center;
			gap: var(--spacing-2);
			block-size: calc(var(--text-body-size) * var(--text-body-leading));
			margin-inline-end: calc(var(--spacing-1) * -1);
		}
		.end :global(.astryx-toast-close) { color: inherit; }
	}
</style>
