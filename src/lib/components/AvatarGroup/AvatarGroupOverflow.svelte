<!--
  Port of Astryx `AvatarGroupOverflow` (packages/core/src/AvatarGroup/AvatarGroupOverflow.tsx),
  MIT, Meta Platforms, Inc. The "+N" chip at the end of an AvatarGroup; a button when `onclick` is set.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { getAvatarGroupContext, resolveAvatarSize } from '../Avatar/context.js';

	interface Props extends Omit<HTMLAttributes<HTMLElement>, 'onclick'> {
		count: number;
		onclick?: () => void;
		children?: Snippet;
	}

	let { count, onclick, children, class: className, style, 'aria-label': ariaLabel, ...rest }: Props = $props();

	const group = getAvatarGroupContext();
	const size = $derived(group?.size ?? 'md');
	const shape = $derived(group?.shape ?? 'circle');
	const px = $derived(group?.numericSize ?? resolveAvatarSize('md'));
	const safeCount = $derived(Math.max(0, count));
	const label = $derived(ariaLabel || `${safeCount.toLocaleString()} more`);
	const inlineStyle = $derived(
		[
			`min-width: ${px + 4}px`,
			`height: ${px + 4}px`,
			`font-size: max(var(--text-supporting-size), ${px * 0.35}px)`,
			`--_avatar-group-overlap: ${-(group?.overlap ?? 0)}px`,
			style
		]
			.filter(Boolean)
			.join('; ')
	);
</script>

{#if onclick}
	<button
		{...rest}
		type="button"
		{onclick}
		aria-label={label}
		data-avatar-item=""
		class={['astryx-avatar-group-overflow', 'overflow', 'button', className]}
		data-size={size}
		data-shape={shape}
		style={inlineStyle}
	>
		{#if children}{@render children()}{:else}+{safeCount}{/if}
	</button>
{:else}
	<span
		{...rest}
		role="img"
		aria-label={label}
		class={['astryx-avatar-group-overflow', 'overflow', className]}
		data-size={size}
		data-shape={shape}
		style={inlineStyle}
	>
		{#if children}{@render children()}{:else}+{safeCount}{/if}
	</span>
{/if}

<style>
	@layer astryx-base {
		.overflow {
			position: relative;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			border-radius: var(--_avatar-radius);
			background-color: var(--color-background-surface);
			background-image: linear-gradient(var(--color-neutral), var(--color-neutral));
			color: var(--color-text-secondary);
			font-family: var(--font-family-body);
			font-weight: var(--font-weight-medium);
			line-height: var(--text-supporting-leading);
			user-select: none;
			border: 2px solid var(--color-background-surface);
			box-sizing: border-box;
			padding-inline: var(--spacing-2);
			margin-inline-start: var(--_avatar-group-overlap);
		}
		.overflow[data-shape='circle'] { --_avatar-radius: var(--radius-full); }
		.overflow[data-shape='rounded'] { --_avatar-radius: var(--radius-element); }
		.overflow[data-shape='square'] { --_avatar-radius: var(--radius-none); }
		.button { cursor: pointer; padding-block: 0; font-size: inherit; }
		@media (hover: hover) {
			.button:hover {
				background-image: linear-gradient(var(--color-overlay-hover), var(--color-overlay-hover)),
					linear-gradient(var(--color-neutral), var(--color-neutral));
			}
		}
		.button:active {
			background-image: linear-gradient(var(--color-overlay-pressed), var(--color-overlay-pressed)),
				linear-gradient(var(--color-neutral), var(--color-neutral));
		}
		.button:focus-visible {
			outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color);
			outline-offset: 2px;
		}
	}
</style>
