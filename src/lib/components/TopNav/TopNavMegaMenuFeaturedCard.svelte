<!--
  Port of Astryx `TopNavMegaMenuFeaturedCard` (packages/core/src/TopNav/TopNavMegaMenuFeaturedCard.tsx), MIT, Meta Platforms, Inc.
  A promo card for a TopNavMegaMenu's `featured` column: optional image, title, description,
  an optional "label →" link (the arrow mirrors in RTL) and extra children.
  Not yet ported: LinkProvider for the link.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { getTopNavMegaMenuClose, pickCloses } from './context.js';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		title: string;
		description?: string;
		image?: string;
		/** Without it the image is decorative. */
		imageAlt?: string;
		linkLabel?: string;
		linkHref?: string;
		children?: Snippet;
	}

	let { title, description, image, imageAlt, linkLabel, linkHref, children, class: className, ...rest }: Props = $props();

	const closePanel = getTopNavMegaMenuClose();
</script>

<div {...rest} class={['astryx-top-nav-mega-menu-featured-card', 'root', className]}>
	{#if image}
		<img
			src={image}
			alt={imageAlt ?? ''}
			role={imageAlt ? undefined : 'presentation'}
			aria-hidden={imageAlt ? undefined : true}
			class="image"
		/>
	{/if}
	<div class="body">
		<span class="title">{title}</span>
		{#if description}<span class="description">{description}</span>{/if}
		{#if linkLabel && linkHref}
			<a href={linkHref} class="link" onclick={() => pickCloses() && closePanel?.()}>
				{linkLabel} <span class="arrow">→</span>
			</a>
		{/if}
		{@render children?.()}
	</div>
</div>

<style>
	@layer astryx-base {
		.root { display: flex; flex-direction: column; }
		.image { width: 100%; height: 140px; object-fit: cover; display: block; }
		.body { display: flex; flex-direction: column; gap: var(--spacing-2); padding: var(--spacing-4); }
		.title {
			font-size: var(--text-label-size);
			font-weight: var(--font-weight-semibold);
			line-height: var(--text-label-leading);
			color: var(--color-text-primary);
		}
		.description {
			font-size: var(--text-supporting-size);
			line-height: var(--text-supporting-leading);
			color: var(--color-text-secondary);
		}
		.link {
			font-size: var(--text-supporting-size);
			font-weight: var(--font-weight-semibold);
			line-height: var(--text-supporting-leading);
			color: var(--color-text-accent);
			text-decoration: none;
		}
		.link:focus-visible {
			outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color);
			outline-offset: var(--focus-outline-offset);
		}
		.arrow { display: inline-block; }
		.arrow:dir(rtl) { transform: scaleX(-1); }
	}
</style>
