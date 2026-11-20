<!--
  Port of Astryx `Button` (packages/core/src/Button/Button.tsx), MIT, Meta Platforms, Inc.
  Not yet ported: `tooltip` (comes with Tooltip), ButtonGroup/InputGroup integration,
  touch press feedback and hit-area expansion.
-->
<script lang="ts" module>
	export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';
	export type ButtonSize = 'sm' | 'md' | 'lg';
	export type Elevation = 'none' | 'low' | 'med' | 'high';
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes, HTMLButtonAttributes, MouseEventHandler } from 'svelte/elements';
	import Icon, { type IconComponent, type IconSize } from '../Icon/Icon.svelte';
	import type { IconName } from '../Icon/defaultIcons.js';
	import { setIconDefaultSize } from '../Icon/context.js';
	import Spinner from '../Spinner/Spinner.svelte';
	import VisuallyHidden from '../VisuallyHidden/VisuallyHidden.svelte';
	import { cssSize, type SizeValue } from '../../types.js';

	interface Props extends Omit<HTMLButtonAttributes, 'type' | 'disabled'> {
		/** Visible text, and the accessible name when the button is icon-only or loading. */
		label: string;
		variant?: ButtonVariant;
		size?: ButtonSize;
		elevation?: Elevation;
		type?: 'button' | 'submit' | 'reset';
		isDisabled?: boolean;
		isLoading?: boolean;
		/** Keep the button clickable while loading (spinner appears after a short delay). */
		isInterruptible?: boolean;
		/** Async click handler; the button shows a spinner until it settles. */
		clickAction?: (e: MouseEvent) => void | Promise<void>;
		icon?: IconName | IconComponent;
		isIconOnly?: boolean;
		width?: SizeValue;
		/** Content after the label, e.g. a Badge or chevron. */
		endContent?: Snippet;
		/** Render as a link when set (and not disabled). */
		href?: string;
		target?: string;
		rel?: string;
		/** Replaces the visible label; `label` stays the accessible name. */
		children?: Snippet;
	}

	let {
		label,
		variant = 'secondary',
		size = 'md',
		elevation = 'none',
		type = 'button',
		isDisabled = false,
		isLoading = false,
		isInterruptible = false,
		clickAction,
		icon,
		isIconOnly = false,
		width,
		endContent,
		href,
		target,
		rel,
		children,
		class: className,
		style,
		onclick,
		onkeydown,
		...rest
	}: Props = $props();

	const iconSizeByButtonSize: Record<ButtonSize, IconSize> = { sm: 'sm', md: 'sm', lg: 'md' };
	const iconSize = $derived(iconSizeByButtonSize[size]);
	setIconDefaultSize(() => iconSize);

	let isPending = $state(false);
	const isLoadingState = $derived(isLoading || isPending);
	const delaySpinner = $derived(isPending || isInterruptible);
	const isBusyOnlyDisabled = $derived(!isDisabled && isLoadingState && !isInterruptible);
	const inactive = $derived(isDisabled || isBusyOnlyDisabled);
	const renderAsLink = $derived(href != null && !isDisabled);
	const needsAriaLabel = $derived(
		(isIconOnly && label !== '') || (isLoadingState && !isIconOnly) || children != null
	);

	// Live region text is set a frame after mount so a button that mounts loading isn't announced.
	let liveReady = $state(false);
	$effect(() => {
		const f = requestAnimationFrame(() => (liveReady = true));
		return () => cancelAnimationFrame(f);
	});

	async function handleClick(e: MouseEvent) {
		if (inactive || (isPending && !isInterruptible)) {
			e.preventDefault();
			e.stopPropagation();
			return;
		}
		(onclick as MouseEventHandler<HTMLElement> | undefined)?.(e as MouseEvent & { currentTarget: HTMLElement });
		if (clickAction && !e.defaultPrevented) {
			isPending = true;
			try {
				await clickAction(e);
			} finally {
				isPending = false;
			}
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (inactive && (e.key === 'Enter' || e.key === ' ')) {
			e.preventDefault();
			return;
		}
		(onkeydown as ((e: KeyboardEvent) => void) | undefined)?.(e);
	}

	const shared = $derived({
		class: ['astryx-button', 'button', className],
		'data-variant': variant,
		'data-size': size,
		'data-elevation': elevation,
		'aria-label': needsAriaLabel ? label : rest['aria-label'],
		'aria-busy': isLoadingState || undefined,
		'aria-disabled': inactive || undefined,
		style: [width != null && `width: ${cssSize(width)}`, style].filter(Boolean).join('; ') || undefined,
		onclick: handleClick,
		onkeydown: handleKeydown
	});
</script>

{#snippet content()}
	{#if isLoadingState}
		<span class="spinner-overlay" class:delayed={delaySpinner} aria-hidden="true">
			<Spinner size="sm" shade="inherit" />
		</span>
	{/if}
	<span
		class="content"
		class:hidden={isLoadingState && !delaySpinner}
		class:hidden-delayed={isLoadingState && delaySpinner}
		aria-hidden={isLoadingState || undefined}
	>
		{#if icon}
			<span class="icon-wrapper" data-icon-size={iconSize}><Icon {icon} /></span>
		{/if}
		{#if !isIconOnly}
			<span class="label">
				{#if children}{@render children()}{:else}{label}{/if}
			</span>
			{#if endContent}<span class="end">{@render endContent()}</span>{/if}
		{/if}
	</span>
	<VisuallyHidden role="status" aria-live="polite">
		{isLoadingState && liveReady ? 'Loading' : ''}
	</VisuallyHidden>
{/snippet}

{#if renderAsLink}
	<a
		{...rest as HTMLAttributes<HTMLAnchorElement>}
		{...shared}
		{href}
		{target}
		{rel}
		class:icon-only={isIconOnly}
		class:inactive
		class:link={true}
	>
		{@render content()}
	</a>
{:else}
	<button
		{...rest}
		{...shared}
		{type}
		name={isDisabled ? undefined : rest.name}
		class:icon-only={isIconOnly}
		class:inactive
		class:disabled={isDisabled}
	>
		{@render content()}
	</button>
{/if}

<style>
	@layer astryx-base {
		.button {
			--button-focus-offset: var(--focus-outline-offset);
			position: relative;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			gap: var(--spacing-2);
			padding-block: var(--spacing-2);
			padding-inline: var(--spacing-3);
			border: 0 none;
			border-radius: var(--_button-radius, var(--radius-element));
			font-family: inherit;
			font-size: var(--text-label-size);
			line-height: var(--text-label-leading);
			font-weight: var(--font-weight-medium);
			white-space: nowrap;
			min-width: 0;
			max-width: 100%;
			cursor: pointer;
			outline: 0 none;
			outline-offset: 0;
			transform: scale(1);
			transition-property: background-image, background-color, color, opacity, transform;
			transition-duration: var(--duration-fast);
			transition-timing-function: var(--ease-standard);
		}
		.button:focus-visible {
			outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color);
			outline-offset: var(--button-focus-offset);
		}
		.button:not(.inactive):active { background-image: linear-gradient(var(--color-overlay-pressed), var(--color-overlay-pressed)); }
		@media (hover: hover) {
			.button:not(.inactive):hover { background-image: linear-gradient(var(--color-overlay-hover), var(--color-overlay-hover)); }
			.button:not(.inactive):active { background-image: linear-gradient(var(--color-overlay-pressed), var(--color-overlay-pressed)); }
		}
		@media (pointer: coarse) {
			.button:not(.inactive):active { background-image: none; }
		}
		.button:not(.inactive):active:not([aria-expanded='true'][aria-haspopup]) { transform: scale(0.98); }
		@media (pointer: coarse), (prefers-reduced-motion: reduce) {
			.button:not(.inactive):active { transform: scale(1); }
		}
		@media (prefers-reduced-motion: reduce) {
			.button { transition-duration: 0s; }
		}

		.button[data-size='sm'] { height: max(var(--size-element-sm), 1lh); }
		.button[data-size='md'] { height: max(var(--size-element-md), 1lh); }
		.button[data-size='lg'] { height: max(var(--size-element-lg), 1lh); }
		.icon-only[data-size='sm'] { height: var(--size-element-sm); }
		.icon-only[data-size='md'] { height: var(--size-element-md); }
		.icon-only[data-size='lg'] { height: var(--size-element-lg); }
		.icon-only {
			--button-icon-only-aspect: 1 / 1;
			aspect-ratio: var(--button-icon-only-aspect);
			padding-inline: 0;
			padding-block: 0;
			flex-shrink: 0;
			max-width: none;
		}

		.inactive { cursor: default; background-image: none; transform: none; }
		.disabled,
		.link.inactive { opacity: 0.5; }
		.link { text-decoration: none; }

		.button[data-elevation='low'] { box-shadow: var(--shadow-low); }
		.button[data-elevation='med'] { box-shadow: var(--shadow-med); }
		.button[data-elevation='high'] { box-shadow: var(--shadow-high); }

		.button[data-variant='primary'] {
			background-color: var(--color-accent);
			color: var(--color-on-accent);
			--_button-fill: var(--color-accent);
			--_button-on-fill: var(--color-on-accent);
		}
		.button[data-variant='secondary'] { background-color: var(--color-neutral); color: var(--color-text-primary); }
		.button[data-variant='ghost'] { background-color: transparent; color: var(--color-text-primary); }
		.button[data-variant='destructive'] {
			background-color: var(--color-error);
			color: var(--color-on-error);
			--_button-fill: var(--color-error);
			--_button-on-fill: var(--color-on-error);
		}
		.button[data-variant='destructive']:focus-visible { outline-color: var(--color-error); }
		@media (forced-colors: active) {
			.button:not([data-variant='ghost']) { border: 1px solid ButtonText; }
			.button[data-variant='destructive'] { border-color: CanvasText; }
		}

		.content {
			display: flex;
			flex: 1 1 auto;
			align-self: stretch;
			flex-direction: inherit;
			flex-wrap: inherit;
			align-items: inherit;
			justify-content: inherit;
			gap: inherit;
			min-width: 0;
		}
		.hidden { color: transparent; }
		.hidden-delayed { animation: astryx-content-hide 1ms forwards var(--duration-medium-min); }
		.icon-wrapper { display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
		.icon-wrapper[data-icon-size='sm'] { width: 1rem; height: 1rem; }
		.icon-wrapper[data-icon-size='md'] { width: 1.25rem; height: 1.25rem; }
		.label { overflow: hidden; text-overflow: ellipsis; min-width: 0; }
		.end { display: inline-flex; align-items: center; color: inherit; }
		.spinner-overlay { position: absolute; inset: 0; display: grid; place-items: center; }
		.spinner-overlay.delayed { animation: astryx-fade-in var(--duration-fast) backwards var(--duration-medium-min); }
		@media (prefers-reduced-motion: reduce) {
			.hidden-delayed,
			.spinner-overlay.delayed { animation-delay: 0s; }
		}
	}

	@keyframes astryx-content-hide {
		from { color: inherit; }
		to { color: transparent; }
	}
	@keyframes astryx-fade-in {
		from { opacity: 0; }
		to { opacity: 1; }
	}
</style>
