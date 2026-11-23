<!--
  Port of Astryx `TopNavMenu` (packages/core/src/TopNav/TopNavMenu.tsx), MIT, Meta Platforms, Inc.
  A TopNav button that opens a menu of `items` (title, description, icon, href/onclick) on hover
  after `delay` or on click. The menu aligns with the TopNav region it sits in.
  Keyboard: Up/Down (wrapping), Home/End and typeahead move between items; Enter/Space pick;
  Escape closes and returns focus to the button. Picking by keyboard, touch or pen closes the
  menu; a mouse pick leaves a hover-opened menu open unless the page changes. Set
  `hasCloseOnSelect: false` on an item to keep the menu open.
  Port change: item `icon` takes a built-in icon name or an icon component.
  Not yet ported: press-drag-release picking, the AppShell drawer layout, safe-triangle hover.
-->
<script lang="ts" module>
	import type { IconComponent } from '../Icon/Icon.svelte';
	import type { IconName } from '../Icon/defaultIcons.js';

	export interface TopNavMenuItemData {
		title: string;
		description?: string;
		icon?: IconName | IconComponent;
		href?: string;
		onclick?: () => void;
		/** Set false to keep the menu open after this item is picked. */
		hasCloseOnSelect?: boolean;
	}
</script>

<script lang="ts">
	import { untrack } from 'svelte';
	import Icon from '../Icon/Icon.svelte';
	import NavFlyout from '../NavMenu/NavFlyout.svelte';
	import { createMenuHover } from '../../internal/menuHover.svelte.js';
	import { isSafeUrl } from '../../internal/safeUrl.js';
	import { getTopNavSlot, pickCloses } from './context.js';

	interface Props {
		label: string;
		items: TopNavMenuItemData[];
		/** ms before a hover opens the menu. */
		delay?: number;
		/** ms before the menu closes after the pointer leaves. */
		hideDelay?: number;
		class?: string;
		style?: string;
		'data-testid'?: string;
	}

	let { label, items, delay = 150, hideDelay = 200, class: className, style, 'data-testid': testId }: Props = $props();

	const uid = $props.id();
	const menuId = `${uid}-menu`;
	const slot = getTopNavSlot();
	// Read once: a menu's delays are fixed for its lifetime, like Astryx's hook options.
	const hover = createMenuHover({
		isEnabled: () => true,
		showDelay: untrack(() => delay),
		hideDelay: untrack(() => hideDelay)
	});
	$effect(() => () => hover.destroy());
	let trigger: HTMLButtonElement | undefined = $state();
	let list: HTMLDivElement | undefined = $state();

	const menuItems = () => (list ? Array.from(list.querySelectorAll<HTMLElement>('[role="menuitem"]')) : []);
	let typeahead = '';
	let typeaheadTimer: ReturnType<typeof setTimeout> | undefined;
	function onMenuKeydown(e: KeyboardEvent) {
		const all = menuItems();
		const i = all.findIndex((el) => el === document.activeElement || el.contains(document.activeElement));
		if ((e.key === 'Enter' || (e.key === ' ' && typeahead === '')) && i >= 0) {
			e.preventDefault();
			all[i].click();
			return;
		}
		const go = (n: number) => all[(n + all.length) % all.length]?.focus();
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				go(i < 0 ? 0 : i + 1);
				return;
			case 'ArrowUp':
				e.preventDefault();
				go(i < 0 ? all.length - 1 : i - 1);
				return;
			case 'Home':
				e.preventDefault();
				go(0);
				return;
			case 'End':
				e.preventDefault();
				go(all.length - 1);
				return;
		}
		if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
			clearTimeout(typeaheadTimer);
			typeahead += e.key.toLowerCase();
			typeaheadTimer = setTimeout(() => (typeahead = ''), 500);
			const start = i < 0 ? 0 : typeahead.length === 1 ? i + 1 : i;
			for (let k = 0; k < all.length; k++) {
				const item = all[(start + k) % all.length];
				if (item.textContent?.trim().toLowerCase().startsWith(typeahead)) {
					e.preventDefault();
					item.focus();
					break;
				}
			}
		}
	}
	// Roving tabindex: the focused (or first) item is the menu's tab stop.
	function onMenuFocusin(e: FocusEvent) {
		const target = (e.target as HTMLElement).closest<HTMLElement>('[role="menuitem"]');
		if (!target) return;
		for (const el of menuItems()) el.tabIndex = el === target ? 0 : -1;
	}
	function pick(item: TopNavMenuItemData) {
		item.onclick?.();
		if (item.hasCloseOnSelect !== false && pickCloses()) hover.hide();
	}
	$effect(() => () => clearTimeout(typeaheadTimer));
</script>

