<!--
  Port of Astryx `Center` (packages/core/src/Center/Center.tsx), MIT, Meta Platforms, Inc.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cssSize, spacingVar, type SizeValue, type SpacingStep } from '../../types.js';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		axis?: 'both' | 'horizontal' | 'vertical';
		width?: SizeValue;
		height?: SizeValue;
		maxWidth?: SizeValue;
		minHeight?: SizeValue;
		padding?: SpacingStep;
		paddingInline?: SpacingStep;
		paddingInlineStart?: SpacingStep;
		paddingInlineEnd?: SpacingStep;
		paddingBlock?: SpacingStep;
		paddingBlockStart?: SpacingStep;
		paddingBlockEnd?: SpacingStep;
		isInline?: boolean;
		children: Snippet;
	}

	let {
		axis = 'both',
		width,
		height,
		maxWidth,
		minHeight,
		padding,
		paddingInline,
		paddingInlineStart,
		paddingInlineEnd,
		paddingBlock,
		paddingBlockStart,
		paddingBlockEnd,
		isInline = false,
		children,
		class: className,
		style,
		...rest
	}: Props = $props();

	const pad = (name: string, step: SpacingStep | undefined) => (step != null ? `${name}: ${spacingVar(step)}` : null);
	const inlineStyle = $derived(
		[
			width != null && `width: ${cssSize(width)}`,
			height != null && `height: ${cssSize(height)}`,
			maxWidth != null && `max-width: ${cssSize(maxWidth)}`,
			minHeight != null && `min-height: ${cssSize(minHeight)}`,
			pad('padding-inline-start', paddingInlineStart ?? paddingInline ?? padding),
			pad('padding-inline-end', paddingInlineEnd ?? paddingInline ?? padding),
			pad('padding-block-start', paddingBlockStart ?? paddingBlock ?? padding),
			pad('padding-block-end', paddingBlockEnd ?? paddingBlock ?? padding),
			style
		]
			.filter(Boolean)
			.join('; ') || undefined
	);
</script>

<div
	{...rest}
	class={['astryx-center', 'center', className]}
	class:inline={isInline}
	data-axis={axis}
	style={inlineStyle}
>
	{@render children()}
</div>

<style>
	@layer astryx-base {
		.center { display: flex; }
		.inline { display: inline-flex; }
		.center:is([data-axis='both'], [data-axis='vertical']) { align-items: center; }
		.center:is([data-axis='both'], [data-axis='horizontal']) { justify-content: center; }
	}
</style>
