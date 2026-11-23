<!--
  Port of Astryx `NavHeadingMenu` (packages/core/src/NavMenu/NavHeadingMenu.tsx), MIT, Meta Platforms, Inc.
  A vertical menu of NavHeadingMenuItem rows, shown from a SideNavHeading or TopNavHeading `menu`.
  Keyboard: Up/Down (wrapping), Home/End and typeahead move between items, including disabled
  ones; Enter/Space activate the focused item; Escape closes the heading menu.
  Inside a heading popover the wrapper already has role="menu", so this list is role="none".
  Not yet ported: press-drag-release activation (useMenuPress), overflow touch-action switching.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import {
		getNavHeadingCloseContext,
		getNavHeadingMenuHostContext,
		setNavHeadingMenuContext,
		type NavHeadingMenuSize
	} from './context.js';
	import { cssSize, type SizeValue } from '../../types.js';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		children: Snippet;
		size?: NavHeadingMenuSize;
		minWidth?: SizeValue;
	}

	let { children, size = 'md', minWidth, class: className, style, onkeydown, ...rest }: Props = $props();

	const closeCtx = getNavHeadingCloseContext();
	const isInHeadingMenu = getNavHeadingMenuHostContext();
	setNavHeadingMenuContext({
		get size() {
			return size;
		},
		closeMenu: () => closeCtx?.closeMenu()
	});

	let list: HTMLDivElement | undefined = $state();
	const ROW = '[role="menuitem"]';
	const items = () => (list ? Array.from(list.querySelectorAll<HTMLElement>(ROW)) : []);
	const focusedIndex = (all: HTMLElement[]) =>
		all.findIndex((el) => el === document.activeElement || el.contains(document.activeElement));

	let typeahead = '';
	let typeaheadTimer: ReturnType<typeof setTimeout> | undefined;
	function handleKeydown(e: KeyboardEvent & { currentTarget: HTMLDivElement }) {
		onkeydown?.(e);
		if (e.defaultPrevented) return;
		if (e.key === 'Enter' || (e.key === ' ' && typeahead === '')) {
			const focused = document.activeElement as HTMLElement | null;
			if (focused?.getAttribute('role') === 'menuitem' && list?.contains(focused)) {
				e.preventDefault();
				focused.click();
				return;
			}
		}
		const all = items();
		const i = focusedIndex(all);
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
			case 'Escape':
				if (closeCtx) {
					e.preventDefault();
					closeCtx.closeMenu();
				}
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
	$effect(() => () => clearTimeout(typeaheadTimer));
</script>

<!-- svelte-ignore a11y_interactive_supports_focus -->
<div
	{...rest}
	bind:this={list}
	class={['astryx-nav-heading-menu', 'menu', className]}
	data-size={size}
	style:min-width={minWidth != null ? cssSize(minWidth) : undefined}
	{style}
	role={isInHeadingMenu ? 'none' : 'menu'}
	onkeydown={handleKeydown}
>
	{@render children()}
</div>

<style>
	@layer astryx-base {
		.menu {
			display: flex;
			flex-direction: column;
			gap: var(--spacing-0-5);
			outline: none;
		}
		.menu[data-size='sm'] { min-width: 160px; }
		.menu[data-size='md'] { min-width: 200px; }
		.menu[data-size='lg'] { min-width: 240px; }
	}
</style>
