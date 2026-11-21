<!--
  Port of Astryx `DropdownMenuItem` (packages/core/src/DropdownMenu/DropdownMenuItem.tsx), MIT, Meta Platforms, Inc.
  A menu row: a <button>, or an <a> when `href` is set. Closes the menu on select unless told not to.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon, { type IconComponent } from '../Icon/Icon.svelte';
	import type { IconName } from '../Icon/defaultIcons.js';
	import { getDropdownMenuContext } from './context.js';

	interface Props {
		label: string;
		description?: string;
		icon?: IconName | IconComponent;
		onClick?: (e: MouseEvent) => void;
		href?: string;
		target?: '_blank' | '_self';
		rel?: string;
		isDisabled?: boolean;
		variant?: 'default' | 'destructive';
		hasCloseOnSelect?: boolean;
		endContent?: Snippet;
		class?: string;
	}

	let {
		label,
		description,
		icon,
		onClick,
		href,
		target,
		rel,
		isDisabled = false,
		variant = 'default',
		hasCloseOnSelect = true,
		endContent,
		class: className
	}: Props = $props();

	const ctx = getDropdownMenuContext();
	const isDestructive = $derived(variant === 'destructive');

	function onclick(e: MouseEvent) {
		if (isDisabled) {
			e.preventDefault();
			return;
		}
		const modified = href != null && (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1);
		if (!modified) onClick?.(e);
		if (hasCloseOnSelect) ctx?.closeMenu();
	}
	function onpointermove(e: PointerEvent) {
		// Hover moves focus, so keyboard and pointer share one highlighted row.
		if (isDisabled || e.pointerType === 'touch') return;
		const el = e.currentTarget as HTMLElement;
		if (el.ownerDocument.activeElement !== el) el.focus({ preventScroll: true });
	}
	const cls = $derived(['astryx-dropdown-menu-item', 'item', className]);
</script>

{#snippet body()}
	{#if icon}<Icon {icon} size="sm" color={isDestructive ? 'error' : 'secondary'} />{/if}
	<span class="text">
		<span class="label">{label}</span>
		{#if description}<span class="description">{description}</span>{/if}
	</span>
	{#if endContent}<span class="end">{@render endContent()}</span>{/if}
{/snippet}

{#if href != null && !isDisabled}
	<a
		{href}
		{target}
		rel={target === '_blank' ? (rel ?? 'noopener noreferrer') : rel}
		role="menuitem"
		tabindex="-1"
		draggable="false"
		class={cls}
		data-variant={variant}
		{onclick}
		{onpointermove}
		onkeydown={(e) => {
			// Links don't activate on Space natively; menu items should.
			if (e.key === ' ') {
				e.preventDefault();
				(e.currentTarget as HTMLElement).click();
			}
		}}
	>
		{@render body()}
	</a>
{:else}
	<button
		type="button"
		role="menuitem"
		tabindex="-1"
		class={cls}
		data-variant={variant}
		aria-disabled={isDisabled || undefined}
		{onclick}
		{onpointermove}
		onmousedown={(e) => isDisabled && e.preventDefault()}
	>
		{@render body()}
	</button>
{/if}

<style>
	@layer astryx-base {
		.item {
			box-sizing: border-box;
			display: flex;
			align-items: center;
			gap: var(--spacing-2);
			width: 100%;
			padding-block: var(--spacing-1-5);
			padding-inline: var(--spacing-2);
			border: 0 none;
			border-radius: max(0px, calc(var(--_dropdown-menu-radius, var(--spacing-2)) - var(--_dropdown-menu-padding, var(--spacing-1))));
			background-color: transparent;
			font-family: var(--font-family-body);
			font-size: var(--text-label-size);
			line-height: var(--text-label-leading);
			color: var(--color-text-primary);
			text-align: start;
			text-decoration: none;
			cursor: pointer;
			outline-offset: calc(-1 * var(--focus-outline-width));
			-webkit-touch-callout: none;
			user-select: none;
		}
		.item:focus { outline: none; background-color: var(--color-overlay-hover); }
		.item:focus-visible { outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color); }
		@media (hover: hover) {
			.item:active:not([aria-disabled='true']) { background-color: var(--color-overlay-pressed); }
		}
		.item[aria-disabled='true'] { opacity: 0.5; cursor: default; }
		.item[data-variant='destructive'] { color: var(--color-text-error); }
		.text { display: flex; flex-direction: column; flex: 1 1 auto; min-width: 0; }
		.label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
		.description {
			font-size: var(--text-supporting-size);
			line-height: var(--text-supporting-leading);
			color: var(--color-text-secondary);
		}
		.item[data-variant='destructive'] .description { color: var(--color-text-error); }
		.end { display: inline-flex; align-items: center; flex-shrink: 0; color: var(--color-text-secondary); }
	}
</style>
