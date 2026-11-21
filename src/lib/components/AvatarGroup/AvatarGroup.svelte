<!--
  Port of Astryx `AvatarGroup` (packages/core/src/AvatarGroup/AvatarGroup.tsx), MIT, Meta Platforms, Inc.
  Overlapping row of Avatars sharing one size and shape. Interactive avatars form one tab stop,
  moved with the arrow keys, Home and End.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import VisuallyHidden from '../VisuallyHidden/VisuallyHidden.svelte';
	import { resolveAvatarSize, setAvatarGroupContext, type AvatarShape, type AvatarSize } from '../Avatar/context.js';
	import { observeChildren } from '../../internal/observeChildren.js';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		size?: AvatarSize;
		shape?: AvatarShape;
		children: Snippet;
	}

	let {
		size = 'md',
		shape = 'circle',
		children,
		class: className,
		style,
		'aria-label': ariaLabel = 'Avatars',
		'aria-describedby': ariaDescribedBy,
		...rest
	}: Props = $props();

	const numericSize = $derived(resolveAvatarSize(size));
	const overlap = $derived(Math.round(numericSize * 0.25));
	setAvatarGroupContext({
		get size() {
			return size;
		},
		get shape() {
			return shape;
		},
		get overlap() {
			return overlap;
		},
		get numericSize() {
			return numericSize;
		}
	});

	let root: HTMLDivElement | undefined = $state();
	let hasItems = $state(false);
	const hintId = $props.id();
	const items = () => Array.from(root?.querySelectorAll<HTMLElement>('[data-avatar-item]') ?? []);

	// Roving tabindex: one item is tabbable, the active one if any, else the first.
	let activeIndex = 0;
	function syncTabStops() {
		const list = items();
		hasItems = list.length > 0;
		if (activeIndex >= list.length) activeIndex = 0;
		list.forEach((el, i) => (el.tabIndex = i === activeIndex ? 0 : -1));
	}
	$effect(() => {
		if (!root) return;
		return observeChildren(root, syncTabStops);
	});

	function onfocusin(e: FocusEvent) {
		const i = items().indexOf(e.target as HTMLElement);
		if (i >= 0) {
			activeIndex = i;
			syncTabStops();
		}
	}
	function onkeydown(e: KeyboardEvent) {
		const list = items();
		const i = list.indexOf(e.target as HTMLElement);
		if (i < 0) return;
		const rtl = getComputedStyle(root!).direction === 'rtl';
		let next = -1;
		if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = rtl && e.key === 'ArrowRight' ? i - 1 : i + 1;
		else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = rtl && e.key === 'ArrowLeft' ? i + 1 : i - 1;
		else if (e.key === 'Home') next = 0;
		else if (e.key === 'End') next = list.length - 1;
		else return;
		e.preventDefault();
		next = Math.max(0, Math.min(list.length - 1, next));
		list[next].focus();
	}
	const describedBy = $derived([ariaDescribedBy, hasItems ? hintId : null].filter(Boolean).join(' ') || undefined);
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	{...rest}
	bind:this={root}
	role="group"
	aria-label={ariaLabel}
	aria-describedby={describedBy}
	class={['astryx-avatar-group', 'group', className]}
	data-size={size}
	data-shape={shape}
	style={[`--_avatar-group-overlap: ${-overlap}px`, style].filter(Boolean).join('; ')}
	{onkeydown}
	{onfocusin}
>
	{@render children()}
	{#if hasItems}<VisuallyHidden id={hintId}>Use arrow keys to move between avatars</VisuallyHidden>{/if}
</div>

<style>
	@layer astryx-base {
		.group {
			display: inline-flex;
			align-items: center;
			padding-inline-start: calc(-1 * var(--_avatar-group-overlap));
		}
		.group:empty { padding-inline-start: 0; }
	}
</style>
