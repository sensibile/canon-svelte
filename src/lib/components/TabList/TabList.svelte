<!--
  Port of Astryx `TabList` (packages/core/src/TabList/TabList.tsx), MIT, Meta Platforms, Inc.
  A row of Tabs. Without a role it is a <nav> of links/buttons marked with aria-current;
  with role="tablist" it follows the tabs pattern (role=tab, aria-selected, panelId).
  Arrow keys, Home and End move focus between tabs (roving tabindex).
  Not yet ported: overflow scroll arrows and edge fades, TabMenu.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { setTabListContext, type TabListSize } from './context.js';

	interface Props extends Omit<HTMLAttributes<HTMLElement>, 'onchange' | 'role'> {
		value: string;
		onChange: (value: string) => void;
		size?: TabListSize;
		layout?: 'hug' | 'fill';
		hasDivider?: boolean;
		role?: 'tablist';
		children: Snippet;
	}

	let {
		value,
		onChange,
		size = 'md',
		layout = 'hug',
		hasDivider = false,
		role,
		'aria-label': ariaLabel = 'Tabs',
		'aria-labelledby': ariaLabelledby,
		class: className,
		children,
		...rest
	}: Props = $props();

	const isTabList = $derived(role === 'tablist');

	setTabListContext({
		get value() {
			return value;
		},
		get size() {
			return size;
		},
		get layout() {
			return layout;
		},
		get pattern() {
			return isTabList ? 'tabs' : 'nav';
		},
		select: (v: string) => onChange(v)
	});

	function onkeydown(e: KeyboardEvent) {
		const root = e.currentTarget as HTMLElement;
		const stops = Array.from(root.querySelectorAll<HTMLElement>('[data-tab-value]')).filter(
			(el) => el.getAttribute('aria-disabled') !== 'true'
		);
		const i = stops.indexOf(e.target as HTMLElement);
		if (i < 0) return;
		const rtl = getComputedStyle(root).direction === 'rtl';
		let next = -1;
		if (e.key === 'ArrowRight') next = rtl ? i - 1 : i + 1;
		else if (e.key === 'ArrowLeft') next = rtl ? i + 1 : i - 1;
		else if (!isTabList && e.key === 'ArrowDown') next = i + 1;
		else if (!isTabList && e.key === 'ArrowUp') next = i - 1;
		else if (e.key === 'Home') next = 0;
		else if (e.key === 'End') next = stops.length - 1;
		else return;
		e.preventDefault();
		const target = stops[(next + stops.length) % stops.length];
		target.focus();
		target.scrollIntoView({ block: 'nearest', inline: 'nearest' });
	}
</script>

{#snippet strip()}
	<div
		class="astryx-tab-strip strip"
		role={isTabList ? 'tablist' : undefined}
		aria-label={isTabList ? ariaLabel : undefined}
		aria-labelledby={isTabList ? ariaLabelledby : undefined}
	>
		{@render children()}
	</div>
{/snippet}

{#if isTabList}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		{...rest}
		class={['astryx-tab-list', 'nav', className]}
		class:fill={layout === 'fill'}
		class:divider={hasDivider}
		data-size={size}
		{onkeydown}
	>
		{@render strip()}
	</div>
{:else}
	<nav
		{...rest}
		aria-label={ariaLabel}
		aria-labelledby={ariaLabelledby}
		class={['astryx-tab-list', 'nav', className]}
		class:fill={layout === 'fill'}
		class:divider={hasDivider}
		data-size={size}
		{onkeydown}
	>
		{@render strip()}
	</nav>
{/if}

<style>
	@layer astryx-base {
		.nav {
			display: flex;
			align-items: stretch;
			gap: var(--spacing-0-5);
			max-width: 100%;
			min-width: 0;
			position: relative;
		}
		.fill { width: 100%; }
		.divider {
			border-bottom: var(--border-width) solid var(--color-border);
			padding-block-end: var(--spacing-1);
			--_tab-indicator-bottom: calc(-1 * (var(--spacing-1) + var(--border-width)));
		}
		.strip {
			--_tab-strip-bleed: 0px;
			display: flex;
			align-items: stretch;
			gap: inherit;
			flex: 1 1 auto;
			min-width: 0;
			align-self: flex-start;
			overflow-x: auto;
			overflow-y: hidden;
			overscroll-behavior-x: contain;
			scrollbar-width: none;
			/* Room for focus rings and the indicator inside the scroll box. */
			--_block-end-bleed: max(var(--_tab-strip-bleed), calc(-1 * var(--_tab-indicator-bottom, -1px)));
			padding-block: var(--_tab-strip-bleed) var(--_block-end-bleed);
			margin-block: calc(-1 * var(--_tab-strip-bleed)) calc(-1 * var(--_block-end-bleed));
			padding-inline: var(--_tab-strip-bleed);
			margin-inline: calc(-1 * var(--_tab-strip-bleed));
		}
		.strip:has(:focus-visible) {
			--_tab-strip-bleed: calc(var(--focus-outline-width) + var(--focus-outline-offset));
		}
		.strip::-webkit-scrollbar { display: none; }
		.fill .strip { align-self: stretch; }
	}
</style>
