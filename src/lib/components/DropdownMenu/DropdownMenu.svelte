<!--
  Port of Astryx `DropdownMenu` (packages/core/src/DropdownMenu/DropdownMenu.tsx), MIT, Meta Platforms, Inc.
  A button that opens a menu of actions. Pass `items` as data, or compose DropdownMenuItem,
  DropdownMenuGroup and DropdownMenuDivider as children.
  Keyboard: Enter/Space/ArrowDown opens on the first item, ArrowUp on the last; arrows, Home/End and
  typeahead move between items; Escape closes and returns focus to the trigger; Tab closes.
  Not yet ported: submenus, checkbox/radio items, bottom-sheet presentation on touch.
-->
<script lang="ts">
	import { tick, untrack, type Snippet } from 'svelte';
	import Button from '../Button/Button.svelte';
	import Icon from '../Icon/Icon.svelte';
	import Layer from '../Layer/Layer.svelte';
	import DropdownMenuItem from './DropdownMenuItem.svelte';
	import DropdownMenuDivider from './DropdownMenuDivider.svelte';
	import DropdownMenuGroup from './DropdownMenuGroup.svelte';
	import { setDropdownMenuContext } from './context.js';
	import { observeChildren } from '../../internal/observeChildren.js';
	import type { DropdownMenuOption } from './types.js';
	import type { ComponentProps } from 'svelte';
	import type { LayerAlignment, LayerPlacement } from '../../internal/position.js';
	import { cssSize, type SizeValue } from '../../types.js';

	type ButtonProps = ComponentProps<typeof Button>;

	interface Props {
		/** Props for the default trigger Button. */
		button?: Partial<ButtonProps> & { label: string };
		/** A custom trigger; its first button (or [role=button]) opens the menu. */
		trigger?: Snippet;
		items?: DropdownMenuOption[];
		children?: Snippet;
		/** Controlled open state. */
		isMenuOpen?: boolean;
		onOpenChange?: (open: boolean) => void;
		menuWidth?: SizeValue;
		menuMaxHeight?: number;
		hasChevron?: boolean;
		placement?: LayerPlacement;
		alignment?: LayerAlignment;
		header?: Snippet;
		footer?: Snippet;
		class?: string;
	}

	let {
		button,
		trigger: triggerSnippet,
		items,
		children,
		isMenuOpen,
		onOpenChange,
		menuWidth,
		menuMaxHeight,
		hasChevron = true,
		placement = 'below',
		alignment = 'start',
		header,
		footer,
		class: className
	}: Props = $props();

	const uid = $props.id();
	const menuId = `${uid}-menu`;
	let wrapper: HTMLElement | undefined = $state();
	let surface: HTMLDivElement | undefined = $state();
	let menuEl: HTMLDivElement | undefined = $state();
	let internalOpen = $state(false);
	const open = $derived(isMenuOpen ?? internalOpen);
	let triggerEl = $state<HTMLElement | null>(null);
	// Where focus lands when the menu opens: first/last item (keyboard) or the menu itself (pointer).
	let focusOnOpen: 'first' | 'last' | 'menu' = 'menu';

	$effect(() => {
		const root = wrapper;
		if (!root) return;
		return observeChildren(root, () => {
			triggerEl = root.querySelector<HTMLElement>('button, [role="button"]');
		});
	});

	function setOpen(next: boolean, restoreFocus = false) {
		if (untrack(() => open) !== next) {
			internalOpen = next;
			onOpenChange?.(next);
		}
		if (!next && restoreFocus) triggerEl?.focus({ preventScroll: true });
	}
	const closeMenu = () => setOpen(false, true);
	setDropdownMenuContext({ closeMenu });

	const menuItems = () =>
		Array.from(menuEl?.querySelectorAll<HTMLElement>('[role^="menuitem"]') ?? []).filter(
			(el) => el.getAttribute('aria-disabled') !== 'true'
		);

	// Trigger wiring: ARIA state, click toggles, arrow keys open.
	$effect(() => {
		const el = triggerEl;
		if (!el) return;
		const onClick = (e: MouseEvent) => {
			if (el.getAttribute('aria-disabled') === 'true') return;
			focusOnOpen = e.detail === 0 ? 'first' : 'menu';
			setOpen(!untrack(() => open));
		};
		const onKey = (e: KeyboardEvent) => {
			if (el.getAttribute('aria-disabled') === 'true') return;
			if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
				e.preventDefault();
				focusOnOpen = e.key === 'ArrowDown' ? 'first' : 'last';
				if (untrack(() => open)) focusItem(focusOnOpen);
				else setOpen(true);
			} else if (el.tagName !== 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) {
				e.preventDefault();
				focusOnOpen = 'first';
				setOpen(!untrack(() => open));
			}
		};
		el.addEventListener('click', onClick);
		el.addEventListener('keydown', onKey);
		return () => {
			el.removeEventListener('click', onClick);
			el.removeEventListener('keydown', onKey);
		};
	});
	$effect(() => {
		const el = triggerEl;
		if (!el) return;
		el.setAttribute('aria-haspopup', 'menu');
		el.setAttribute('aria-expanded', String(open));
		if (open) el.setAttribute('aria-controls', menuId);
		else el.removeAttribute('aria-controls');
		return () => {
			el.removeAttribute('aria-haspopup');
			el.removeAttribute('aria-expanded');
			el.removeAttribute('aria-controls');
		};
	});

	function focusItem(which: 'first' | 'last' | 'menu') {
		const list = menuItems();
		if (which === 'menu' || list.length === 0) menuEl?.focus({ preventScroll: true });
		else (which === 'first' ? list[0] : list[list.length - 1]).focus({ preventScroll: true });
	}

	$effect(() => {
		const el = surface;
		if (!open || !el) return;
		const doc = el.ownerDocument;
		tick().then(() => focusItem(focusOnOpen));
		const onPointerDown = (e: PointerEvent) => {
			const t = e.target as Node;
			if (el.contains(t) || triggerEl?.contains(t)) return;
			setOpen(false);
		};
		doc.addEventListener('pointerdown', onPointerDown, true);
		return () => doc.removeEventListener('pointerdown', onPointerDown, true);
	});

	let typeahead = '';
	let typeaheadTimer: ReturnType<typeof setTimeout> | undefined;
	function onMenuKeydown(e: KeyboardEvent) {
		const list = menuItems();
		const i = list.indexOf(e.target as HTMLElement);
		const go = (n: number) => list[(n + list.length) % list.length]?.focus({ preventScroll: true });
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				go(i < 0 ? 0 : i + 1);
				return;
			case 'ArrowUp':
				e.preventDefault();
				go(i < 0 ? list.length - 1 : i - 1);
				return;
			case 'Home':
				e.preventDefault();
				go(0);
				return;
			case 'End':
				e.preventDefault();
				go(list.length - 1);
				return;
			case 'Escape':
				e.preventDefault();
				e.stopPropagation();
				setOpen(false, true);
				return;
			case 'Tab':
				setOpen(false);
				return;
		}
		if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
			clearTimeout(typeaheadTimer);
			typeahead += e.key.toLowerCase();
			typeaheadTimer = setTimeout(() => (typeahead = ''), 500);
			const start = i < 0 ? 0 : typeahead.length === 1 ? i + 1 : i;
			for (let k = 0; k < list.length; k++) {
				const item = list[(start + k) % list.length];
				if (item.textContent?.trim().toLowerCase().startsWith(typeahead)) {
					item.focus({ preventScroll: true });
					break;
				}
			}
		}
	}
