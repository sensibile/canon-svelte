<!--
  Port of Astryx `Section` (packages/core/src/Section/Section.tsx), MIT, Meta Platforms, Inc.
  A full-bleed band inside a padded container: it cancels the parent's container padding and
  applies its own (theme hooks --astryx-section-padding*, default spacing-4).
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { cssSize, spacingVar, type SizeValue, type SpacingStep } from '../../types.js';

	type Side = 'top' | 'bottom' | 'start' | 'end';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		variant?: 'section' | 'transparent' | 'muted';
		width?: SizeValue;
		height?: SizeValue;
		maxWidth?: SizeValue;
		minHeight?: SizeValue;
		dividers?: Side[];
		padding?: SpacingStep;
		paddingInline?: SpacingStep;
		paddingInlineStart?: SpacingStep;
		paddingInlineEnd?: SpacingStep;
		paddingBlock?: SpacingStep;
		paddingBlockStart?: SpacingStep;
		paddingBlockEnd?: SpacingStep;
		children?: Snippet;
	}

	let {
		variant = 'section',
		width,
		height,
		maxWidth,
		minHeight,
		dividers,
		padding,
		paddingInline,
		paddingInlineStart,
		paddingInlineEnd,
		paddingBlock,
		paddingBlockStart,
		paddingBlockEnd,
		children,
		class: className,
		style,
		...rest
	}: Props = $props();

	const v = (s: SpacingStep | undefined) => (s != null ? spacingVar(s) : undefined);
	const outerStyle = $derived(
		[
			width != null && `width: ${cssSize(width)}`,
			height != null && `height: ${cssSize(height)}`,
			maxWidth != null && `max-width: ${cssSize(maxWidth)}`,
			minHeight != null && `min-height: ${cssSize(minHeight)}`,
			style
		]
			.filter(Boolean)
			.join('; ') || undefined
	);
	const innerStyle = $derived(
		[
			['--_section-padding', v(padding)],
			['--_section-pis', v(paddingInlineStart ?? paddingInline)],
			['--_section-pie', v(paddingInlineEnd ?? paddingInline)],
			['--_section-pbs', v(paddingBlockStart ?? paddingBlock)],
			['--_section-pbe', v(paddingBlockEnd ?? paddingBlock)]
		]
			.filter(([, val]) => val != null)
			.map(([k, val]) => `${k}: ${val}`)
			.join('; ') || undefined
	);
</script>

<div {...rest} class={['section-outer', className]} style={outerStyle}>
	<div
		class="astryx-section section"
		data-variant={variant}
		class:divider-top={dividers?.includes('top')}
		class:divider-bottom={dividers?.includes('bottom')}
		class:divider-start={dividers?.includes('start')}
		class:divider-end={dividers?.includes('end')}
		style={innerStyle}
	>
		{@render children?.()}
	</div>
</div>

<style>
	@layer astryx-base {
		.section-outer {
			margin-inline-start: calc(-1 * var(--container-padding-inline-start, 0px));
			margin-inline-end: calc(-1 * var(--container-padding-inline-end, 0px));
		}
		.section-outer:first-child { margin-top: calc(-1 * var(--container-padding-block-start, 0px)); }
		.section-outer:last-child { margin-bottom: calc(-1 * var(--container-padding-block-end, 0px)); }

		.section {
			/* Each Section starts without overrides, so an outer Section's padding props don't leak in;
			   the inline style from this Section's own props wins over these. */
			--_section-padding: initial;
			--_section-pis: initial;
			--_section-pie: initial;
			--_section-pbs: initial;
			--_section-pbe: initial;
			--_pad: var(--_section-padding, var(--astryx-section-padding, var(--spacing-4)));
			--_pad-inline: var(--_section-padding, var(--astryx-section-padding-inline, var(--_pad)));
			--container-padding-inline-start: var(--_section-pis, var(--_section-padding, var(--astryx-section-padding-inline-start, var(--_pad-inline))));
			--container-padding-inline-end: var(--_section-pie, var(--_section-padding, var(--astryx-section-padding-inline-end, var(--_pad-inline))));
			--container-padding-block-start: var(--_section-pbs, var(--_section-padding, var(--astryx-section-padding-block-start, var(--_pad))));
			--container-padding-block-end: var(--_section-pbe, var(--_section-padding, var(--astryx-section-padding-block-end, var(--_pad))));
			box-sizing: border-box;
			height: 100%;
			padding-inline-start: var(--container-padding-inline-start);
			padding-inline-end: var(--container-padding-inline-end);
			padding-block-start: var(--container-padding-block-start);
			padding-block-end: var(--container-padding-block-end);
		}
		.section[data-variant='section'] { background-color: var(--color-background-surface); }
		.section[data-variant='transparent'] { background-color: transparent; }
		.section[data-variant='muted'] { background-color: var(--color-background-muted); }
		.divider-top { border-top: 1px solid var(--color-border); }
		.divider-bottom { border-bottom: 1px solid var(--color-border); }
		.divider-start { border-inline-start: 1px solid var(--color-border); }
		.divider-end { border-inline-end: 1px solid var(--color-border); }
	}
</style>
