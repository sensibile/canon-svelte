<!--
  Port of Astryx `Text` (packages/core/src/Text/Text.tsx), MIT, Meta Platforms, Inc.
  Not yet ported: the truncation tooltip (comes with Tooltip). Truncated text gets a native title instead.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import type {
		TextColor,
		TextDisplay,
		TextJustify,
		TextSize,
		TextType,
		TextWeight,
		TextWrap,
		WordBreak
	} from '../../types.js';

	interface Props extends Omit<HTMLAttributes<HTMLElement>, 'color'> {
		type?: TextType;
		size?: TextSize;
		color?: TextColor;
		weight?: TextWeight;
		display?: TextDisplay;
		/** Clamp to this many lines with an ellipsis. 0 = no clamp. */
		maxLines?: number;
		wordBreak?: WordBreak;
		textWrap?: TextWrap;
		justify?: TextJustify;
		hasCapsize?: boolean;
		hasStrikethrough?: boolean;
		hasTabularNumbers?: boolean;
		as?: 'span' | 'p' | 'div' | 'label' | 'h1' | 'h2' | 'h3';
		children?: Snippet;
	}

	const defaultColorByType: Record<TextType, TextColor> = {
		body: 'primary',
		large: 'primary',
		label: 'primary',
		supporting: 'secondary',
		code: 'primary',
		'display-1': 'primary',
		'display-2': 'primary',
		'display-3': 'primary',
		inherit: 'inherit'
	};

	let {
		type = 'body',
		size,
		color,
		weight,
		display = 'inline',
		maxLines = 0,
		wordBreak,
		textWrap,
		justify = 'start',
		hasCapsize = false,
		hasStrikethrough = false,
		hasTabularNumbers = false,
		as = 'span',
		class: className,
		style,
		children,
		...rest
	}: Props = $props();

	const resolvedColor = $derived(color ?? defaultColorByType[type] ?? 'primary');
	const resolvedWordBreak = $derived(wordBreak ?? (maxLines === 1 ? 'break-all' : 'break-word'));
	const resolvedDisplay = $derived(maxLines > 0 || hasCapsize ? 'block' : display);
	const clampStyle = $derived(maxLines > 1 ? `-webkit-line-clamp: ${maxLines};` : '');
</script>

<svelte:element
	this={as}
	class={['astryx-text', 'text', className]}
	class:single-line={maxLines === 1}
	class:multi-line={maxLines > 1}
	class:block={maxLines === 0 && resolvedDisplay === 'block'}
	class:inline={maxLines === 0 && resolvedDisplay === 'inline'}
	class:break-all={maxLines > 0 && resolvedWordBreak === 'break-all'}
	class:break-word={maxLines > 0 && resolvedWordBreak === 'break-word'}
	class:capsize={hasCapsize}
	class:strike={hasStrikethrough}
	class:tabular={hasTabularNumbers}
	data-type={type}
	data-size={size}
	data-color={resolvedColor}
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
		.text[data-color='primary'] { color: var(--color-text-primary); }
		.text[data-color='secondary'],
		.text[data-color='placeholder'] { color: var(--color-text-secondary); }
		.text[data-color='disabled'] { color: var(--color-text-disabled); }
		.text[data-color='accent'] { color: var(--color-text-accent); }
		.text[data-color='inherit'] { color: inherit; }

		.text[data-type='body'] { font-size: var(--text-body-size); line-height: var(--text-body-leading); font-weight: var(--text-body-weight); }
		.text[data-type='large'] { font-size: var(--text-large-size); line-height: var(--text-large-leading); font-weight: var(--text-large-weight); }
		.text[data-type='label'] { font-size: var(--text-label-size); line-height: var(--text-label-leading); font-weight: var(--text-label-weight); }
		.text[data-type='supporting'] { font-size: var(--text-supporting-size); line-height: var(--text-supporting-leading); font-weight: var(--text-supporting-weight); }
		.text[data-type='code'] { font-size: var(--text-code-size); line-height: var(--text-code-leading); font-weight: var(--text-code-weight); font-family: var(--font-family-code); }
		.text[data-type='display-1'] { font-size: var(--text-display-1-size); line-height: var(--text-display-1-leading); font-weight: var(--text-display-1-weight); }
		.text[data-type='display-2'] { font-size: var(--text-display-2-size); line-height: var(--text-display-2-leading); font-weight: var(--text-display-2-weight); }
		.text[data-type='display-3'] { font-size: var(--text-display-3-size); line-height: var(--text-display-3-leading); font-weight: var(--text-display-3-weight); }
		.text[data-type='inherit'] { font-size: inherit; line-height: inherit; font-weight: inherit; }

		.text[data-size='4xs'] { font-size: var(--font-size-4xs); }
		.text[data-size='3xs'] { font-size: var(--font-size-3xs); }
		.text[data-size='2xs'] { font-size: var(--font-size-2xs); }
		.text[data-size='xsm'] { font-size: var(--font-size-xs); }
		.text[data-size='sm'] { font-size: var(--font-size-sm); }
		.text[data-size='base'] { font-size: var(--font-size-base); }
		.text[data-size='lg'] { font-size: var(--font-size-lg); }
		.text[data-size='xl'] { font-size: var(--font-size-xl); }
		.text[data-size='2xl'] { font-size: var(--font-size-2xl); }
		.text[data-size='3xl'] { font-size: var(--font-size-3xl); }
		.text[data-size='4xl'] { font-size: var(--font-size-4xl); }

		.text[data-weight='normal'] { font-weight: var(--font-weight-normal); }
		.text[data-weight='medium'] { font-weight: var(--font-weight-medium); }
		.text[data-weight='semibold'] { font-weight: var(--font-weight-semibold); }
		.text[data-weight='bold'] { font-weight: var(--font-weight-bold); }

		.inline { display: inline; overflow-wrap: var(--_astryx-text-overflow-wrap, break-word); }
		.block { display: block; overflow-wrap: var(--_astryx-text-overflow-wrap, break-word); }
		.single-line { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; }
		.multi-line { overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; }
		.break-word { word-break: normal; overflow-wrap: break-word; }
		.break-all { word-break: break-all; }
		.text[data-wrap='wrap'] { text-wrap: wrap; }
		.text[data-wrap='nowrap'] { text-wrap: nowrap; }
		.text[data-wrap='balance'] { text-wrap: balance; }
		.text[data-wrap='pretty'] { text-wrap: pretty; }
		.text[data-justify='center'] { text-align: center; }
		.text[data-justify='end'] { text-align: end; }
		.capsize { text-box-edge: cap alphabetic; text-box-trim: trim-both; display: block; }
		.strike { text-decoration: line-through; }
		.tabular { font-variant-numeric: tabular-nums; }
	}
</style>
