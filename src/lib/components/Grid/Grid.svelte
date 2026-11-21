<!--
  Port of Astryx `Grid` (packages/core/src/Grid/Grid.tsx), MIT, Meta Platforms, Inc.
  `columns` is a fixed count, or `{ minWidth, max?, repeat? }` for a responsive auto-fill/fit grid.
-->
<script lang="ts" module>
	import type { SpacingStep } from '../../types.js';
	export type GridAlignment = 'start' | 'center' | 'end' | 'stretch';
	export type GridColumns = number | { minWidth: number; max?: number; repeat?: 'fill' | 'fit' };

	const spacing = (s: SpacingStep) => `var(--spacing-${String(s).replace('.', '-')})`;

	export function gridTemplate(columns: GridColumns | undefined, gap?: SpacingStep, columnGap?: SpacingStep): string {
		if (typeof columns === 'object' && columns != null) {
			const mode = columns.repeat === 'fit' ? 'auto-fit' : 'auto-fill';
			if (columns.max != null && columns.max > 0) {
				const g = columnGap ?? gap;
				const n = columns.max;
				const perColumn = g != null ? `calc((100% - ${n - 1} * ${spacing(g)}) / ${n})` : `calc(100% / ${n})`;
				return `repeat(${mode}, minmax(min(100%, max(${columns.minWidth}px, ${perColumn})), 1fr))`;
			}
			return `repeat(${mode}, minmax(min(100%, ${columns.minWidth}px), 1fr))`;
		}
		if (typeof columns === 'number' && columns > 0) return `repeat(${columns}, 1fr)`;
		return '1fr';
	}
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cssSize, type SizeValue } from '../../types.js';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		columns?: GridColumns;
		width?: SizeValue;
		height?: SizeValue;
		maxWidth?: SizeValue;
		minHeight?: SizeValue;
		gap?: SpacingStep;
		rowGap?: SpacingStep;
		columnGap?: SpacingStep;
		/** Fixed row height in px. */
		rowHeight?: number;
		align?: GridAlignment;
		justify?: GridAlignment;
		children?: Snippet;
	}

	let {
		columns,
		width,
		height,
		maxWidth,
		minHeight,
		gap,
		rowGap,
		columnGap,
		rowHeight,
		align,
		justify,
		children,
		class: className,
		style,
		...rest
	}: Props = $props();

	const inlineStyle = $derived(
		[
			`grid-template-columns: ${gridTemplate(columns, gap, columnGap)}`,
			rowHeight != null && `grid-auto-rows: ${rowHeight}px`,
			gap != null && `gap: ${spacing(gap)}`,
			rowGap != null && `row-gap: ${spacing(rowGap)}`,
			columnGap != null && `column-gap: ${spacing(columnGap)}`,
			align != null && `align-items: ${align}`,
			justify != null && `justify-items: ${justify}`,
			style,
			width != null && `width: ${cssSize(width)}`,
			height != null && `height: ${cssSize(height)}`,
			maxWidth != null && `max-width: ${cssSize(maxWidth)}`,
			minHeight != null && `min-height: ${cssSize(minHeight)}`
		]
			.filter(Boolean)
			.join('; ')
	);
</script>

<div
	{...rest}
	class={['astryx-grid', 'grid', className]}
	data-columns={typeof columns === 'number' ? columns : undefined}
	data-gap={gap}
	data-align={align}
	data-justify={justify}
	style={inlineStyle}
>
	{@render children?.()}
</div>

<style>
	@layer astryx-base {
		.grid { display: grid; }
	}
</style>
