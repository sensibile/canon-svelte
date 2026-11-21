<!--
  Port of Astryx `RadioIndicator` (packages/core/src/Indicator/RadioIndicator.tsx), MIT, Meta Platforms, Inc.
  The visual circle of a radio. It reacts to hover on the nearest `.astryx-indicator-scope` ancestor.
  Not yet ported: theme indicator overrides.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLSpanElement> {
		state: 'checked' | 'unchecked';
		size?: 'sm' | 'md';
		isDisabled?: boolean;
		children?: Snippet;
	}

	let { state, size = 'md', isDisabled = false, children, class: className, ...rest }: Props = $props();
	const isChecked = $derived(state !== 'unchecked');
</script>

<span
	{...rest}
	aria-hidden="true"
	class={['astryx-radio-indicator', 'circle', className]}
	class:checked={isChecked}
	class:disabled={isDisabled}
	data-size={size}
	data-checked={isChecked ? 'checked' : undefined}
	data-disabled={isDisabled ? 'disabled' : undefined}
>
	{#if children}
		{@render children()}
	{:else if isChecked}
		<span class="astryx-radio-indicator-dot dot" data-size={size}></span>
	{/if}
</span>

<style>
	@layer astryx-base {
		.circle {
			box-sizing: border-box;
			display: flex;
			align-items: center;
			justify-content: center;
			flex-shrink: 0;
			border: var(--border-width) solid var(--color-border-emphasized);
			border-radius: 50%;
			background-color: var(--color-background-surface);
			transition-property: background-color, border-color;
			transition-duration: var(--duration-fast);
			transition-timing-function: var(--ease-standard);
		}
		@media (prefers-reduced-motion: reduce) {
			.circle { transition-duration: 0s; }
		}
		.circle[data-size='sm'] { width: 20px; height: 20px; }
		.circle[data-size='md'] { width: 24px; height: 24px; }
		.checked { border-color: var(--color-accent); background-color: var(--color-accent); }
		@media (hover: hover) {
			:global(.astryx-indicator-scope:hover) .circle:not(.checked):not(.disabled) {
				border-color: color-mix(in srgb, var(--color-border-emphasized), var(--color-tint-hover) 20%);
				background-color: color-mix(in srgb, var(--color-background-surface), var(--color-tint-hover) 5%);
			}
			:global(.astryx-indicator-scope:hover) .checked:not(.disabled) {
				border-color: color-mix(in srgb, var(--color-accent), var(--color-tint-hover) 15%);
				background-color: color-mix(in srgb, var(--color-accent), var(--color-tint-hover) 15%);
			}
		}
		.disabled { opacity: 0.5; border-color: var(--color-border); }
		.disabled:not(.checked) { background-color: var(--color-background-muted); }
		.dot { border-radius: 50%; background-color: var(--color-on-accent); }
		.dot[data-size='sm'] {
			width: calc((100% + 2 * var(--border-width)) * 8 / 20);
			height: calc((100% + 2 * var(--border-width)) * 8 / 20);
		}
		.dot[data-size='md'] {
			width: calc((100% + 2 * var(--border-width)) * 10 / 24);
			height: calc((100% + 2 * var(--border-width)) * 10 / 24);
		}
		@supports (width: round(1px, 1px)) {
			.dot[data-size='sm'] {
				width: round(calc((100% + 2 * var(--border-width)) * 8 / 20), 1px);
				height: round(calc((100% + 2 * var(--border-width)) * 8 / 20), 1px);
			}
			.dot[data-size='md'] {
				width: round(calc((100% + 2 * var(--border-width)) * 10 / 24), 1px);
				height: round(calc((100% + 2 * var(--border-width)) * 10 / 24), 1px);
			}
		}
		@media (forced-colors: active) {
			.dot { background-color: CanvasText; }
		}
	}
</style>
