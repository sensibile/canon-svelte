<!--
  Port of Astryx `Heading` (packages/core/src/Heading/Heading.tsx), MIT, Meta Platforms, Inc.
  Not yet ported: the truncation tooltip (comes with Tooltip).
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import type {
		TextColor,
		TextDisplay,
		TextJustify,
		TextWeight,
		TextWrap,
		WordBreak
	} from '../../types.js';

	export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;
	export type HeadingType = 'display-1' | 'display-2' | 'display-3';

	interface Props extends Omit<HTMLAttributes<HTMLHeadingElement>, 'color'> {
		/** Outline level; picks the h1–h6 tag and the default type scale. */
		level: HeadingLevel;
		/** Use a display type scale instead of the level's heading scale. */
		type?: HeadingType;
		weight?: TextWeight;
		/** aria-level, when the visual and outline level differ. */
		accessibilityLevel?: HeadingLevel;
		color?: TextColor;
		display?: TextDisplay;
		maxLines?: number;
		wordBreak?: WordBreak;
		textWrap?: TextWrap;
		justify?: TextJustify;
		hasCapsize?: boolean;
		hasStrikethrough?: boolean;
		children?: Snippet;
	}

	let {
		level: requestedLevel,
		type,
		weight,
		accessibilityLevel,
		color = 'primary',
		display = 'block',
		maxLines = 0,
		wordBreak,
		textWrap,
		justify = 'start',
		hasCapsize = false,
		hasStrikethrough = false,
		class: className,
		style,
		children,
		...rest
	}: Props = $props();

	const level = $derived.by(() => {
		const v = Number(requestedLevel);
		return (Number.isInteger(v) && v >= 1 && v <= 6 ? v : 2) as HeadingLevel;
	});
	const resolvedWordBreak = $derived(wordBreak ?? (maxLines === 1 ? 'break-all' : 'break-word'));
	const resolvedDisplay = $derived(maxLines > 0 || hasCapsize ? 'block' : display);
	const clampStyle = $derived(maxLines > 1 ? `-webkit-line-clamp: ${maxLines};` : '');
</script>

<svelte:element
	this={`h${level}`}
	class={['astryx-heading', 'heading', className]}
	class:single-line={maxLines === 1}
	class:multi-line={maxLines > 1}
	class:block={maxLines === 0 && resolvedDisplay === 'block'}
	class:inline={maxLines === 0 && resolvedDisplay === 'inline'}
	class:break-all={maxLines > 0 && resolvedWordBreak === 'break-all'}
	class:break-word={maxLines > 0 && resolvedWordBreak === 'break-word'}
	class:capsize={hasCapsize}
	class:strike={hasStrikethrough}
	aria-level={accessibilityLevel && accessibilityLevel !== level ? accessibilityLevel : undefined}
	data-level={level}
	data-type={type}
	data-color={color}
	data-weight={weight}
	data-justify={justify === 'start' ? undefined : justify}
	data-wrap={textWrap}
	style={clampStyle + (style ?? '')}
	{...rest}
>
	{@render children?.()}
</svelte:element>

<style>
	@layer astryx-base {
		.heading { margin: 0; font-family: var(--font-family-heading, var(--font-family-body)); }
		.heading[data-color='primary'] { color: var(--color-text-primary); }
		.heading[data-color='secondary'],
		.heading[data-color='placeholder'] { color: var(--color-text-secondary); }
		.heading[data-color='disabled'] { color: var(--color-text-disabled); }
		.heading[data-color='accent'] { color: var(--color-text-accent); }
		.heading[data-color='inherit'] { color: inherit; }

		.heading[data-level='1'] { font-size: var(--text-heading-1-size); line-height: var(--text-heading-1-leading); font-weight: var(--text-heading-1-weight); }
		.heading[data-level='2'] { font-size: var(--text-heading-2-size); line-height: var(--text-heading-2-leading); font-weight: var(--text-heading-2-weight); }
		.heading[data-level='3'] { font-size: var(--text-heading-3-size); line-height: var(--text-heading-3-leading); font-weight: var(--text-heading-3-weight); }
		.heading[data-level='4'] { font-size: var(--text-heading-4-size); line-height: var(--text-heading-4-leading); font-weight: var(--text-heading-4-weight); }
		.heading[data-level='5'] { font-size: var(--text-heading-5-size); line-height: var(--text-heading-5-leading); font-weight: var(--text-heading-5-weight); }
		.heading[data-level='6'] { font-size: var(--text-heading-6-size); line-height: var(--text-heading-6-leading); font-weight: var(--text-heading-6-weight); }
		.heading[data-type='display-1'] { font-size: var(--text-display-1-size); line-height: var(--text-display-1-leading); font-weight: var(--text-display-1-weight); }
		.heading[data-type='display-2'] { font-size: var(--text-display-2-size); line-height: var(--text-display-2-leading); font-weight: var(--text-display-2-weight); }
		.heading[data-type='display-3'] { font-size: var(--text-display-3-size); line-height: var(--text-display-3-leading); font-weight: var(--text-display-3-weight); }

		.heading[data-weight='normal'] { font-weight: var(--font-weight-normal); }
		.heading[data-weight='medium'] { font-weight: var(--font-weight-medium); }
		.heading[data-weight='semibold'] { font-weight: var(--font-weight-semibold); }
		.heading[data-weight='bold'] { font-weight: var(--font-weight-bold); }

		.inline { display: inline; overflow-wrap: var(--_astryx-text-overflow-wrap, break-word); }
		.block { display: block; overflow-wrap: var(--_astryx-text-overflow-wrap, break-word); }
		.single-line { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
		.multi-line { overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; }
		.break-word { word-break: normal; overflow-wrap: break-word; }
		.break-all { word-break: break-all; }
		.heading[data-wrap='wrap'] { text-wrap: wrap; }
		.heading[data-wrap='nowrap'] { text-wrap: nowrap; }
		.heading[data-wrap='balance'] { text-wrap: balance; }
		.heading[data-wrap='pretty'] { text-wrap: pretty; }
		.heading[data-justify='center'] { text-align: center; }
		.heading[data-justify='end'] { text-align: end; }
		.capsize { text-box-edge: cap alphabetic; text-box-trim: trim-both; display: block; }
		.strike { text-decoration: line-through; }
	}
</style>