<button
	bind:this={trigger}
	type="button"
	class={['astryx-top-nav-menu', 'trigger', className]}
	data-open={hover.isOpen || undefined}
	data-testid={testId}
	{style}
	aria-haspopup="true"
	aria-expanded={hover.isOpen}
	aria-controls={hover.isOpen ? menuId : undefined}
	onpointerenter={hover.onTriggerEnter}
	onpointerleave={hover.onTriggerLeave}
	onclick={hover.onTriggerClick}
>
	{label}
	<span class="chevron" class:open={hover.isOpen}><Icon icon="chevronDown" size="sm" color="inherit" /></span>
</button>

<NavFlyout
	open={hover.isOpen}
	anchor={trigger}
	onClose={() => hover.hide()}
	placement="below"
	alignment={slot}
	offset={4}
	autoFocus={hover.openedByClick ? '[role="menuitem"]' : null}
	onpointerenter={hover.onContentEnter}
	onpointerleave={hover.onContentLeave}
>
	<!-- svelte-ignore a11y_interactive_supports_focus -->
	<div
		bind:this={list}
		id={menuId}
		role="menu"
		aria-label={label}
		class="menu"
		onkeydown={onMenuKeydown}
		onfocusin={onMenuFocusin}
	>
		{#each items as item, index (item.title)}
			{@const href = item.href != null && isSafeUrl(item.href) ? item.href : undefined}
			{#if item.href != null}
				<a
					role="menuitem"
					tabindex={index === 0 ? 0 : -1}
					{href}
					draggable={false}
					class="menu-item"
					onclick={() => pick(item)}
				>
					{@render body(item)}
				</a>
			{:else}
				<!-- svelte-ignore a11y_click_events_have_key_events (the menu clicks the focused item on Enter/Space) -->
				<div
					role="menuitem"
					tabindex={index === 0 ? 0 : -1}
					class="menu-item"
					onclick={() => pick(item)}
				>
					{@render body(item)}
				</div>
			{/if}
		{/each}
	</div>
</NavFlyout>

{#snippet body(item: TopNavMenuItemData)}
	<div class="item-icon">{#if item.icon}<Icon icon={item.icon} />{/if}</div>
	<div class="item-content">
		<span class="item-title">{item.title}</span>
		{#if item.description}<span class="item-description">{item.description}</span>{/if}
	</div>
{/snippet}

<style>
	@layer astryx-base {
		.trigger {
			display: inline-flex;
			align-items: center;
			gap: var(--spacing-2);
			padding-block: var(--spacing-1-5);
			padding-inline: var(--spacing-3);
			border-radius: var(--radius-element);
			font-family: inherit;
			font-size: var(--text-label-size);
			line-height: var(--text-label-leading);
			font-weight: var(--font-weight-medium);
			color: var(--color-text-secondary);
			text-decoration: none;
			cursor: pointer;
			transition: background-color var(--duration-fast) var(--ease-standard), color var(--duration-fast) var(--ease-standard);
			background-color: transparent;
			border: 0 none;
			outline: 0 none;
		}
		@media (hover: hover) {
			.trigger:hover { background-color: var(--color-overlay-hover); }
		}
		.trigger:focus-visible,
		.menu-item:focus-visible {
			outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color);
			outline-offset: var(--focus-outline-offset);
		}
		.trigger[data-open] { color: var(--color-text-primary); background-color: var(--color-overlay-hover); }
		.chevron {
			display: inline-flex;
			align-items: center;
			width: 1em;
			height: 1em;
			transition: transform var(--duration-fast) var(--ease-standard);
		}
		.chevron.open { transform: rotate(180deg); }
		.menu {
			user-select: none;
			display: flex;
			flex-direction: column;
			gap: var(--spacing-1);
			min-width: 280px;
			padding: var(--spacing-1);
			box-sizing: border-box;
		}
		.menu-item {
			display: flex;
			align-items: center;
			gap: var(--spacing-3);
			padding: var(--spacing-3);
			border-radius: var(--radius-element);
			text-decoration: none;
			cursor: pointer;
			transition: background-color var(--duration-fast) var(--ease-standard);
			background-color: transparent;
			outline: 0 none;
		}
		@media (hover: hover) {
			.menu-item:hover { background-color: var(--color-overlay-hover); }
		}
		.item-icon {
			display: flex;
			align-items: center;
			justify-content: center;
			width: 40px;
			height: 40px;
			border-radius: var(--radius-element);
			background-color: var(--color-neutral);
			color: var(--color-text-primary);
			flex-shrink: 0;
		}
		.item-content { display: flex; flex-direction: column; gap: var(--spacing-1); min-width: 0; }
		.item-title {
			font-size: var(--text-label-size);
			line-height: var(--text-label-leading);
			font-weight: var(--font-weight-semibold);
			color: var(--color-text-primary);
		}
		.item-description {
			font-size: var(--text-supporting-size);
			line-height: var(--text-supporting-leading);
			color: var(--color-text-secondary);
		}
	}
</style>
