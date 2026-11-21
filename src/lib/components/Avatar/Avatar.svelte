<!--
  Port of Astryx `Avatar` (packages/core/src/Avatar/Avatar.tsx), MIT, Meta Platforms, Inc.
  Shows `src`, then `fallbackSrc`, then initials from `name`, then a person glyph.
  With `href` it renders a link, with `onclick` a button. Put an AvatarStatusDot in the `status` snippet.
  The tooltip defaults to `name`; pass a string to override it or false to turn it off.
-->
<script lang="ts" module>
	const INITIAL_CHARACTER = /[\p{L}\p{N}\p{Extended_Pictographic}\p{Regional_Indicator}]/u;
	const segmenter = typeof Intl !== 'undefined' && 'Segmenter' in Intl ? new Intl.Segmenter() : null;
	function firstCharacter(text: string): string {
		if (segmenter) return segmenter.segment(text)[Symbol.iterator]().next().value?.segment ?? '';
		return Array.from(text)[0] ?? '';
	}
	function initialCharacter(word: string): string {
		const i = word.search(INITIAL_CHARACTER);
		return i === -1 ? '' : firstCharacter(word.slice(i));
	}
	export function getInitials(name: string): string {
		const initials = name.trim().split(/\s+/).map(initialCharacter).filter(Boolean);
		if (initials.length === 0) return '';
		if (initials.length === 1) return initials[0].toUpperCase();
		return (initials[0] + initials[initials.length - 1]).toUpperCase();
	}
	function cssString(text: string): string {
		return `"${text.replace(/[\\"]/g, (c) => `\\${c}`).replace(/\n/g, '\\a ')}"`;
	}
	const meaningful = (v: unknown) => (typeof v === 'string' && v.trim() !== '' ? v : undefined);
	const CIRCLE_EDGE_OFFSET_RATIO = (1 - 1 / Math.SQRT2) / 2;
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import Tooltip from '../Tooltip/Tooltip.svelte';
	import {
		getAvatarGroupContext,
		resolveAvatarSize,
		setAvatarSlotContext,
		type AvatarShape,
		type AvatarSize
	} from './context.js';

	interface Props extends HTMLAttributes<HTMLElement> {
		alt?: string;
		name?: string;
		src?: string;
		fallbackSrc?: string;
		size?: AvatarSize;
		shape?: AvatarShape;
		/** Status slot, usually an AvatarStatusDot; its label joins the accessible name. */
		status?: Snippet;
		tooltip?: string | boolean;
		href?: string;
		target?: string;
		rel?: string;
		onclick?: (e: MouseEvent) => void;
	}

	let {
		alt,
		name,
		src,
		fallbackSrc,
		size = 'md',
		shape = 'circle',
		status,
		tooltip = true,
		href,
		target,
		rel,
		onclick,
		class: className,
		style,
		'aria-label': consumerAriaLabel,
		role: consumerRole,
		...rest
	}: Props = $props();

	const group = getAvatarGroupContext();
	const resolvedSize = $derived(group?.size ?? size);
	const resolvedShape = $derived(group?.shape ?? shape);
	const px = $derived(resolveAvatarSize(resolvedSize));

	let erroredSrc = $state<string>();
	let erroredFallback = $state<string>();
	const showImage = $derived(!!src && erroredSrc !== src);
	const showFallbackImage = $derived(!showImage && !!fallbackSrc && erroredFallback !== fallbackSrc);
	const meaningfulName = $derived(meaningful(name));
	const initials = $derived(meaningfulName ? getInitials(meaningfulName) : '');
	const showInitials = $derived(!showImage && !showFallbackImage && initials !== '');
	const showIcon = $derived(!showImage && !showFallbackImage && initials === '');

	let statusLabel = $state<string>();
	setAvatarSlotContext({
		get size() {
			return px;
		},
		setStatusLabel: (label) => (statusLabel = meaningful(label))
	});

	const nameLabel = $derived(meaningful(alt) ?? meaningfulName);
	const accessibleName = $derived(
		nameLabel && statusLabel ? `${nameLabel}, ${statusLabel}` : (nameLabel ?? statusLabel)
	);

	const tooltipText = $derived(
		(tooltip === false ? undefined : typeof tooltip === 'string' ? tooltip : meaningfulName)?.trim()
	);
	const isLink = $derived(href != null);
	const isButton = $derived(!isLink && onclick != null);
	const isInteractive = $derived(isLink || isButton);

	const rootStyle = $derived(
		[
			`width: ${px}px`,
			`height: ${px}px`,
			group && `--_avatar-group-overlap: ${-group.overlap}px`,
			style
		]
			.filter(Boolean)
			.join('; ')
	);
	const statusStyle = $derived(
		resolvedShape === 'circle'
			? `bottom: ${px * CIRCLE_EDGE_OFFSET_RATIO}px; inset-inline-end: ${px * CIRCLE_EDGE_OFFSET_RATIO}px`
			: undefined
	);
	const common = $derived({
		class: ['astryx-avatar', 'avatar', className],
		'data-size': resolvedSize,
		'data-shape': resolvedShape,
		style: rootStyle
	});
