<!--
  Port of Astryx `NavHeadingMenuItem` (packages/core/src/NavMenu/NavHeadingMenuItem.tsx), MIT, Meta Platforms, Inc.
  A row in a NavHeadingMenu: a link when `href` is set, otherwise a div with role="menuitem".
  Choosing it calls `onclick`, then closes the heading menu. Disabled rows stay focusable.
  Port change: `icon` takes a built-in icon name or an icon component; `label` and
  `description` take a string or a snippet.
  Not yet ported: LinkProvider (custom router links), focus across a link/div swap.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon, { type IconComponent } from '../Icon/Icon.svelte';
	import Text from '../Text/Text.svelte';
	import type { IconName } from '../Icon/defaultIcons.js';
	import { getNavHeadingMenuContext } from './context.js';

	interface Props {
		icon?: IconName | IconComponent;
		label: string | Snippet;
		description?: string | Snippet;
		href?: string;
		onclick?: () => void;
		isDisabled?: boolean;
		class?: string;
		style?: string;
		'data-testid'?: string;
	}

	let {
		icon,
		label,
		description,
		href,
		onclick,
		isDisabled = false,
		class: className,
		style,
		'data-testid': testId
	}: Props = $props();

	const ctx = getNavHeadingMenuContext();
	const size = $derived(ctx?.size ?? 'md');

	function handleClick(e: MouseEvent) {
		if (isDisabled) {
			e.preventDefault();
			return;
		}
		onclick?.();
		ctx?.closeMenu();
	}
	// A disabled row keeps focus where it was when pressed, like Astryx's keepDisabledRowUnfocused.
	function onmousedown(e: MouseEvent) {
		if (isDisabled) e.preventDefault();
	}
</script>

{#snippet body()}
	{#if icon}<Icon {icon} size="sm" color="secondary" />{/if}
	<span class="content">
		{#if typeof label === 'string'}
			<Text type="body" maxLines={1}>{label}</Text>
		{:else}
			{@render label()}
		{/if}
		{#if description}
			{#if typeof description === 'string'}
				<Text type="supporting" maxLines={1}>{description}</Text>
			{:else}
				<Text type="supporting" maxLines={1}>{@render description()}</Text>
			{/if}
		{/if}
	</span>
{/snippet}

{#if href}
	<a
		href={isDisabled ? undefined : href}
		role="menuitem"
		tabindex={-1}
		aria-disabled={isDisabled || undefined}
		draggable={false}
		class={['astryx-nav-heading-menu-item', 'item', className]}
		data-size={size}
		data-testid={testId}
		{style}
		onclick={handleClick}
		{onmousedown}
	>
		{@render body()}
	</a>
{:else}
	<!-- svelte-ignore a11y_click_events_have_key_events (NavHeadingMenu clicks the focused row on Enter/Space) -->
	<div
		role="menuitem"
		tabindex={-1}
		aria-disabled={isDisabled || undefined}
		class={['astryx-nav-heading-menu-item', 'item', className]}
		data-size={size}
		data-testid={testId}
		{style}
		onclick={handleClick}
		{onmousedown}
	>
		{@render body()}
	</div>
{/if}

<style>
	@layer astryx-base {
		.item {
			box-sizing: border-box;
			user-select: none;
			display: flex;
			align-items: center;
			gap: var(--spacing-2);
			width: 100%;
			border-radius: var(--radius-element);
			font-family: var(--font-family-body);
			font-size: var(--text-label-size);
			line-height: var(--text-label-leading);
			color: var(--color-text-primary);
			background-color: transparent;
			border: 0 none;
			cursor: pointer;
			text-align: start;
			outline: none;
			text-decoration: none;
			padding-block: var(--spacing-2);
			padding-inline: var(--spacing-2);
		}
		.item:focus { background-color: var(--color-overlay-hover); }
		@media (hover: hover) {
			.item:hover:where(:not([aria-disabled='true'])) { background-color: var(--color-overlay-hover); }
		}
		.item[data-size='sm'] { padding-block: var(--spacing-1); padding-inline: var(--spacing-2); }
		.item[data-size='lg'] { padding-block: var(--spacing-3); padding-inline: var(--spacing-3); }
		.item[aria-disabled='true'] { opacity: 0.5; cursor: default; }
		.content { display: flex; flex-direction: column; flex: 1; min-width: 0; }
	}
</style>
