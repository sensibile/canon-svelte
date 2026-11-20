<!--
  Port of Astryx `Link` (packages/core/src/Link/Link.tsx), MIT, Meta Platforms, Inc.
  Renders <a> with href, a <button> when it only has onclick, and an inert link when disabled.
  Not yet ported: LinkProvider (custom router links).
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import Tooltip from '../Tooltip/Tooltip.svelte';
	import type { HTMLAnchorAttributes } from 'svelte/elements';
	import Text from '../Text/Text.svelte';
	import Icon from '../Icon/Icon.svelte';
	import VisuallyHidden from '../VisuallyHidden/VisuallyHidden.svelte';
	import type { TextColor, TextDisplay, TextSize, TextType, TextWeight } from '../../types.js';

	interface Props extends Omit<HTMLAnchorAttributes, 'type' | 'color'> {
		/** Accessible name, when the visible text isn't enough. */
		label?: string;
		hasUnderline?: boolean;
		isDisabled?: boolean;
		/** Opens in a new tab and shows an external-link icon. */
		isExternalLink?: boolean;
		newTabLabel?: string;
		/** Body-sized text outside running prose. */
		isStandalone?: boolean;
		type?: TextType;
		size?: TextSize;
		weight?: TextWeight;
		color?: TextColor;
		display?: TextDisplay;
		maxLines?: number;
		children: Snippet;
		/** Tooltip text shown on hover and keyboard focus. */
		tooltip?: string;
	}

	let {
		label,
		href,
		hasUnderline = false,
		isDisabled = false,
		isExternalLink = false,
		newTabLabel = '(opens in a new tab)',
		isStandalone = false,
		type = 'body',
		size,
		weight,
		color = 'accent',
		display = 'inline',
		maxLines = 0,
		target: targetProp,
		rel: relProp,
		onclick,
		onkeydown,
		class: className,
		children,
		tooltip,
		...rest
	}: Props = $props();

	const target = $derived(isExternalLink ? '_blank' : targetProp);
	const rel = $derived.by(() => {
		if (target !== '_blank') return relProp ?? undefined;
		const tokens = new Set((relProp ?? '').split(/\s+/).filter(Boolean));
		tokens.add('noopener');
		tokens.add('noreferrer');
		return [...tokens].join(' ');
	});
	const asButton = $derived(href == null && onclick != null && !isDisabled);
	const showExternal = $derived(isExternalLink && !asButton);

	function blockKeys(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			return;
		}
		(onkeydown as ((e: KeyboardEvent) => void) | undefined)?.(e);
	}

	const cls = $derived([
		'astryx-link',
		'link',
		className,
		hasUnderline && 'underline',
		isStandalone && 'standalone',
		isDisabled && 'disabled',
		maxLines > 0 && 'truncating'
	]);
</script>

{#snippet content()}
	<Text class="link-label" {type} {size} {weight} color="inherit" {display} {maxLines}>
		{@render children()}
	</Text>
	{#if showExternal}
		<Icon icon="externalLink" size="xsm" color="inherit" />
		<VisuallyHidden>{newTabLabel}</VisuallyHidden>
	{/if}
{/snippet}

{#snippet element()}
{#if asButton}
	<button
		type="button"
		class={[cls, 'button-reset']}
		data-color={color}
		aria-label={label || undefined}
		onclick={onclick as never}
		onkeydown={onkeydown as never}
		{...rest as Record<string, unknown>}
	>
		{@render content()}
	</button>
{:else if isDisabled}
	<a
		{...rest}
		class={cls}
		data-color={color}
		role="link"
		tabindex="0"
		aria-label={label || undefined}
		aria-disabled="true"
		onkeydown={blockKeys}
	>
		{@render content()}
	</a>
{:else}
	<a
		{...rest}
		{href}
		{target}
		{rel}
		{onclick}
		{onkeydown}
		class={cls}
		data-color={color}
		aria-label={label || undefined}
	>
		{@render content()}
	</a>
{/if}
{/snippet}

{#if tooltip}
	<Tooltip content={tooltip}>{@render element()}</Tooltip>
{:else}
	{@render element()}
{/if}

<style>
	@layer astryx-base {
		.link {
			display: inline-flex;
			max-width: 100%;
			align-items: center;
			gap: var(--spacing-0-5);
			font-family: inherit;
			font-size: inherit;
			line-height: inherit;
			font-weight: inherit;
			text-decoration: none;
			cursor: pointer;
			outline: 0 none;
			transition-property: color, text-decoration;
			transition-duration: var(--duration-fast);
			transition-timing-function: var(--ease-standard);
		}
		.link:focus-visible {
			outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color);
			outline-offset: var(--focus-outline-offset);
		}
		@media (hover: hover) {
			.link:not(.disabled):hover { text-decoration: underline; }
			.link[data-color='primary']:not(.disabled):hover { color: color-mix(in srgb, var(--color-text-primary), var(--color-tint-hover) 15%); }
			.link[data-color='secondary']:not(.disabled):hover { color: color-mix(in srgb, var(--color-text-secondary), var(--color-tint-hover) 15%); }
			.link[data-color='accent']:not(.disabled):hover { color: var(--link-hover-color, color-mix(in srgb, var(--color-text-accent), var(--color-tint-hover) 15%)); }
		}
		.link[data-color='primary'] { color: var(--color-text-primary); }
		.link[data-color='secondary'],
		.link[data-color='placeholder'] { color: var(--color-text-secondary); }
		.link[data-color='disabled'] { color: var(--color-text-disabled); }
		.link[data-color='accent'] { color: var(--color-text-accent); }
		.link[data-color='inherit'] { color: inherit; }

		.button-reset { background-color: transparent; border-style: none; padding: 0; text-align: inherit; position: relative; }
		.underline { text-decoration: underline; }
		.disabled { cursor: default; opacity: 0.5; }
		.standalone { font-size: var(--text-body-size); line-height: var(--text-body-leading); }
		.truncating { min-width: 0; }
		.link :global(.link-label) { min-width: 0; }
	}
</style>
