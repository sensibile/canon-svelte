<!--
  Port of Astryx `Item` (packages/core/src/Item/Item.tsx), MIT, Meta Platforms, Inc.
  The row primitive behind lists, menus and choice lists: start content, label + description,
  end content. It acts as a button (`onclick`), a link (`href`), or forwards row clicks to a
  control inside it (`interactive`, e.g. a radio in start content).
  Not yet ported: swipe actions, marker columns, list-row link bands, touch press feedback.
-->
<script lang="ts" module>
	export type ItemAlign = 'center' | 'start' | 'first-line';
	export type ItemDensity = 'compact' | 'balanced' | 'spacious';
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends Omit<HTMLAttributes<HTMLElement>, 'onclick'> {
		as?: 'div' | 'li' | 'span';
		label: string | Snippet;
		description?: string | Snippet;
		startContent?: Snippet;
		endContent?: Snippet;
		align?: ItemAlign;
		density?: ItemDensity;
		/** Clamp the label to this many lines. Plain-text labels truncate to one line by default. */
		labelLines?: number;
		descriptionLines?: number;
		/** "inline" puts the description on the label's line. */
		layout?: 'stacked' | 'inline';
		onclick?: (e: MouseEvent) => void;
		href?: string;
		target?: '_blank' | '_self';
		rel?: string;
		/** A control inside the row that row clicks are forwarded to. Excludes `onclick`/`href`. */
		interactive?: HTMLElement | null;
		isHighlighted?: boolean;
		isSelected?: boolean;
		isDisabled?: boolean;
		labelId?: string;
		descriptionId?: string;
	}

	let {
		as = 'div',
		label,
		description,
		startContent,
		endContent,
		align = 'center',
		density = 'balanced',
		labelLines,
		descriptionLines,
		layout = 'stacked',
		onclick,
		href,
		target,
		rel,
		interactive,
		isHighlighted = false,
		isSelected = false,
		isDisabled = false,
		labelId,
		descriptionId,
		role,
		class: className,
		style,
		...rest
	}: Props = $props();

	const ARIA_SELECTED_ROLES = new Set(['option', 'tab', 'row', 'gridcell', 'columnheader', 'rowheader', 'treeitem']);
	const uid = $props.id();
	const isDelegate = $derived(interactive !== undefined);
	const hasParentRole = $derived(role != null);
	const isInteractive = $derived(onclick != null || href != null || isDelegate);
	const hasDescription = $derived(description != null && description !== '');
	const isInline = $derived(layout === 'inline' && hasDescription);
	const allowsAriaSelected = $derived(role != null && ARIA_SELECTED_ROLES.has(role));
	const ariaCurrent = $derived(rest['aria-current'] ?? (isSelected && !allowsAriaSelected ? true : undefined));
	const currentOnControl = $derived(!hasParentRole && (href != null || onclick != null));
	const relValue = $derived(rel ?? (target === '_blank' ? 'noopener noreferrer' : undefined));

	const labelTruncate = $derived(
		labelLines != null ? (labelLines === 1 ? 'single' : 'multi') : typeof label === 'string' ? 'single' : null
	);
	const descriptionTruncate = $derived(
		descriptionLines != null
			? descriptionLines === 1
				? 'single'
				: 'multi'
			: typeof description === 'string' || isInline
				? 'single'
				: null
	);

	let actionEl: HTMLElement | undefined = $state();

	function handleRowClick(e: MouseEvent) {
		if (isDisabled) return;
		const t = e.target as HTMLElement;
		if (isDelegate) {
			// Forward clicks on the row's empty space to the control.
			if (!interactive || interactive.contains(t) || t.closest('button, a, input, select, textarea, label')) return;
			interactive.click();
			interactive.focus({ preventScroll: true });
			return;
		}
		if (hasParentRole) {
			onclick?.(e);
			return;
		}
		if (t.closest('button, a, input, select, textarea')) return;
		if (href != null) actionEl?.click();
		else onclick?.(e);
	}
</script>

