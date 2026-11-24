<!--
  Port of Astryx `TopNavMegaMenuItem` (packages/core/src/TopNav/TopNavMegaMenuItem.tsx), MIT, Meta Platforms, Inc.
  An entry in a TopNavMegaMenu panel: a link (`href`), a button (`onclick`) or static text, with
  an optional icon tile and description. Picking it by keyboard, touch or pen closes the panel
  unless `hasCloseOnSelect` is false.
  Port change: `icon` takes a built-in icon name or an icon component.
  Not yet ported: LinkProvider (`as`), the AppShell drawer layout.
-->
<script lang="ts">
	import Icon, { type IconComponent } from '../Icon/Icon.svelte';
	import type { IconName } from '../Icon/defaultIcons.js';
	import { getTopNavMegaMenuClose, pickCloses } from './context.js';

	interface Props {
		title: string;
		description?: string;
		icon?: IconName | IconComponent;
		href?: string;
		onclick?: () => void;
		hasCloseOnSelect?: boolean;
		class?: string;
		style?: string;
		'data-testid'?: string;
	}

	let {
		title,
		description,
		icon,
		href,
		onclick,
		hasCloseOnSelect = true,
		class: className,
		style,
		'data-testid': testId
	}: Props = $props();

	const closePanel = getTopNavMegaMenuClose();
	const tag = $derived(href ? 'a' : onclick ? 'button' : 'div');
	function handleClick() {
		onclick?.();
		if (hasCloseOnSelect && (href != null || onclick != null) && pickCloses()) closePanel?.();
	}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions (a link or button when it does anything) -->
<svelte:element
	this={tag}
	{href}
	type={tag === 'button' ? 'button' : undefined}
	class={['astryx-top-nav-mega-menu-item', 'item', className]}
	data-testid={testId}
	{style}
	onclick={handleClick}
>
	{#if icon}<div class="icon"><Icon {icon} /></div>{/if}
	<div class="content">
		<span class="title">{title}</span>
		{#if description}<span class="description">{description}</span>{/if}
	</div>
</svelte:element>

<style>
	@layer astryx-base {
		.item {
			display: flex;
			align-items: flex-start;
			gap: var(--spacing-3);
			padding: var(--spacing-3);
			border-radius: var(--radius-element);
			text-decoration: none;
			cursor: pointer;
			transition: background-color var(--duration-fast) var(--ease-standard);
			border: 0 none;
			background-color: transparent;
			color: inherit;
			font-family: inherit;
			text-align: start;
			box-sizing: border-box;
			width: 100%;
			outline: 0 none;
		}
		div.item { cursor: default; }
		@media (hover: hover) {
			.item:is(a, button):hover {
				background-image: linear-gradient(var(--color-overlay-hover), var(--color-overlay-hover));
			}
		}
		.item:is(a, button):active {
			background-image: linear-gradient(var(--color-overlay-pressed), var(--color-overlay-pressed));
		}
		.item:focus-visible {
			outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color);
			outline-offset: var(--focus-outline-offset);
		}
		.icon {
			display: flex;
			align-items: center;
			justify-content: center;
			width: 40px;
			height: 40px;
			border-radius: var(--radius-element);
			background-color: var(--color-neutral);
			flex-shrink: 0;
			color: var(--color-icon-secondary);
		}
		.content { display: flex; flex-direction: column; gap: var(--spacing-1); min-width: 0; }
		.title {
			font-size: var(--text-label-size);
			line-height: var(--text-label-leading);
			font-weight: var(--font-weight-semibold);
			color: var(--color-text-primary);
		}
		.description {
			font-size: var(--text-supporting-size);
			line-height: var(--text-supporting-leading);
			color: var(--color-text-secondary);
		}
	}
</style>
