<!--
  Port of Astryx `SideNavCollapseButton` (packages/core/src/SideNav/SideNavCollapseButton.tsx), MIT, Meta Platforms, Inc.
  A ghost icon-only button that collapses and expands the enclosing SideNav. Pass `collapsible`
  to drive a SideNav from outside it (e.g. from a top bar).
  Renders nothing when the SideNav isn't collapsible.
  Not yet ported: `handleRef` (imperative handle), hiding on AppShell mobile layouts, custom
  icon children.
-->
<script lang="ts">
	import Button from '../Button/Button.svelte';
	import type { ButtonSize } from '../Button/Button.svelte';
	import { getSideNavCollapse, type SideNavControlledCollapsible } from './context.js';

	interface Props {
		/** Drive this button from outside a SideNav. */
		collapsible?: SideNavControlledCollapsible;
		label?: string;
		/** Defaults to sm inside a SideNav footer, md elsewhere. */
		size?: ButtonSize;
		onclick?: (e: MouseEvent) => void;
		class?: string;
		'data-testid'?: string;
	}

	let { collapsible, label, size, onclick, class: className, 'data-testid': testId }: Props = $props();

	const ctx = getSideNavCollapse();
	const isCollapsed = $derived(collapsible ? collapsible.isCollapsed : ctx.isCollapsed);
	const isCollapsible = $derived(collapsible ? true : ctx.isCollapsible);
	const isInSideNav = $derived(collapsible == null);

	function toggle(e: MouseEvent) {
		onclick?.(e);
		if (collapsible) collapsible.onCollapsedChange(!collapsible.isCollapsed);
		else ctx.toggle();
	}
</script>

{#if isCollapsible}
	<Button
		label={label ?? (isCollapsed ? 'Expand sidebar' : 'Collapse sidebar')}
		variant="ghost"
		size={size ?? (isInSideNav ? 'sm' : 'md')}
		icon="chevronLeft"
		isIconOnly
		class={['astryx-side-nav-collapse-button', className].filter(Boolean).join(' ')}
		data-collapsed={isCollapsed || undefined}
		data-side-nav-toggle={isInSideNav || undefined}
		data-testid={testId}
		onclick={toggle}
	/>
{/if}

<style>
	@layer astryx-base {
		:global(.astryx-side-nav-collapse-button .icon-wrapper) {
			transition: transform var(--duration-fast) var(--ease-standard);
		}
		:global(.astryx-side-nav-collapse-button:dir(rtl) .icon-wrapper) {
			transform: scaleX(-1);
		}
		:global(.astryx-side-nav-collapse-button[data-collapsed] .icon-wrapper) {
			transform: rotate(180deg);
		}
		:global(.astryx-side-nav-collapse-button[data-collapsed]:dir(rtl) .icon-wrapper) {
			transform: scaleX(-1) rotate(180deg);
		}
		@media (prefers-reduced-motion: reduce) {
			:global(.astryx-side-nav-collapse-button .icon-wrapper) { transition: none; }
		}
	}
</style>
