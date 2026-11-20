<!--
  Port of Astryx `Stack` (packages/core/src/Stack/Stack.tsx), MIT, Meta Platforms, Inc.
-->
<script lang="ts" module>
	export type StackDirection = 'horizontal' | 'vertical';
	export type StackMainAlignment = 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
	export type StackCrossAlignment = 'start' | 'center' | 'end' | 'stretch';
	export type StackAlignment = StackMainAlignment | StackCrossAlignment;
	export type StackWrap = 'nowrap' | 'wrap' | 'wrap-reverse';
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cssSize, spacingVar, type SizeValue, type SpacingStep } from '../../types.js';

	export interface StackProps extends HTMLAttributes<HTMLElement> {
		direction?: StackDirection;
		/** Horizontal alignment, whatever the direction. */
		hAlign?: StackAlignment;
		/** Vertical alignment, whatever the direction. */
		vAlign?: StackAlignment;
		/** Main-axis alignment (used when hAlign/vAlign are not set). */
		justify?: StackMainAlignment;
		/** Cross-axis alignment (used when hAlign/vAlign are not set). */
		align?: StackCrossAlignment;
		width?: SizeValue;
		height?: SizeValue;
		maxWidth?: SizeValue;
		minHeight?: SizeValue;
		gap?: SpacingStep;
		padding?: SpacingStep;
		paddingInline?: SpacingStep;
		paddingInlineStart?: SpacingStep;
		paddingInlineEnd?: SpacingStep;
		paddingBlock?: SpacingStep;
		paddingBlockStart?: SpacingStep;
		paddingBlockEnd?: SpacingStep;
		isScrollable?: boolean;
		wrap?: StackWrap;
		as?: string;
		children?: Snippet;
	}

	let {
		direction = 'vertical',
		hAlign,
		vAlign,
		justify,
		align,
		gap,
		padding,
		paddingInline,
		paddingInlineStart,
		paddingInlineEnd,
		paddingBlock,
		paddingBlockStart,
		paddingBlockEnd,
		isScrollable = false,
		width,
		height,
		maxWidth,
		minHeight,
		wrap,
		as = 'div',
		class: className,
		style,
		children,
		...rest
	}: StackProps = $props();

	const justifyMap: Record<string, string> = {
		start: 'flex-start',
		center: 'center',
		end: 'flex-end',
		between: 'space-between',
		around: 'space-around',
		evenly: 'space-evenly'
	};
	const alignMap: Record<string, string> = {
		start: 'flex-start',
		center: 'center',
		end: 'flex-end',
		stretch: 'stretch'
	};

	const horizontal = $derived(direction === 'horizontal');
	const resolvedH = $derived(hAlign ?? (horizontal ? justify : align));
	const resolvedV = $derived(vAlign ?? (horizontal ? align : justify));
	const mainAlign = $derived(horizontal ? resolvedH : resolvedV);
	const crossAlign = $derived(horizontal ? resolvedV : resolvedH);

	const inlineStyle = $derived(
		[
			gap != null && `gap: ${spacingVar(gap)}`,
			mainAlign && justifyMap[mainAlign] && `justify-content: ${justifyMap[mainAlign]}`,
			crossAlign && alignMap[crossAlign] && `align-items: ${alignMap[crossAlign]}`,
			wrap && `flex-wrap: ${wrap}`,
			...(
				[
					['padding-inline-start', paddingInlineStart ?? paddingInline ?? padding],
					['padding-inline-end', paddingInlineEnd ?? paddingInline ?? padding],
					['padding-block-start', paddingBlockStart ?? paddingBlock ?? padding],
					['padding-block-end', paddingBlockEnd ?? paddingBlock ?? padding]
				] as const
			).map(([prop, v]) => v != null && `${prop}: ${spacingVar(v)}`),
			width != null && `width: ${cssSize(width)}`,
			height != null && `height: ${cssSize(height)}`,
			maxWidth != null && `max-width: ${cssSize(maxWidth)}`,
			minHeight != null && `min-height: ${cssSize(minHeight)}`,
			style
		]
			.filter(Boolean)
			.join('; ')
	);
</script>

<svelte:element
	this={as}
	class={['astryx-stack', 'stack', className]}
	class:horizontal
	class:scrollable={isScrollable}
	data-direction={direction}
	data-gap={gap}
	data-wrap={wrap}
	style={inlineStyle || undefined}
	{...rest}
>
	{@render children?.()}
</svelte:element>

<style>
	@layer astryx-base {
		.stack { display: flex; flex-direction: column; }
		.horizontal { flex-direction: row; }
		.scrollable { overflow: auto; }
	}
</style>
