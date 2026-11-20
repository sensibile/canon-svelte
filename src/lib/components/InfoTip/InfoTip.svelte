<!--
  Port of Astryx `InfoTip` (packages/core/src/InfoTip/InfoTip.tsx), MIT, Meta Platforms, Inc.
  A small info-icon button that shows a tooltip on hover or focus, and pins it open on click or tap.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon, { type IconSize } from '../Icon/Icon.svelte';
	import Tooltip from '../Tooltip/Tooltip.svelte';

	interface Props {
		content: string | Snippet;
		/** Accessible name of the button. */
		label?: string;
		size?: IconSize;
		class?: string;
	}
	let { content, label = 'More information', size = 'sm', class: className }: Props = $props();

	let shown = $state(false);
	let pinned = $state(false);
	let button: HTMLButtonElement | undefined = $state();

	function onOpenChange(open: boolean) {
		// Hover-out, blur and presses don't close a pinned tip; only Escape, an outside press or a second click do.
		if (!open && pinned) return;
		shown = open;
	}
	function unpin() {
		pinned = false;
		shown = false;
	}
	function onclick(e: MouseEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (pinned) unpin();
		else {
			pinned = true;
			shown = true;
		}
	}

	$effect(() => {
		if (!pinned || !button) return;
		const doc = button.ownerDocument;
		const btn = button;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') unpin();
		};
		const onPointerDown = (e: PointerEvent) => {
			const t = e.target as Element | null;
			if (btn.contains(t) || t?.closest('[role="tooltip"]')) return;
			unpin();
		};
		doc.addEventListener('keydown', onKey);
		doc.addEventListener('pointerdown', onPointerDown, true);
		return () => {
			doc.removeEventListener('keydown', onKey);
			doc.removeEventListener('pointerdown', onPointerDown, true);
		};
	});
</script>

<Tooltip {content} isOpen={shown} {onOpenChange} hasHoverIndication={false}>
	<button
		type="button"
		class={['astryx-info-tip', 'trigger', className]}
		aria-label={label}
		aria-expanded={pinned}
		bind:this={button}
		{onclick}
	>
		<Icon icon="info" {size} />
	</button>
</Tooltip>

<style>
	@layer astryx-base {
		.trigger {
			position: relative;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			vertical-align: middle;
			padding: var(--spacing-0-5);
			margin: 0;
			border: 0 none;
			background-color: transparent;
			border-radius: var(--radius-full);
			cursor: pointer;
			color: var(--color-icon-secondary);
			outline: 0 none;
			transition: color var(--duration-fast) var(--ease-standard);
		}
		.trigger:focus-visible {
			outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color);
			outline-offset: var(--focus-outline-offset);
		}
		@media (hover: hover) {
			.trigger:hover { color: var(--color-icon-primary); }
		}
	}
</style>
