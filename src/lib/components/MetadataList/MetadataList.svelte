<!--
  Port of Astryx `MetadataList` (packages/core/src/MetadataList/MetadataList.tsx), MIT, Meta Platforms, Inc.
  A description list of MetadataListItem children. `maxNumOfItems` hides the rest behind
  "Show more" (vertical orientation only).
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { observeChildren } from '../../internal/observeChildren.js';
	import { setMetadataListContext, type MetadataListLabelConfig } from './context.js';

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
		children: Snippet;
		columns?: 'multi' | 'single' | number;
		label?: MetadataListLabelConfig;
		maxNumOfItems?: number;
		orientation?: 'vertical' | 'horizontal';
		title?: string | Snippet;
	}

	let {
		children,
		columns = 'single',
		label,
		maxNumOfItems,
		orientation = 'vertical',
		title,
		class: className,
		...rest
	}: Props = $props();

	const isMulti = $derived(columns === 'multi' || (typeof columns === 'number' && columns > 1));
	const position = $derived(label?.position ?? (isMulti ? 'top' : 'start'));
	const isHorizontal = $derived(orientation === 'horizontal');
	setMetadataListContext({
		get labelPosition() {
			return isHorizontal ? 'top' : position;
		},
		get orientation() {
			return orientation;
		}
	});

	const isSingle = $derived(columns === 'single' || columns === 1);
	const layout = $derived(
		isHorizontal
			? 'horizontal'
			: position === 'top'
				? isSingle
					? 'stacked-single'
					: 'stacked-multi'
				: isSingle
					? 'single'
					: 'multi'
	);
	const template = $derived.by(() => {
		if (isHorizontal) return undefined;
		const stacked = position === 'top';
		if (typeof columns === 'number' && columns > 1) {
			return stacked ? `repeat(${columns}, 1fr)` : `repeat(${columns}, auto minmax(0, 1fr))`;
		}
		if (!stacked && label?.width != null) {
			return `${typeof label.width === 'number' ? `${label.width}px` : label.width} minmax(0, 1fr)`;
		}
		return undefined;
	});

	const contentId = $props.id();
	let dl: HTMLDListElement | undefined = $state();
	let itemCount = $state(0);
	let isShowAll = $state(false);
	const effectiveMax = $derived(isHorizontal ? undefined : maxNumOfItems);
	const isExceedMax = $derived(effectiveMax != null && itemCount > effectiveMax);

	// Items can't be counted from a snippet, so count the rendered ones and hide the extras.
	function applyLimit() {
		if (!dl) return;
		const items = Array.from(dl.querySelectorAll<HTMLElement>(':scope > [data-metadata-item]'));
		itemCount = items.length;
		items.forEach((item, i) => {
			const hide = effectiveMax != null && !isShowAll && i >= effectiveMax;
			item.hidden = hide;
			const value = item.nextElementSibling;
			if (item.tagName === 'DT' && value instanceof HTMLElement && value.tagName === 'DD') value.hidden = hide;
		});
	}
	$effect(() => {
		if (!dl) return;
		void effectiveMax;
		void isShowAll;
		return observeChildren(dl, applyLimit);
	});
</script>

<div
	{...rest}
	class={['astryx-metadata-list', 'root', className]}
	data-columns={String(columns)}
	data-orientation={orientation}
>
	{#if title != null}
		<div class="title">{#if typeof title === 'function'}{@render title()}{:else}{title}{/if}</div>
	{/if}
	<dl bind:this={dl} id={contentId} class="list" data-layout={layout} style:grid-template-columns={template}>
		{@render children()}
	</dl>
	{#if isExceedMax}
		<button
			type="button"
			class="toggle"
			aria-controls={contentId}
			aria-expanded={isShowAll}
			onclick={() => (isShowAll = !isShowAll)}
		>
			{isShowAll ? 'Show less' : 'Show more'}
		</button>
	{/if}
</div>

<style>
	@layer astryx-base {
		.root { display: flex; flex-direction: column; }
		.title { margin-bottom: var(--spacing-3); }
		.list { margin: 0; padding: 0; }
		.list[data-layout='single'] {
			display: grid;
			grid-template-columns: auto minmax(0, 1fr);
			gap: var(--spacing-2) var(--spacing-4);
			align-items: baseline;
		}
		.list[data-layout='stacked-multi'] {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
			gap: var(--spacing-4);
		}
		/* Inline labels: each item is a label track plus a value track, so tracks repeat in pairs and
		   a label never wraps away from its value. The pair is about as wide as a stacked column. */
		.list[data-layout='multi'] {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(80px, max-content) minmax(184px, 1fr));
			gap: var(--spacing-2) var(--spacing-4);
			align-items: baseline;
		}
		.list[data-layout='stacked-single'] { display: grid; grid-template-columns: 1fr; gap: var(--spacing-3); }
		.list[data-layout='horizontal'] { display: flex; flex-direction: row; flex-wrap: wrap; gap: var(--spacing-4); }
		.toggle {
			appearance: none;
			background-color: transparent;
			border: none;
			padding: var(--spacing-2) 0;
			cursor: pointer;
			color: var(--color-text-accent);
			font-size: var(--text-body-size);
			line-height: var(--text-body-leading);
			font-weight: var(--font-weight-medium);
			font-family: inherit;
			text-align: start;
			align-self: flex-start;
		}
		.toggle:focus-visible {
			outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color);
			outline-offset: 2px;
		}
	}
</style>
