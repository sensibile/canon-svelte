<!--
  Port of Astryx `AvatarStatusDot` (packages/core/src/Avatar/AvatarStatusDot.tsx), MIT, Meta Platforms, Inc.
  Use inside Avatar's `status` snippet. Sizes itself from the avatar, and its `label` joins the
  avatar's accessible name.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { getAvatarSlotContext } from './context.js';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		variant?: 'success' | 'neutral' | 'error';
		label?: string;
		/** Shown on medium and large avatars instead of the default glyph. */
		icon?: Snippet;
	}

	let { variant = 'success', label, icon, class: className, style, ...rest }: Props = $props();

	const slot = getAvatarSlotContext();
	$effect(() => {
		slot?.setStatusLabel(label);
		return () => slot?.setStatusLabel(undefined);
	});

	const avatarSize = $derived(slot?.size ?? 36);
	const dims = $derived(
		avatarSize <= 36
			? { dot: 10, border: 1, icon: 0, stroke: 1 }
			: avatarSize <= 72
				? { dot: 20, border: 2, icon: 12, stroke: 1.5 }
				: { dot: 32, border: 4, icon: 18, stroke: 2 }
	);
	const showsIcon = $derived(!!icon && dims.icon > 0);
	const glyph = $derived(showsIcon ? undefined : variant === 'neutral' ? 'ring' : variant === 'error' ? 'minus' : undefined);
	const field = $derived(dims.dot - dims.border * 2);
	const MINUS_BAR_SPAN = 0.75;
</script>

<div
	{...rest}
	role={label ? 'img' : undefined}
	aria-label={label || undefined}
	class={['astryx-avatar-status-dot', 'dot', className]}
	data-variant={variant}
	style={[`width: ${dims.dot}px; height: ${dims.dot}px; border-width: ${dims.border}px`, style].filter(Boolean).join('; ')}
>
	{#if showsIcon}
		<span class="icon" aria-hidden="true" style="width: {dims.icon}px; height: {dims.icon}px">{@render icon?.()}</span>
	{/if}
	{#if glyph}
		<svg
			aria-hidden="true"
			viewBox="0 0 {field} {field}"
			width={field}
			height={field}
			fill="none"
			class="astryx-avatar-status-dot-glyph"
			data-shape={glyph}
		>
			{#if glyph === 'ring'}
				<circle cx={field / 2} cy={field / 2} r={(field - dims.stroke) / 2} stroke="currentColor" stroke-width={dims.stroke} />
			{:else}
				<line
					x1={(field * (1 - MINUS_BAR_SPAN)) / 2 + dims.stroke / 2}
					y1={field / 2}
					x2={(field * (1 + MINUS_BAR_SPAN)) / 2 - dims.stroke / 2}
					y2={field / 2}
					stroke="currentColor"
					stroke-width={dims.stroke}
					stroke-linecap="round"
				/>
			{/if}
		</svg>
	{/if}
</div>

<style>
	@layer astryx-base {
		.dot {
			border-radius: var(--radius-full);
			border-style: solid;
			border-color: var(--color-background-surface);
			box-sizing: border-box;
			display: flex;
			align-items: center;
			justify-content: center;
		}
		.dot[data-variant='success'] { background-color: var(--color-success); color: var(--color-on-success); }
		.dot[data-variant='neutral'] { background-color: var(--color-background-surface); color: var(--color-text-secondary); }
		.dot[data-variant='error'] { background-color: var(--color-error); color: var(--color-on-error); }
		.icon { display: flex; align-items: center; justify-content: center; line-height: 0; }
	}
</style>
