<!--
  Port of Astryx `Breadcrumbs` (packages/core/src/Breadcrumbs/Breadcrumbs.tsx), MIT, Meta Platforms, Inc.
  A navigation trail: a labelled <nav> holding an ordered list of BreadcrumbItem children.
  When no item is marked `isCurrent`, the last item that leaves `isCurrent` unset becomes the current page.
  Port change: `separator` is a string (React accepts any node).
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { setBreadcrumbContext, type BreadcrumbsVariant } from './context.js';

	interface Props extends HTMLAttributes<HTMLElement> {
		children: Snippet;
		separator?: string;
		variant?: BreadcrumbsVariant;
		label?: string;
	}

	let {
		children,
		separator = '/',
		variant = 'default',
		label = 'Breadcrumbs',
		class: className,
		...rest
	}: Props = $props();

	setBreadcrumbContext({
		get variant() {
			return variant;
		},
		get separator() {
			return separator;
		}
	});

	// The last item becomes the current page when nothing is marked current explicitly.
	let list: HTMLOListElement | undefined = $state();
	$effect(() => {
		const ol = list;
		if (!ol) return;
		let marked: HTMLElement | null = null;
		const unmark = () => {
			marked?.removeAttribute('aria-current');
			marked = null;
		};
		const update = () => {
			const items = Array.from(ol.children) as HTMLElement[];
			const last = items.at(-1);
			const target =
				last?.dataset.autoCurrent === 'true'
					? last.querySelector<HTMLElement>('[data-breadcrumb-content]')
					: null;
			const hasExplicit = Array.from(ol.querySelectorAll('[aria-current="page"]')).some((el) => el !== marked);
			if (target === marked && !hasExplicit) return;
			unmark();
			if (target && !hasExplicit) {
				target.setAttribute('aria-current', 'page');
				marked = target;
			}
		};
		// Items swap content or change `isCurrent` (an aria-current or data-auto-current change);
		// the marker's own writes settle on the next pass because `update` is idempotent.
		update();
		const observer = new MutationObserver(update);
		observer.observe(ol, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: ['aria-current', 'data-auto-current']
		});
		return () => {
			observer.disconnect();
			unmark();
		};
	});
</script>

<nav
	aria-label={label}
	class={['astryx-breadcrumbs', className].filter(Boolean).join(' ')}
	data-variant={variant}
	{...rest}
>
	<ol bind:this={list} class="list">{@render children()}</ol>
</nav>

<style>
	@layer astryx-base {
		.astryx-breadcrumbs { display: block; }
		.list {
			display: flex;
			align-items: center;
			flex-wrap: wrap;
			list-style: none;
			margin: 0;
			padding: 0;
			gap: var(--spacing-1);
		}
	}
</style>
