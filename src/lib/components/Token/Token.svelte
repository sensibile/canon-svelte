<!--
  Port of Astryx `Token` (packages/core/src/Token/Token.tsx, TokenLink.tsx), MIT, Meta Platforms, Inc.
  A compact chip. `href` makes it a link, `onclick` a button, `onRemove` adds a remove button.
  With a remove button, the label is its own link/button inside the chip and clicking the chip
  body activates it.
-->
<script lang="ts" module>
	export type TokenColor =
		| 'default'
		| 'red'
		| 'orange'
		| 'yellow'
		| 'green'
		| 'teal'
		| 'cyan'
		| 'blue'
		| 'purple'
		| 'pink'
		| 'gray';
	export type TokenSize = 'sm' | 'md' | 'lg';
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import Icon from '../Icon/Icon.svelte';

	interface Props extends Omit<HTMLAttributes<HTMLElement>, 'onclick'> {
		label: string;
		size?: TokenSize;
		color?: TokenColor;
		icon?: Snippet;
		isDisabled?: boolean;
		onRemove?: (e: MouseEvent) => void;
		onclick?: (e: MouseEvent) => void;
		href?: string;
		/** Extra description for assistive tech (aria-description). */
		description?: string;
		endContent?: Snippet;
		isLabelHidden?: boolean;
		/** Accessible name for the remove button's target, when it differs from `label`. */
		removeName?: string;
	}

	let {
		label,
		size = 'md',
		color = 'default',
		icon,
		isDisabled = false,
		onRemove,
		onclick,
		href,
		description,
		endContent,
		isLabelHidden = false,
		removeName,
		class: className,
		'aria-labelledby': ariaLabelledBy,
		'aria-describedby': ariaDescribedBy,
		'aria-haspopup': ariaHasPopup,
		'aria-expanded': ariaExpanded,
		'aria-pressed': ariaPressed,
		'aria-label': ariaLabel,
		...rest
	}: Props = $props();

	const isLink = $derived(href != null && onclick == null);
	const isButton = $derived(onclick != null);
	const labelling = $derived({
		'aria-labelledby': ariaLabelledBy,
		'aria-describedby': ariaDescribedBy,
		'aria-haspopup': ariaHasPopup,
		'aria-expanded': ariaExpanded,
		'aria-pressed': ariaPressed
	});
	// Naming and description go on whichever element is the control (the inner link/button when
	// the chip is a wrapper), so assistive tech reads them on the focused element.
	const shared = $derived({
		...(ariaLabel != null ? { 'aria-label': ariaLabel } : isLabelHidden ? { 'aria-label': label } : {}),
		...(description != null ? { 'aria-description': description } : {})
	});
	const classes = $derived(['astryx-token', 'token', className]);

	let labelEl: HTMLElement | undefined = $state();
	function blockDisabled(e: Event) {
		if (e instanceof KeyboardEvent && e.key !== 'Enter' && e.key !== ' ') return;
		e.preventDefault();
		e.stopPropagation();
	}
	/** Clicking the chip body (not a nested control) activates the label link/button. */
	function onContainerClick(e: MouseEvent) {
		if (isDisabled || !labelEl || (e.target as HTMLElement).closest('button, a')) return;
		// Re-dispatch with the original modifiers so Ctrl/Cmd/Shift-click keep their link meaning.
		labelEl.dispatchEvent(
			new MouseEvent('click', {
				bubbles: true,
				cancelable: true,
				ctrlKey: e.ctrlKey,
				metaKey: e.metaKey,
				shiftKey: e.shiftKey,
				altKey: e.altKey,
				button: e.button
			})
		);
	}
</script>

