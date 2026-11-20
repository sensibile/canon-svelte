<!--
  Port of Astryx `Dialog` (packages/core/src/Dialog/Dialog.tsx), MIT, Meta Platforms, Inc.
  A modal native <dialog>. `purpose` decides how it can be dismissed:
  "info" closes on Escape and backdrop press, "form" on Escape only, "required" only by its own controls.
  Focus moves to the DialogHeader title (or first focusable) on open and returns to the opener on close.
  Not yet ported: `isInline`, custom `position`, directional enter animation from the trigger.
-->
<script lang="ts" module>
	export type DialogVariant = 'standard' | 'fullscreen';
	export type DialogPurpose = 'required' | 'form' | 'info';
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLDialogAttributes } from 'svelte/elements';
	import { cssSize, spacingVar, type SizeValue, type SpacingStep } from '../../types.js';
	import { focusFirst } from '../../internal/focus.js';
	import { setDialogContext } from './context.js';
	import { pushLayer } from '../../internal/layerStack.js';

	interface Props extends Omit<HTMLDialogAttributes, 'open'> {
		isOpen: boolean;
		onOpenChange: (open: boolean) => void;
		width?: SizeValue;
		maxHeight?: SizeValue;
		variant?: DialogVariant;
		purpose?: DialogPurpose;
		padding?: SpacingStep;
		children: Snippet;
	}

	let {
		isOpen,
		onOpenChange,
		width = 400,
		maxHeight = '75dvh',
		variant = 'standard',
		purpose = 'info',
		padding = 4,
		class: className,
		style,
		children,
		...rest
	}: Props = $props();

	const uid = $props.id();
	const titleId = `${uid}-title`;
	setDialogContext({ titleId });

	let dialog: HTMLDialogElement | undefined = $state();
	let hasTitle = $state(false);
	const isFullscreen = $derived(variant === 'fullscreen');

	$effect(() => {
		const el = dialog;
		if (!el || !isOpen) return;
		const opener = el.ownerDocument.activeElement as HTMLElement | null;
		if (!el.open) el.showModal();
		hasTitle = el.querySelector(`#${CSS.escape(titleId)}`) != null;
		focusFirst(el);
		// Lock page scroll behind the modal.
		const root = el.ownerDocument.documentElement;
		const prevOverflow = root.style.overflow;
		root.style.overflow = 'hidden';
		// Register so a popover behind this dialog doesn't take its Escape.
		const layer = pushLayer();
		// A <form method="dialog"> closes the element natively; tell the owner.
		const onClose = () => {
			if (isOpen) onOpenChange(false);
		};
		el.addEventListener('close', onClose);
		return () => {
			el.removeEventListener('close', onClose);
			layer.remove();
			root.style.overflow = prevOverflow;
			if (el.open) el.close();
			if (opener?.isConnected) opener.focus({ preventScroll: true });
		};
	});

	function oncancel(e: Event) {
		// Escape. Keep the element open until the owner flips isOpen.
		e.preventDefault();
		if (purpose !== 'required') onOpenChange(false);
	}

	// A press counts as a backdrop press only if it both starts and ends outside the panel.
	let downOnBackdrop = false;
	function isOutside(e: PointerEvent) {
		if (e.target !== dialog || !dialog) return false;
		const r = dialog.getBoundingClientRect();
		return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
	}
	function onpointerdown(e: PointerEvent) {
		downOnBackdrop = isOutside(e);
	}
	function onpointerup(e: PointerEvent) {
		if (downOnBackdrop && isOutside(e) && purpose === 'info') onOpenChange(false);
		downOnBackdrop = false;
	}
</script>

<dialog
	{...rest}
	bind:this={dialog}
	class={['astryx-dialog', 'dialog', className]}
	class:fullscreen={isFullscreen}
	data-variant={variant}
	aria-labelledby={rest['aria-labelledby'] ?? (rest['aria-label'] == null && hasTitle ? titleId : undefined)}
	style={[
		!isFullscreen && `width: ${cssSize(width)}; max-height: ${cssSize(maxHeight)}`,
		`--_dialog-padding: ${spacingVar(padding)}`,
		style
	]
		.filter(Boolean)
		.join('; ')}
	{oncancel}
	{onpointerdown}
	{onpointerup}
>
	{#if isOpen}
		<div class="inner">{@render children()}</div>
	{/if}
</dialog>

<style>
	@layer astryx-base {
		.dialog {
			position: fixed;
			margin: auto;
			padding: 0;
			border: 0 none;
			background-color: var(--color-background-surface);
			color: var(--color-text-primary);
			--_dialog-radius: var(--radius-container);
			border-radius: var(--_dialog-radius);
			box-shadow: var(--shadow-high);
			max-width: min(100%, calc(100dvw - 2 * var(--spacing-4)));
			height: fit-content;
			overscroll-behavior: contain;
			flex-direction: column;
			font-family: var(--font-family-body);
			font-size: var(--text-body-size);
			line-height: var(--text-body-leading);
			animation: astryx-dialog-enter var(--duration-medium-max) var(--ease-standard) backwards;
		}
		.dialog[open] { display: flex; }
		.dialog::backdrop {
			background-color: var(--color-overlay);
			animation: astryx-dialog-fade var(--duration-medium-max) var(--ease-standard) backwards;
		}
		.fullscreen {
			width: 100dvw;
			height: 100dvh;
			max-width: 100dvw;
			max-height: 100dvh;
			--_dialog-radius: 0px;
			border-radius: 0;
			margin: 0;
			inset: 0;
			animation-name: astryx-dialog-fade;
		}
		.inner {
			display: flex;
			flex-direction: column;
			gap: var(--_dialog-padding);
			flex: 1 1 auto;
			min-height: 0;
			padding: var(--_dialog-padding);
			overflow: auto;
			border-radius: inherit;
		}
		@media (forced-colors: active) {
			.dialog { border: 1px solid CanvasText; }
		}
		@media (prefers-reduced-motion: reduce) {
			.dialog,
			.dialog::backdrop { animation: none; }
		}
	}

	@keyframes astryx-dialog-enter {
		from { opacity: 0; transform: translateY(16px) scale(0.95); }
	}
	@keyframes astryx-dialog-fade {
		from { opacity: 0; }
	}
</style>