</script>

{#snippet chevron()}<Icon icon="chevronDown" size="sm" />{/snippet}

<span bind:this={wrapper} class="dropdown-trigger">
	{#if triggerSnippet}
		{@render triggerSnippet()}
	{:else if button}
		<Button {...button} label={button.label} endContent={hasChevron ? chevron : button.endContent} />
	{/if}
</span>

<Layer
	open={open && triggerEl != null}
	anchor={triggerEl}
	{placement}
	{alignment}
	offset={4}
	matchAnchorWidth={menuWidth == null}
	bind:element={surface}
	class={['astryx-dropdown-menu-surface', className].filter(Boolean).join(' ')}
	style={menuWidth != null ? `min-width: ${cssSize(menuWidth)}` : undefined}
>
	{#if header}<div class="region">{@render header()}</div>{/if}
	<div
		bind:this={menuEl}
		id={menuId}
		role="menu"
		tabindex="-1"
		aria-labelledby={triggerEl?.id || undefined}
		aria-label={triggerEl?.id ? undefined : (button?.label ?? undefined)}
		class="astryx-dropdown-menu menu"
		style={menuMaxHeight != null ? `max-height: min(${menuMaxHeight}px, calc(100vh - 16px))` : undefined}
		onkeydown={onMenuKeydown}
	>
		{#if items}
			{#each items as option, i (('id' in option && option.id) || i)}
				{#if 'type' in option && option.type === 'divider'}
					<DropdownMenuDivider />
				{:else if 'type' in option && option.type === 'section'}
					<DropdownMenuGroup title={option.title}>
						{#each option.items as item, j (item.id ?? j)}
							<DropdownMenuItem {...item} />
						{/each}
					</DropdownMenuGroup>
				{:else if !('type' in option)}
					<DropdownMenuItem {...option} />
				{/if}
			{/each}
		{:else}
			{@render children?.()}
		{/if}
	</div>
	{#if footer}<div class="region">{@render footer()}</div>{/if}
</Layer>

<style>
	@layer astryx-base {
		.dropdown-trigger { display: contents; }
		.dropdown-trigger :global([aria-expanded='true']) {
			background-image: linear-gradient(var(--color-overlay-pressed), var(--color-overlay-pressed));
		}
		:global(.astryx-layer.astryx-dropdown-menu-surface) {
			--_dropdown-menu-radius: var(--radius-container);
			--_dropdown-menu-padding: var(--spacing-1);
			display: flex;
			flex-direction: column;
			box-sizing: border-box;
			max-height: calc(100vh - 16px);
			background-color: var(--color-background-popover);
			color: var(--color-text-primary);
			border-radius: var(--_dropdown-menu-radius);
			box-shadow: var(--shadow-low);
		}
		@media (forced-colors: active) {
			:global(.astryx-layer.astryx-dropdown-menu-surface) { border: 1px solid CanvasText; }
		}
		.menu {
			box-sizing: border-box;
			display: flex;
			flex-direction: column;
			gap: var(--spacing-0-5);
			padding: var(--_dropdown-menu-padding);
			outline: none;
			overflow-y: auto;
			overflow-x: hidden;
			overscroll-behavior: contain;
			flex: 1 1 auto;
			min-height: 0;
			-webkit-touch-callout: none;
			user-select: none;
		}
		.region { flex-shrink: 0; padding: var(--spacing-1); }
	}
</style>
