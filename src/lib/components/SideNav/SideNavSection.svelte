<!--
  Port of Astryx `SideNavSection` (packages/core/src/SideNav/SideNavSection.tsx), MIT, Meta Platforms, Inc.
  A labelled group of SideNavItems. The header is visually hidden (but still names the group)
  when `isHeaderHidden` is set or the SideNav is collapsed.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import VisuallyHidden from '../VisuallyHidden/VisuallyHidden.svelte';
	import { getSideNavCollapse } from './context.js';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		title: string;
		subtitle?: string;
		children: Snippet;
		endContent?: Snippet;
		isHeaderHidden?: boolean;
	}

	let { title, subtitle, children, endContent, isHeaderHidden = false, class: className, ...rest }: Props = $props();

	const uid = $props.id();
	const titleId = `${uid}-title`;
	const collapse = getSideNavCollapse();
	const hideHeader = $derived(isHeaderHidden || collapse.isCollapsed);
</script>

{#snippet headerContent()}
	<span class="title-container">
		<span id={titleId} class="title">{title}</span>
		{#if subtitle}<span class="subtitle">{subtitle}</span>{/if}
	</span>
	{#if endContent}<span class="end">{@render endContent()}</span>{/if}
{/snippet}

<div {...rest} class={['astryx-side-nav-section', 'section', className]} role="group" aria-labelledby={titleId}>
	{#if hideHeader}
		<VisuallyHidden as="div">{@render headerContent()}</VisuallyHidden>
	{:else}
		<div class="header">{@render headerContent()}</div>
	{/if}
	<div class="items">{@render children()}</div>
</div>

<style>
	@layer astryx-base {
		.section { display: flex; flex-direction: column; padding-block: var(--spacing-1); }
		.header {
			display: flex;
			align-items: center;
			gap: var(--spacing-2);
			padding-inline: var(--spacing-2);
			padding-block: var(--spacing-1);
			cursor: default;
			user-select: none;
		}
		.title-container { display: flex; flex-direction: column; flex: 1; min-width: 0; }
		.title,
		.subtitle {
			font-size: var(--text-supporting-size);
			line-height: var(--text-supporting-leading);
			color: var(--color-text-secondary);
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
		}
		.title { font-weight: var(--font-weight-semibold); }
		.end { flex-shrink: 0; display: flex; align-items: center; }
		.items { display: flex; flex-direction: column; gap: var(--spacing-0-5); }
	}
</style>
