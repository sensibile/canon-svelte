<!--
  Port of Astryx `Thumbnail` (packages/core/src/Thumbnail/Thumbnail.tsx), MIT, Meta Platforms, Inc.
  A 64px image tile, e.g. for an attachment. `onclick` opens it, `onRemove` adds a remove button
  (shown on hover/focus by default). `isLoading` shows a skeleton, or a spinner over an existing image.
-->
<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import Button from '../Button/Button.svelte';
	import Skeleton from '../Skeleton/Skeleton.svelte';
	import Spinner from '../Spinner/Spinner.svelte';
	import Tooltip from '../Tooltip/Tooltip.svelte';
	import VisuallyHidden from '../VisuallyHidden/VisuallyHidden.svelte';

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'onclick'> {
		src?: string;
		/** Describes the image; without it the image is decorative. */
		alt?: string;
		/** File name or caption; shown as a tooltip. */
		label?: string;
		onRemove?: (e: MouseEvent) => void;
		onclick?: (e: MouseEvent) => void;
		isLoading?: boolean;
		isDisabled?: boolean;
		showRemoveOn?: 'always' | 'hover';
	}

	let {
		src,
		alt,
		label,
		onRemove,
		onclick,
		isLoading = false,
		isDisabled = false,
		showRemoveOn = 'hover',
		class: className,
		...rest
	}: Props = $props();

	let erroredSrc = $state<string>();
	const hasSrc = $derived(src != null);
	const hasError = $derived(hasSrc && erroredSrc === src);
	const showSkeleton = $derived(isLoading && !hasSrc);
	const showImage = $derived(hasSrc && !showSkeleton && !hasError);
	const showUploadOverlay = $derived(isLoading && hasSrc);
	const showPlaceholder = $derived((!isLoading && !hasSrc) || hasError);
	const isInteractive = $derived(onclick != null && !isDisabled && !isLoading);
	const isHoverReveal = $derived(onRemove != null && showRemoveOn === 'hover');
	const accessibleName = $derived(label && alt ? `${label} — ${alt}` : (label ?? alt ?? 'Thumbnail'));

	function suppressActivation(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
	}
</script>

{#snippet image()}
	{#if showImage}
		<img
			{src}
			alt={alt ?? ''}
			role={alt ? undefined : 'presentation'}
			aria-hidden={alt ? undefined : true}
			class="image"
			onerror={() => (erroredSrc = src)}
		/>
	{/if}
	{#if showSkeleton}<Skeleton radius={2} />{/if}
	{#if showPlaceholder}
		<div class="placeholder">
			<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
				<path
					d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2M8.5 13.5l2.5 3 3.5-4.5 4.5 6H5l3.5-5.5z"
				/>
			</svg>
		</div>
	{/if}
{/snippet}

{#snippet thumbnail()}
	<div
		{...rest}
		role="group"
		aria-label={accessibleName}
		class={['astryx-thumbnail', 'thumbnail', className]}
		class:disabled={isDisabled}
	>
		<div class="frame" class:interactive={isInteractive} class:reveal={isHoverReveal}>
			{#if onclick}
				<button
					type="button"
					class="open"
					aria-label="Open {accessibleName}"
					aria-disabled={isInteractive ? undefined : 'true'}
					onclick={(e) => {
						if (isInteractive) onclick?.(e);
						else {
							e.preventDefault();
							e.stopPropagation();
						}
					}}
					onkeydown={isInteractive ? undefined : suppressActivation}
				>
					{@render image()}
				</button>
			{:else}
				{@render image()}
			{/if}
			{#if showImage}<div class="inset-border"></div>{/if}
			{#if showUploadOverlay}
				<div class="upload-overlay">
					<Spinner size="sm" shade="onMedia" aria-hidden="true" />
					<VisuallyHidden role="status">Loading</VisuallyHidden>
				</div>
			{/if}
			{#if onRemove}
				<div class="remove-slot">
					<Button
						icon="close"
						label="Remove {accessibleName}"
						variant="secondary"
						size="sm"
						isIconOnly
						class="thumbnail-remove"
						aria-disabled={isDisabled ? 'true' : undefined}
						onkeydown={isDisabled ? suppressActivation : undefined}
						onclick={(e: MouseEvent) => {
							e.stopPropagation();
							if (!isDisabled) onRemove?.(e);
						}}
					/>
				</div>
			{/if}
		</div>
	</div>
{/snippet}

{#if label != null}
	<Tooltip content={label}>{@render thumbnail()}</Tooltip>
{:else}
	{@render thumbnail()}
{/if}

<style>
	@layer astryx-base {
		.thumbnail {
			position: relative;
			display: inline-flex;
			flex-direction: column;
			width: 64px;
			flex-shrink: 0;
			isolation: isolate;
		}
		.disabled { opacity: 0.5; pointer-events: none; }
		.frame {
			position: relative;
			width: 100%;
			aspect-ratio: 1;
			border-radius: var(--radius-element);
			overflow: hidden;
			background-color: var(--color-neutral);
		}
		.frame:focus-within:has(:focus-visible) {
			outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color);
			outline-offset: 2px;
		}
		.image { width: 100%; height: 100%; object-fit: cover; display: block; }
		.inset-border {
			position: absolute;
			inset: 0;
			border-radius: inherit;
			box-shadow: inset 0 0 0 1px var(--color-border);
			pointer-events: none;
		}
		.placeholder {
			display: flex;
			align-items: center;
			justify-content: center;
			width: 100%;
			height: 100%;
			color: var(--color-icon-secondary);
		}
		.open {
			all: unset;
			cursor: pointer;
			display: block;
			width: 100%;
			height: 100%;
			border-radius: var(--radius-element);
			overflow: hidden;
		}
		.open[aria-disabled='true'] { cursor: default; }
		.interactive::after {
			content: '';
			position: absolute;
			inset: 0;
			border-radius: inherit;
			pointer-events: none;
			background-color: var(--_press-overlay, transparent);
			transition: background-color var(--duration-fast) var(--ease-standard);
		}
		@media (hover: hover) {
			.interactive:hover { --_press-overlay: var(--color-overlay-hover); }
		}
		.interactive:active { --_press-overlay: var(--color-overlay-pressed); }
		@media (prefers-reduced-motion: reduce) {
			.interactive::after { transition-duration: 0s; }
		}
		.upload-overlay {
			position: absolute;
			inset: 0;
			display: flex;
			align-items: center;
			justify-content: center;
			background-color: var(--color-overlay);
			border-radius: inherit;
			z-index: 1;
			line-height: 0;
		}
		.remove-slot {
			position: absolute;
			top: var(--spacing-1);
			inset-inline-end: var(--spacing-1);
			z-index: 1;
			line-height: 0;
		}
		/* Hover reveal keeps the button in the layout and tab order. */
		.reveal .remove-slot { opacity: 0; transition: opacity var(--duration-fast) var(--ease-standard); }
		.reveal:is(:hover, :focus-within) .remove-slot { opacity: 1; }
		@media (hover: none) {
			.reveal .remove-slot { opacity: 1; }
		}
		.remove-slot :global(.thumbnail-remove) {
			--_button-radius: calc(var(--radius-element) - var(--spacing-1));
			position: relative;
			height: 20px;
			min-width: 20px;
			background-color: var(--color-overlay);
			color: var(--color-on-dark);
		}
		.remove-slot :global(.thumbnail-remove)::after { content: ''; position: absolute; inset: 0; }
		@media (pointer: coarse) {
			.remove-slot :global(.thumbnail-remove)::after { inset: -2px; }
		}
	}
</style>