</script>

{#snippet visual()}
	<div class="content">
		{#if showImage}
			<img {src} alt="" class="image" onerror={() => (erroredSrc = src)} />
		{:else if showFallbackImage}
			<img src={fallbackSrc} alt="" class="image" onerror={() => (erroredFallback = fallbackSrc)} />
		{:else if showInitials}
			<div
				class="astryx-avatar-fallback fallback initials"
				class:lone={!group}
				data-size={resolvedSize}
				style="font-size: {px * 0.4}px; --_initials: {cssString(initials)}"
			></div>
		{:else if showIcon}
			<div class="astryx-avatar-fallback fallback" class:lone={!group} data-size={resolvedSize}>
				<svg width={px * 0.6} height={px * 0.6} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
					<path
						d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
					/>
				</svg>
			</div>
		{/if}
	</div>
	{#if status}
		<div class="status" class:corner={resolvedShape !== 'circle'} style={statusStyle}>{@render status()}</div>
	{/if}
{/snippet}

{#snippet root()}
	{#if isLink}
		<a
			{...rest}
			{...common}
			class:interactive={true}
			class:in-group={!!group}
			{href}
			{target}
			{rel}
			{onclick}
			aria-label={consumerAriaLabel ?? accessibleName}
			data-avatar-item=""
		>
			{@render visual()}
		</a>
	{:else if isButton}
		<button
			{...rest}
			{...common}
			type="button"
			class:interactive={true}
			class:in-group={!!group}
			{onclick}
			aria-label={consumerAriaLabel ?? accessibleName}
			data-avatar-item=""
		>
			{@render visual()}
		</button>
	{:else}
		<!-- A tooltip-bearing avatar outside a group is a focus stop so keyboard users can read it. -->
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<div
			{...rest}
			{...common}
			class:in-group={!!group}
			role={consumerRole ?? (accessibleName ? 'img' : 'presentation')}
			aria-label={consumerAriaLabel ?? accessibleName}
			aria-hidden={accessibleName || consumerAriaLabel ? undefined : 'true'}
			tabindex={tooltipText && !group ? 0 : undefined}
		>
			{@render visual()}
		</div>
	{/if}
{/snippet}

{#if tooltipText}
	<Tooltip content={tooltipText} placement="above">{@render root()}</Tooltip>
{:else}
	{@render root()}
{/if}

<style>
	@layer astryx-base {
		.avatar {
			position: relative;
			display: inline-flex;
			flex-shrink: 0;
			border-radius: var(--_avatar-radius);
		}
		.avatar[data-shape='circle'] { --_avatar-radius: var(--radius-full); }
		.avatar[data-shape='rounded'] { --_avatar-radius: var(--radius-element); }
		.avatar[data-shape='square'] { --_avatar-radius: var(--radius-none); }
		.avatar:focus-visible {
			outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color);
			outline-offset: var(--focus-outline-offset, 2px);
		}
		.interactive {
			appearance: none;
			padding: 0;
			margin: 0;
			border: none;
			background-color: transparent;
			color: inherit;
			font: inherit;
			text-decoration: none;
			cursor: pointer;
		}
		.interactive:is(:disabled, [aria-disabled='true']) { cursor: default; }
		.in-group {
			border: 2px solid var(--color-background-surface);
			background-color: var(--color-background-surface);
			box-sizing: content-box;
			margin-inline-start: var(--_avatar-group-overlap);
		}
		.content {
			display: flex;
			align-items: center;
			justify-content: center;
			width: 100%;
			height: 100%;
			overflow: hidden;
			user-select: none;
			border-radius: var(--_avatar-radius);
		}
		.image { width: 100%; height: 100%; object-fit: cover; }
		.fallback {
			display: flex;
			align-items: center;
			justify-content: center;
			width: 100%;
			height: 100%;
			background-color: var(--color-neutral);
			color: var(--color-text-primary);
			font-family: var(--font-family-body);
			font-weight: var(--font-weight-medium);
			text-transform: uppercase;
		}
		@media (forced-colors: active) {
			.lone { color: currentColor; }
		}
		/* Initials are drawn by CSS so they're not read twice; the root carries the name. */
		.initials::before { content: var(--_initials); }
		@supports (content: 'a' / '') {
			.initials::before { content: var(--_initials) / ''; }
		}
		.status { position: absolute; transform: translate(50%, 50%); }
		.status.corner { bottom: 0; inset-inline-end: 0; transform: translate(25%, 25%); }
		:global([dir='rtl']) .status { transform: translate(-50%, 50%); }
		:global([dir='rtl']) .status.corner { transform: translate(-25%, 25%); }
	}
</style>