{#snippet labelText()}
	<span dir="auto" class="label" class:label-hidden={isLabelHidden}>{label}</span>
{/snippet}

{#snippet removeButton()}
	{#if onRemove}
		<button
			type="button"
			class="remove"
			aria-label="Remove {removeName ?? label}"
			aria-disabled={isDisabled || undefined}
			onkeydown={isDisabled ? blockDisabled : undefined}
			onclick={(e) => {
				e.stopPropagation();
				if (isDisabled) e.preventDefault();
				else onRemove?.(e);
			}}
		>
			<Icon icon="close" size="xsm" color="inherit" />
		</button>
	{/if}
{/snippet}

{#if isLink && !onRemove}
	<a
		{...rest}
		{...labelling}
		{...shared}
		href={isDisabled ? undefined : href}
		role={isDisabled ? 'link' : undefined}
		tabindex={isDisabled ? 0 : undefined}
		aria-disabled={isDisabled || undefined}
		onclick={isDisabled ? blockDisabled : undefined}
		onkeydown={isDisabled ? blockDisabled : undefined}
		class={classes}
		class:interactive={true}
		class:disabled={isDisabled}
		data-color={color}
		data-size={size}
		data-disabled={isDisabled ? 'disabled' : undefined}
	>
		{@render icon?.()}
		{@render labelText()}
		{@render endContent?.()}
	</a>
{:else if isLink || isButton}
	<!-- Mouse convenience only: the label link/button inside is the keyboard target. -->
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<span
		{...rest}
		class={classes}
		class:interactive={true}
		class:disabled={isDisabled}
		class:owner={true}
		data-color={color}
		data-size={size}
		data-disabled={isDisabled ? 'disabled' : undefined}
		onclick={onContainerClick}
	>
		{@render icon?.()}
		{#if isLink}
			<a
				bind:this={labelEl}
				{...labelling}
				{...shared}
				href={isDisabled ? undefined : href}
				role={isDisabled ? 'link' : undefined}
				tabindex={isDisabled ? 0 : undefined}
				aria-disabled={isDisabled || undefined}
				onclick={isDisabled ? blockDisabled : undefined}
				onkeydown={isDisabled ? blockDisabled : undefined}
				class="inner">{@render labelText()}</a
			>
		{:else}
			<button
				bind:this={labelEl}
				type="button"
				{...labelling}
				{...shared}
				aria-disabled={isDisabled || undefined}
				onkeydown={isDisabled ? blockDisabled : undefined}
				onclick={(e) => {
					if (isDisabled) e.preventDefault();
					else onclick?.(e);
				}}
				class="inner">{@render labelText()}</button
			>
		{/if}
		{@render endContent?.()}
		{@render removeButton()}
	</span>
{:else}
	<span
		{...rest}
		{...labelling}
		{...shared}
		class={classes}
		class:disabled={isDisabled}
		data-color={color}
		data-size={size}
		data-disabled={isDisabled ? 'disabled' : undefined}
	>
		{@render icon?.()}
		{@render labelText()}
		{@render endContent?.()}
		{@render removeButton()}
	</span>
{/if}

<style>
	@layer astryx-base {
		.token {
			display: inline-flex;
			align-items: center;
			gap: var(--spacing-1);
			padding-block: 0;
			border: none;
			border-radius: var(--radius-inner);
			font-family: inherit;
			font-size: var(--text-supporting-size);
			line-height: var(--text-supporting-leading);
			font-weight: var(--font-weight-medium);
			white-space: nowrap;
			text-decoration: none;
			max-width: 100%;
			overflow: hidden;
			padding-inline: var(--spacing-2);
			box-sizing: border-box;
		}
		.token[data-size='sm'] { height: calc(var(--size-element-sm) - 8px); }
		.token[data-size='md'] { height: calc(var(--size-element-md) - 8px); }
		.token[data-size='lg'] { height: calc(var(--size-element-lg) - 8px); }
		.label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; unicode-bidi: isolate; }
		.label-hidden {
			position: absolute;
			width: 1px;
			height: 1px;
			padding: 0;
			margin: -1px;
			overflow: hidden;
			clip-path: inset(50%);
			white-space: nowrap;
			border-width: 0;
		}
		.interactive {
			cursor: pointer;
			transition: background-image var(--duration-fast) var(--ease-standard);
		}
		@media (hover: hover) {
			.interactive:not(.disabled):hover {
				background-image: linear-gradient(var(--color-overlay-hover), var(--color-overlay-hover));
			}
		}
		.interactive:not(.disabled):active {
			background-image: linear-gradient(var(--color-overlay-pressed), var(--color-overlay-pressed));
		}
		.disabled { cursor: default; opacity: 0.5; pointer-events: none; }
		a.token:focus-visible,
		.owner:has(.inner:focus-visible) {
			outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color);
			outline-offset: 2px;
		}
		.inner {
			all: unset;
			cursor: inherit;
			color: inherit;
			overflow: hidden;
			min-width: 0;
			display: inline-flex;
		}
		.remove {
			all: unset;
			display: inline-flex;
			align-items: center;
			justify-content: center;
			position: relative;
			margin-inline-end: calc(-1 * var(--spacing-1));
			cursor: pointer;
			border-radius: var(--radius-full);
			width: 16px;
			height: 16px;
			flex-shrink: 0;
			color: inherit;
		}
		.remove[aria-disabled='true'] { cursor: default; }
		.remove::after { content: ''; position: absolute; inset: -4px; }
		.remove:focus-visible {
			outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color);
			outline-offset: 1px;
		}

		.token[data-color='default'] { background-color: var(--color-neutral); color: var(--color-text-primary); }
		.token[data-color='red'] { background-color: var(--color-background-red); color: var(--color-text-red); }
		.token[data-color='orange'] { background-color: var(--color-background-orange); color: var(--color-text-orange); }
		.token[data-color='yellow'] { background-color: var(--color-background-yellow); color: var(--color-text-yellow); }
		.token[data-color='green'] { background-color: var(--color-background-green); color: var(--color-text-green); }
		.token[data-color='teal'] { background-color: var(--color-background-teal); color: var(--color-text-teal); }
		.token[data-color='cyan'] { background-color: var(--color-background-cyan); color: var(--color-text-cyan); }
		.token[data-color='blue'] { background-color: var(--color-background-blue); color: var(--color-text-blue); }
		.token[data-color='purple'] { background-color: var(--color-background-purple); color: var(--color-text-purple); }
		.token[data-color='pink'] { background-color: var(--color-background-pink); color: var(--color-text-pink); }
		.token[data-color='gray'] { background-color: var(--color-background-gray); color: var(--color-text-gray); }
	}
</style>
