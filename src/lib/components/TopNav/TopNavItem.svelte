<!--
  Port of Astryx `TopNavItem` (packages/core/src/TopNav/TopNavItem.tsx), MIT, Meta Platforms, Inc.
  A TopNav link. With only `onclick` (no `href`) it acts as a button: role="button", focusable,
  Enter activates on key down and Space on key up. `isSelected` marks it aria-current="page".
  A disabled item stays focusable with aria-disabled and ignores activation.
  Port change: `icon` takes a built-in icon name or an icon component; `children` replaces the label.
  Not yet ported: press feedback, LinkProvider (`as`), the AppShell mobile drawer layout.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAnchorAttributes } from 'svelte/elements';
	import Icon, { type IconComponent } from '../Icon/Icon.svelte';
	import type { IconName } from '../Icon/defaultIcons.js';

	interface Props extends Omit<HTMLAnchorAttributes, 'children'> {
		label: string;
		isSelected?: boolean;
		isDisabled?: boolean;
		isIconOnly?: boolean;
		icon?: IconName | IconComponent;
		children?: Snippet;
		size?: 'sm' | 'md' | 'lg';
	}

	let {
		href,
		target,
		onclick,
		onkeydown,
		onkeyup,
		onblur,
		label,
		isSelected = false,
		isDisabled = false,
		isIconOnly = false,
		icon,
		children,
		size = 'md',
		class: className,
		...rest
	}: Props = $props();

	const isAction = $derived(href == null && onclick != null);
	let spacePressed: EventTarget | null = null;

	function handleClick(e: MouseEvent & { currentTarget: EventTarget & HTMLAnchorElement }) {
		if (isDisabled) {
			e.preventDefault();
			return;
		}
		onclick?.(e);
	}
	function handleKeydown(e: KeyboardEvent & { currentTarget: EventTarget & HTMLAnchorElement }) {
		onkeydown?.(e);
		if (!isAction || e.defaultPrevented || e.target !== e.currentTarget) return;
		if (e.key === 'Enter') {
			e.preventDefault();
			if (!isDisabled) e.currentTarget.click();
		} else if (e.key === ' ') {
			e.preventDefault();
			spacePressed = e.currentTarget;
		}
	}
	function handleKeyup(e: KeyboardEvent & { currentTarget: EventTarget & HTMLAnchorElement }) {
		const activate = e.key === ' ' && spacePressed === e.currentTarget;
		if (e.key === ' ') spacePressed = null;
		onkeyup?.(e);
		if (activate && isAction && !isDisabled && !e.defaultPrevented && e.target === e.currentTarget) {
			e.preventDefault();
			e.currentTarget.click();
		}
	}
	function handleBlur(e: FocusEvent & { currentTarget: EventTarget & HTMLAnchorElement }) {
		spacePressed = null;
		onblur?.(e);
	}
</script>

<a
	{...rest}
	href={isDisabled ? undefined : href}
	target={isDisabled ? undefined : target}
	role={isAction ? 'button' : isDisabled ? 'link' : rest.role}
	tabindex={isAction || isDisabled ? 0 : rest.tabindex}
	aria-label={isIconOnly ? label : undefined}
	aria-current={isSelected ? 'page' : undefined}
	aria-disabled={isDisabled || undefined}
	class={['astryx-top-nav-item', 'item', className]}
	data-size={size}
	data-selected={isSelected || undefined}
	data-disabled={isDisabled || undefined}
	data-icon-only={isIconOnly || undefined}
	onclick={handleClick}
	onkeydown={handleKeydown}
	onkeyup={handleKeyup}
	onblur={handleBlur}
>
	{#if icon}<Icon {icon} size="sm" />{/if}
	{#if !isIconOnly}
		{#if children}{@render children()}{:else}{label}{/if}
	{/if}
</a>

<style>
	@layer astryx-base {
		.item {
			display: inline-flex;
			align-items: center;
			gap: var(--spacing-2);
			padding-block: var(--spacing-1-5);
			padding-inline: var(--spacing-3);
			border-radius: var(--radius-element);
			font-size: var(--text-label-size);
			line-height: var(--text-label-leading);
			font-weight: var(--font-weight-medium);
			color: var(--color-text-secondary);
			text-decoration: none;
			cursor: pointer;
			transition: background-color var(--duration-fast) var(--ease-standard), color var(--duration-fast) var(--ease-standard);
			outline: 0 none;
		}
		@media (hover: hover) {
			.item:hover:where(:not([aria-disabled='true'])) {
				background-image: linear-gradient(var(--color-overlay-hover), var(--color-overlay-hover));
			}
		}
		.item:active:where(:not([aria-disabled='true'])) {
			background-image: linear-gradient(var(--color-overlay-pressed), var(--color-overlay-pressed));
		}
		.item:focus-visible {
			outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color);
			outline-offset: var(--focus-outline-offset);
		}
		.item[data-selected] {
			color: var(--color-text-primary);
			font-weight: var(--font-weight-semibold);
			background-color: var(--color-neutral);
			background-image: none;
		}
		.item[data-disabled] { color: var(--color-text-disabled); cursor: default; pointer-events: none; }
		.item[data-icon-only] { padding-inline: var(--spacing-2); }
	}
</style>