{#snippet text()}
	<span
		id={labelId}
		class="label"
		class:inline-label={isInline}
		class:single={labelTruncate === 'single'}
		class:multi={labelTruncate === 'multi'}
		style:-webkit-line-clamp={labelLines != null && labelLines > 1 ? labelLines : undefined}
	>
		{#if typeof label === 'function'}{@render label()}{:else}{label}{/if}
	</span>
	{#if hasDescription}
		<span
			id={descriptionId ?? `${uid}-desc`}
			class="description"
			class:inline-description={isInline}
			class:single={descriptionTruncate === 'single'}
			class:multi={descriptionTruncate === 'multi'}
			style:-webkit-line-clamp={descriptionLines != null && descriptionLines > 1 ? descriptionLines : undefined}
		>
			{#if typeof description === 'function'}{@render description()}{:else}{description}{/if}
		</span>
	{/if}
{/snippet}

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<svelte:element
	this={as}
	{...rest}
	class={['astryx-item', 'item', className]}
	class:interactive={isInteractive}
	class:delegate={isDelegate}
	class:highlighted={isHighlighted}
	class:selected={isSelected}
	class:disabled={isDisabled && !hasParentRole}
	{style}
	{role}
	data-density={density}
	data-align={align}
	data-highlighted={isHighlighted ? 'highlighted' : undefined}
	data-selected={isSelected ? 'selected' : undefined}
	data-disabled={isDisabled ? 'disabled' : undefined}
	aria-selected={(allowsAriaSelected && isSelected) || undefined}
	aria-current={currentOnControl ? undefined : ariaCurrent}
	aria-disabled={isDisabled || undefined}
	onclick={isInteractive ? handleRowClick : undefined}
>
	{#if startContent}
		<span class="start" class:first-line={align === 'first-line'}>{@render startContent()}</span>
	{/if}
	{#if hasParentRole || isDelegate || (href == null && onclick == null)}
		<span class="content" class:inline-content={isInline} class:dimmed={isDisabled}>{@render text()}</span>
	{:else if href != null}
		<a
			bind:this={actionEl}
			class="action focus-owner"
			class:inline-content={isInline}
			class:dimmed={isDisabled}
			href={isDisabled ? undefined : href}
			target={isDisabled ? undefined : target}
			rel={isDisabled ? undefined : relValue}
			role={isDisabled ? 'link' : undefined}
			aria-disabled={isDisabled || undefined}
			tabindex={isDisabled ? 0 : undefined}
			aria-current={ariaCurrent}
		>
			{@render text()}
		</a>
	{:else}
		<button
			bind:this={actionEl}
			type="button"
			class="action focus-owner"
			class:inline-content={isInline}
			class:dimmed={isDisabled}
			aria-disabled={isDisabled || undefined}
			aria-current={ariaCurrent}
			onclick={(e) => {
				e.stopPropagation();
				if (!isDisabled) onclick?.(e);
			}}
		>
			{@render text()}
		</button>
	{/if}
	{#if endContent}
		<span class="end" class:first-line={align === 'first-line'} class:dimmed={isDisabled}>{@render endContent()}</span>
	{/if}
</svelte:element>

<style>
	@layer astryx-base {
		.item {
			--_item-inset-inline: var(--spacing-2);
			display: flex;
			align-items: center;
			gap: var(--spacing-2);
			padding-inline: var(--_item-inset-inline);
			position: relative;
			box-sizing: border-box;
			text-align: start;
			border-radius: var(--radius-element);
			outline: none;
		}
		.item[data-density='compact'] { padding-block: var(--spacing-1); }
		.item[data-density='balanced'] { padding-block: var(--spacing-2); }
		.item[data-density='spacious'] { padding-block: var(--spacing-3); --_item-inset-inline: var(--spacing-3); }
		.item[data-align='start'] { align-items: flex-start; }
		.item[data-align='first-line'] { align-items: baseline; }
		.first-line { align-items: center; }
		.first-line::before {
			content: '\200B';
			inline-size: 0;
			overflow: hidden;
			font-size: var(--text-body-size);
			line-height: var(--text-body-leading);
		}

		.interactive {
			cursor: pointer;
			transition: background-color var(--duration-fast-min) var(--ease-standard);
		}
		@media (hover: hover) {
			.interactive:not(.disabled):not(.highlighted):not(.selected):hover { background-color: var(--color-overlay-hover); }
			.interactive.highlighted:not(.disabled):hover,
			.interactive.selected:not(.disabled):hover {
				background-image: linear-gradient(var(--color-overlay-hover), var(--color-overlay-hover));
			}
		}
		.interactive:not(.disabled):active { background-image: linear-gradient(var(--color-overlay-pressed), var(--color-overlay-pressed)); }
		.highlighted { background-color: var(--color-overlay-hover); }
		.selected { background-color: var(--color-accent-muted); }
		.disabled { cursor: default; pointer-events: none; }

		/* The row shows the focus ring of the control that owns it. */
		.item:has(.focus-owner:focus-visible),
		.delegate:has(:focus-visible) {
			outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color);
			outline-offset: calc(-1 * var(--focus-outline-width));
		}

		.content,
		.action {
			display: flex;
			flex-direction: column;
			flex: 1;
			min-width: 0;
			text-align: start;
		}
		.action {
			all: unset;
			display: flex;
			flex-direction: column;
			flex: 1;
			min-width: 0;
			text-align: start;
			color: inherit;
			cursor: inherit;
			text-decoration: none;
			outline: none;
		}
		.action::after {
			/* Stretch the hit area over the whole row. */
			content: '';
			position: absolute;
			inset: 0;
		}
		.inline-content { flex-direction: row; align-items: center; column-gap: var(--spacing-1); }
		.inline-label { flex-shrink: 0; }
		.inline-description { flex-shrink: 1; min-width: 0; }
		.dimmed { opacity: 0.5; }

		.label {
			color: var(--_item-label-color, var(--color-text-primary));
			font-size: var(--text-body-size);
			line-height: var(--text-body-leading);
		}
		.description {
			color: var(--_item-description-color, var(--color-text-secondary));
			font-size: var(--text-supporting-size);
			line-height: var(--text-supporting-leading);
		}
		.single { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
		.multi { overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; }

		.start { flex: 0 0 auto; display: flex; }
		.end { flex: 0 0 auto; display: flex; margin-inline-start: auto; position: relative; z-index: 1; }
	}
</style>
