<!--
  Port of Astryx `Card` (packages/core/src/Card/Card.tsx), MIT, Meta Platforms, Inc.
  Padding defaults to the theme's --astryx-card-padding* hooks (spacing-4), like Astryx.
  Not yet ported: Layout container scope (header/footer bleed and corner hand-off to children).
-->
<script lang="ts" module>
	export type CardVariant =
		| 'default'
		| 'transparent'
		| 'muted'
		| 'blue'
		| 'cyan'
		| 'gray'
		| 'green'
		| 'orange'
		| 'pink'
		| 'purple'
		| 'red'
		| 'teal'
		| 'yellow';
	export type Elevation = 'none' | 'low' | 'med' | 'high';
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cssSize, spacingVar, type SizeValue, type SpacingStep } from '../../types.js';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		width?: SizeValue;
		height?: SizeValue;
		maxWidth?: SizeValue;
		minHeight?: SizeValue;
		padding?: SpacingStep;
		variant?: CardVariant;
		elevation?: Elevation;
		children?: Snippet;
	}

	let {
		width,
		height,
		maxWidth,
		minHeight,
		padding,
		variant = 'default',
		elevation = 'none',
		children,
		class: className,
		style,
		...rest
	}: Props = $props();

	const inlineStyle = $derived(
		[
			width != null && `width: ${cssSize(width)}`,
			height != null && `height: ${cssSize(height)}`,
			maxWidth != null && `max-width: ${cssSize(maxWidth)}`,
			minHeight != null && `min-height: ${cssSize(minHeight)}`,
			padding != null && `--_card-padding: ${spacingVar(padding)}`,
			style
		]
			.filter(Boolean)
			.join('; ') || undefined
	);
</script>

<div
	{...rest}
	class={['astryx-card', 'card', className]}
	class:scrollable={height != null && height !== 'auto'}
	data-variant={variant}
	data-elevation={elevation}
	style={inlineStyle}
>
	{@render children?.()}
</div>

<style>
	@layer astryx-base {
		.card {
			--_card-radius: var(--radius-container);
			--_pad: var(--_card-padding, var(--astryx-card-padding, var(--spacing-4)));
			--_pad-inline: var(--_card-padding, var(--astryx-card-padding-inline, var(--_pad)));
			--container-padding-inline-start: var(--_card-padding, var(--astryx-card-padding-inline-start, var(--_pad-inline)));
			--container-padding-inline-end: var(--_card-padding, var(--astryx-card-padding-inline-end, var(--_pad-inline)));
			--container-padding-block-start: var(--_card-padding, var(--astryx-card-padding-block-start, var(--_pad)));
			--container-padding-block-end: var(--_card-padding, var(--astryx-card-padding-block-end, var(--_pad)));
			box-sizing: border-box;
			padding-inline-start: var(--container-padding-inline-start);
			padding-inline-end: var(--container-padding-inline-end);
			padding-block-start: var(--container-padding-block-start);
			padding-block-end: var(--container-padding-block-end);
			border-radius: var(--_card-radius);
			min-width: 0;
			overflow: clip;
			box-shadow: var(--_card-ring, 0 0 transparent), var(--_card-elevation, 0 0 transparent);
		}
		.scrollable { overflow: auto; }

		.card[data-variant='default'] {
			background-color: var(--color-background-card);
			border: var(--border-width) solid var(--color-border);
			padding-inline-start: calc(var(--container-padding-inline-start) - var(--border-width));
			padding-inline-end: calc(var(--container-padding-inline-end) - var(--border-width));
			padding-block-start: calc(var(--container-padding-block-start) - var(--border-width));
			padding-block-end: calc(var(--container-padding-block-end) - var(--border-width));
		}
		.card[data-variant='transparent'] { background-color: transparent; }
		.card[data-variant='muted'] { background-color: var(--color-background-muted); }
		.card[data-variant='blue'] { background-color: var(--color-background-blue); }
		.card[data-variant='cyan'] { background-color: var(--color-background-cyan); }
		.card[data-variant='gray'] { background-color: var(--color-background-gray); }
		.card[data-variant='green'] { background-color: var(--color-background-green); }
		.card[data-variant='orange'] { background-color: var(--color-background-orange); }
		.card[data-variant='pink'] { background-color: var(--color-background-pink); }
		.card[data-variant='purple'] { background-color: var(--color-background-purple); }
		.card[data-variant='red'] { background-color: var(--color-background-red); }
		.card[data-variant='teal'] { background-color: var(--color-background-teal); }
		.card[data-variant='yellow'] { background-color: var(--color-background-yellow); }

		.card[data-elevation='low'] { --_card-elevation: var(--shadow-low); }
		.card[data-elevation='med'] { --_card-elevation: var(--shadow-med); }
		.card[data-elevation='high'] { --_card-elevation: var(--shadow-high); }
	}
</style>
