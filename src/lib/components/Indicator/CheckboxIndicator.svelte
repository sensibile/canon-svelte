<!--
  Port of Astryx `CheckboxIndicator` (packages/core/src/Indicator/CheckboxIndicator.tsx), MIT, Meta Platforms, Inc.
  The visual box of a checkbox. It reacts to hover on the nearest `.astryx-indicator-scope` ancestor.
  Not yet ported: theme indicator overrides.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLSpanElement> {
		state: 'checked' | 'unchecked' | 'indeterminate';
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
	class={['astryx-checkbox-indicator', 'box', className]}
	class:checked={isChecked}
	class:disabled={isDisabled}
	data-size={size}
	data-checked={isChecked ? state : undefined}
	data-disabled={isDisabled ? 'disabled' : undefined}
>
	{#if children}
		{@render children()}
	{:else if state === 'checked'}
		<svg viewBox="0 0 10 10" class="astryx-checkbox-indicator-check check">
			<path d="M8.5 2.5L4 7.5L1.5 5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round" />
		</svg>
	{:else if state === 'indeterminate'}
		<span class="astryx-checkbox-indicator-dash dash"></span>
	{/if}
</span>

<style>
	@layer astryx-base {
		.box {
			box-sizing: border-box;
			display: flex;
			align-items: center;
			justify-content: center;
			flex-shrink: 0;
			border: var(--border-width) solid var(--color-border-emphasized);
			border-radius: var(--radius-inner);
			color: var(--color-on-accent);
			background-color: var(--color-background-surface);
			transition-property: background-color, border-color;
			transition-duration: var(--duration-fast);
			transition-timing-function: var(--ease-standard);
		}
		@media (prefers-reduced-motion: reduce) {
			.box { transition-duration: 0s; }
		}
		.box[data-size='sm'] { width: 20px; height: 20px; }
		.box[data-size='md'] { width: 24px; height: 24px; }
		.checked { border-color: var(--color-accent); background-color: var(--color-accent); }
		@media (hover: hover) {
			:global(.astryx-indicator-scope:hover) .box:not(.checked):not(.disabled) {
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
		.box[data-size='sm'] .check { width: calc((100% + 2 * var(--border-width)) * 12 / 20); height: calc((100% + 2 * var(--border-width)) * 12 / 20); }
		.box[data-size='md'] .check { width: calc((100% + 2 * var(--border-width)) * 14 / 24); height: calc((100% + 2 * var(--border-width)) * 14 / 24); }
		.dash { height: 2px; width: calc((100% + 2 * var(--border-width)) / 2); background-color: var(--color-on-accent); border-radius: var(--radius-full); }
		@media (forced-colors: active) {
			.check { color: CanvasText; }
			.dash { background-color: CanvasText; }
		}
	}
</style>
