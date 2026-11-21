<!--
  Port of Astryx `ClickableCard` (packages/core/src/ClickableCard/ClickableCard.tsx), MIT, Meta Platforms, Inc.
  A Card whose whole surface acts as one link (`href`) or button (`onclick`). A visually hidden
  link/button named by `label` is the real control; clicking elsewhere on the card forwards to it,
  except on nested controls or while selecting text. Middle-click and modifier-clicks open links
  the way the browser would.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import Card, { type CardVariant, type Elevation } from '../Card/Card.svelte';
	import type { SizeValue, SpacingStep } from '../../types.js';

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'onclick'> {
		/** Accessible name of the card's link/button. */
		label: string;
		onclick?: (e: MouseEvent) => void;
		href?: string;
		target?: string;
		isDisabled?: boolean;
		padding?: SpacingStep;
		variant?: CardVariant;
		elevation?: Elevation;
		width?: SizeValue;
		height?: SizeValue;
		maxWidth?: SizeValue;
		children?: Snippet;
	}

	let {
		label,
		onclick,
		href,
		target,
		isDisabled = false,
		padding,
		variant = 'default',
		elevation = 'none',
		width,
		height,
		maxWidth,
		children,
		class: className,
		...rest
	}: Props = $props();

	let control: HTMLElement | undefined = $state();
	const isLink = $derived(href != null);
	const INTERACTIVE = 'a[href], button, input, select, textarea, summary, label, [role="button"], [role="link"], [tabindex]';

	/** True when the press landed on a control inside the card (not the card itself or an ancestor). */
	function isNestedControl(target: EventTarget | null, root: EventTarget | null): boolean {
		if (!(root instanceof Element)) return false;
		for (let el = target instanceof Element ? target : null; el && el !== root; el = el.parentElement) {
			if (el.matches(INTERACTIVE)) return el !== control;
		}
		return false;
	}
	function isSelectingText(): boolean {
		const sel = window.getSelection();
		return sel != null && !sel.isCollapsed && sel.toString().trim() !== '';
	}
	function onContainerClick(e: MouseEvent) {
		if (isDisabled || !control || e.target === control || isNestedControl(e.target, e.currentTarget) || isSelectingText()) return;
		// Re-dispatch on the real control so modifier keys keep their meaning (new tab etc.).
		control.dispatchEvent(
			new MouseEvent('click', {
				bubbles: true,
				cancelable: true,
				ctrlKey: e.ctrlKey,
				metaKey: e.metaKey,
				shiftKey: e.shiftKey,
				altKey: e.altKey,
				button: e.button
			})
		);
	}
	function onAuxClick(e: MouseEvent) {
		if (e.button !== 1 || isDisabled || !isLink || isNestedControl(e.target, e.currentTarget) || !href) return;
		e.preventDefault();
		window.open(href, '_blank', 'noopener');
	}
	function blockDisabled(e: Event) {
		if (e instanceof KeyboardEvent && e.key !== 'Enter' && e.key !== ' ') return;
		e.preventDefault();
		e.stopPropagation();
	}
</script>

<Card
	{...rest}
	{width}
	{height}
	{maxWidth}
	{padding}
	{variant}
	{elevation}
	class={['astryx-clickable-card', 'clickable-card', !isDisabled && 'enabled', isDisabled && 'disabled', className]}
	data-variant={variant}
	onclick={onContainerClick}
	onauxclick={onAuxClick}
>
	{#if isLink}
		<a
			bind:this={control}
			class="sr-only"
			href={isDisabled ? undefined : href}
			target={isDisabled ? undefined : target}
			role={isDisabled ? 'link' : undefined}
			tabindex="0"
			aria-label={label}
			aria-disabled={isDisabled || undefined}
			onclick={isDisabled ? blockDisabled : (e) => onclick?.(e)}
			onkeydown={isDisabled ? blockDisabled : undefined}
		></a>
	{:else}
		<button
			bind:this={control}
			type="button"
			class="sr-only"
			aria-label={label}
			aria-disabled={isDisabled || undefined}
			onclick={(e) => {
				if (isDisabled) e.preventDefault();
				else onclick?.(e);
			}}
			onkeydown={isDisabled ? blockDisabled : undefined}
		></button>
	{/if}
	{@render children?.()}
</Card>

<style>
	@layer astryx-base {
		:global(.clickable-card) {
			position: relative;
			cursor: pointer;
			text-decoration: none;
			color: inherit;
		}
		:global(.clickable-card:not([data-variant='default'])) { border-width: 0; }
		:global(.clickable-card[data-variant='default']) {
			border-color: var(--color-border);
			transition: border-color var(--duration-fast) var(--ease-standard);
		}
		:global(.clickable-card.enabled)::after {
			content: '';
			position: absolute;
			inset: 0;
			pointer-events: none;
			background-color: var(--_press-overlay, transparent);
			transition: background-color var(--duration-fast) var(--ease-standard);
		}
		@media (hover: hover) {
			:global(.clickable-card.enabled:hover) { --_press-overlay: var(--color-overlay-hover); }
			:global(.clickable-card.enabled[data-variant='default']:hover) { border-color: var(--color-border-emphasized); }
		}
		:global(.clickable-card.enabled:active) { --_press-overlay: var(--color-overlay-pressed); }
		@media (prefers-reduced-motion: reduce) {
			:global(.clickable-card),
			:global(.clickable-card.enabled)::after { transition-duration: 0s; }
		}
		:global(.clickable-card.disabled) { cursor: default; opacity: 0.5; }
		:global(.clickable-card:has(> .sr-only:focus-visible)) {
			outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color);
			outline-offset: 2px;
		}
		.sr-only {
			position: absolute;
			width: 1px;
			height: 1px;
			padding: 0;
			margin: -1px;
			overflow: hidden;
			clip: rect(0, 0, 0, 0);
			white-space: nowrap;
			border-width: 0;
		}
	}
</style>
