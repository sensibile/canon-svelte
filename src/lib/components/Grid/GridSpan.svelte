<!--
  Port of Astryx `GridSpan` (packages/core/src/Grid/GridSpan.tsx), MIT, Meta Platforms, Inc.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		/** Columns to span, or "full" for the whole row. */
		columns?: number | 'full';
		rows?: number;
		children?: Snippet;
	}

	let { columns, rows, children, class: className, style, ...rest }: Props = $props();

	const inlineStyle = $derived(
		[
			style,
			columns != null && `grid-column: ${columns === 'full' ? '1 / -1' : `span ${columns}`}`,
			rows != null && `grid-row: span ${rows}`
		]
			.filter(Boolean)
			.join('; ') || undefined
	);
</script>

<div {...rest} class={['astryx-grid-span', 'span', className]} style={inlineStyle}>
	{@render children?.()}
</div>

<style>
	@layer astryx-base {
		.span { min-width: 0; display: grid; grid-template-columns: minmax(0, 1fr); height: 100%; }
	}
</style>
