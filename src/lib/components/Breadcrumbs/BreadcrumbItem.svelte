<!--
  Port of Astryx `BreadcrumbItem` (packages/core/src/Breadcrumbs/BreadcrumbItem.tsx), MIT, Meta Platforms, Inc.
  One step in Breadcrumbs: a link with `href`, a button with `onclick`, plain text otherwise, or a
  trigger for a dropdown `menu` (which takes precedence over `href` and `onclick`). `isCurrent`
  marks the current page; left unset, the last item becomes current.
  Not yet ported: `as` (custom link components), `menuSize`, closing an AppShell mobile drawer on
  activation.
  Port change: `menu` takes DropdownMenu options or a snippet of DropdownMenu children.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLLiAttributes } from 'svelte/elements';
	import Icon from '../Icon/Icon.svelte';
	import DropdownMenu from '../DropdownMenu/DropdownMenu.svelte';
	import type { DropdownMenuOption } from '../DropdownMenu/types.js';
	import { getBreadcrumbContext } from './context.js';

	interface Props extends Omit<HTMLLiAttributes, 'onclick'> {
		children: Snippet;
		href?: string;
		onclick?: (e: MouseEvent) => void;
		isCurrent?: boolean;
		startIcon?: Snippet;
		menu?: DropdownMenuOption[] | Snippet;
	}

	let { children, href, onclick, isCurrent, startIcon, menu, class: className, ...rest }: Props = $props();

	const ctx = getBreadcrumbContext();
	const variant = $derived(ctx.variant);

	$effect(() => {
		if (menu == null) return;
		if (href != null) console.warn('[BreadcrumbItem] `menu` and `href` are mutually exclusive; `menu` takes precedence and `href` is ignored.');
		else if (onclick != null) console.warn('[BreadcrumbItem] `menu` and `onclick` are mutually exclusive; `menu` takes precedence and `onclick` is ignored.');
	});

	const menuItems = $derived(Array.isArray(menu) ? menu : undefined);
	const menuChildren = $derived(typeof menu === 'function' ? (menu as Snippet) : undefined);
</script>

{#snippet content()}
	{#if startIcon}<span class="icon">{@render startIcon()}</span>{/if}
	{@render children()}
{/snippet}

{#snippet menuTrigger()}
	<button
		type="button"
		class="link button-reset"
		data-breadcrumb-content
		aria-current={isCurrent ? 'page' : undefined}
	>
		{@render content()}
		<span class="chevron"><Icon icon="chevronDown" size="xsm" color="inherit" /></span>
	</button>
{/snippet}

<li
	class={['astryx-breadcrumb-item', className].filter(Boolean).join(' ')}
	data-variant={variant}
	data-auto-current={isCurrent == null ? 'true' : undefined}
	data-explicit-current={isCurrent ? 'true' : undefined}
	{...rest}
>
	<span class="separator" aria-hidden="true">
		{#if ctx.separator === '/'}<span class="mirror">/</span>{:else}{ctx.separator}{/if}
	</span>
	{#if menu != null}
		<DropdownMenu trigger={menuTrigger} items={menuItems} menuWidth={160} menuMaxHeight={300}>
			{#if menuChildren}{@render menuChildren()}{/if}
		</DropdownMenu>
	{:else if isCurrent}
		<span class="content current" data-breadcrumb-content aria-current="page">{@render content()}</span>
	{:else if href != null}
		<a class="link" {href} {onclick} data-breadcrumb-content>{@render content()}</a>
	{:else if onclick != null}
		<button type="button" class="link button-reset" {onclick} data-breadcrumb-content>{@render content()}</button>
	{:else}
		<span class="content current" data-breadcrumb-content>{@render content()}</span>
	{/if}
</li>

<style>
	@layer astryx-base {
		.astryx-breadcrumb-item {
			display: flex;
			align-items: center;
			gap: var(--spacing-1);
			margin: 0;
			font-size: var(--text-body-size);
			line-height: var(--text-body-leading);
		}
		.astryx-breadcrumb-item[data-variant='supporting'] {
			font-size: var(--text-supporting-size);
			line-height: var(--text-supporting-leading);
		}
		.content {
			display: flex;
			align-items: center;
			gap: var(--spacing-1);
		}
		.current {
			font-weight: var(--font-weight-semibold);
			color: var(--color-text-primary);
		}
		[data-variant='supporting'] .current { color: var(--color-text-secondary); }
		.link {
			display: flex;
			align-items: center;
			gap: var(--spacing-1);
			padding-block: var(--spacing-1);
			color: var(--color-text-secondary);
			text-decoration: none;
			cursor: pointer;
		}
		.link:is(:disabled, [aria-disabled='true']) { cursor: default; }
		@media (hover: hover) {
			.link:hover:where(:not(:disabled, [aria-disabled='true'])) { text-decoration: underline; }
		}
		.link:focus-visible {
			outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color);
			outline-offset: var(--focus-outline-offset);
		}
		.button-reset {
			background-color: transparent;
			border: 0;
			padding-inline: 0;
			margin: 0;
			font: inherit;
		}
		.icon {
			display: flex;
			align-items: center;
			flex-shrink: 0;
		}
		.chevron {
			display: flex;
			align-items: center;
			flex-shrink: 0;
			width: var(--text-supporting-size);
			height: var(--text-supporting-size);
			font-size: var(--text-supporting-size);
			line-height: var(--text-supporting-leading);
		}
		.separator {
			display: flex;
			align-items: center;
			color: var(--color-text-secondary);
			padding-block: var(--spacing-1);
			user-select: none;
		}
		.astryx-breadcrumb-item:first-child .separator { display: none; }
		.mirror:dir(rtl) { display: inline-block; transform: scaleX(-1); }
	}
</style>
