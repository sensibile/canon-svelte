<!--
  Port of Astryx `Collapsible` (packages/core/src/Collapsible/Collapsible.tsx), MIT, Meta Platforms, Inc.
  A disclosure: a full-width trigger button and content that shows when open (open by default).
  Inside a CollapsibleGroup, give it a `value` and the group decides which are open.
  Not yet ported: `animatedLayout` height animation.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import Icon from '../Icon/Icon.svelte';
	import {
		getCollapsibleGroupContext,
		setCollapsibleGroupContext,
		type CollapsibleChevronPosition
	} from './context.js';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		trigger: string | Snippet;
		children?: Snippet;
		defaultIsOpen?: boolean;
		isOpen?: boolean;
		isDisabled?: boolean;
		onOpenChange?: (isOpen: boolean) => void;
		chevronPosition?: CollapsibleChevronPosition;
		/** Identifies this item inside a CollapsibleGroup. */
		value?: string;
	}

	let {
		trigger,
		children,
		defaultIsOpen,
		isOpen: controlledIsOpen,
		isDisabled = false,
		onOpenChange,
		chevronPosition,
		value,
		class: className,
		...rest
	}: Props = $props();

	const group = getCollapsibleGroupContext();
	// Nested Collapsibles don't inherit the group.
	setCollapsibleGroupContext(null);

	let internalOpen = $state(initialOpen());
	function initialOpen() {
		return controlledIsOpen ?? defaultIsOpen ?? true;
	}
	const byGroup = $derived(group != null && value != null);
	const isOpen = $derived(byGroup ? group!.isOpen(value!) : (controlledIsOpen ?? internalOpen));

	let triggerEl: HTMLButtonElement | undefined = $state();
	let contentEl: HTMLDivElement | undefined = $state();

	function toggle() {
		if (isDisabled) return;
		// Focus inside content that's about to hide goes back to the trigger.
		if (isOpen && contentEl?.contains(document.activeElement)) triggerEl?.focus();
		if (byGroup) {
			group!.toggle(value!);
			return;
		}
		const next = !isOpen;
		if (controlledIsOpen === undefined) internalOpen = next;
		onOpenChange?.(next);
	}

	const isDivided = $derived(group?.hasDividers ?? false);
	const density = $derived(group?.density ?? undefined);
	const position = $derived(chevronPosition ?? group?.chevronPosition ?? 'end');
	const contentId = $props.id();
</script>

{#snippet chevron()}
	<span class="chevron" class:start={position === 'start'} class:open={isOpen}>
		<Icon icon={position === 'start' ? 'chevronRight' : 'chevronDown'} size="sm" color="secondary" />
	</span>
{/snippet}

<div
	{...rest}
	class={['astryx-collapsible', 'root', className]}
	class:divided={isDivided}
	data-density={density}
	data-divided={isDivided ? 'divided' : undefined}
>
	<button
		bind:this={triggerEl}
		type="button"
		class="astryx-collapsible-trigger trigger"
		class:disabled={isDisabled}
		data-density={density}
		data-chevron-position={position}
		data-open={isOpen ? 'open' : undefined}
		data-disabled={isDisabled ? 'disabled' : undefined}
		aria-disabled={isDisabled || undefined}
		aria-expanded={isOpen}
		aria-controls={contentId}
		tabindex={isDisabled ? -1 : undefined}
		onclick={toggle}
	>
		{#if position === 'start'}{@render chevron()}{/if}
		<span class="label">{#if typeof trigger === 'function'}{@render trigger()}{:else}{trigger}{/if}</span>
		{#if position === 'end'}{@render chevron()}{/if}
	</button>
	<div
		bind:this={contentEl}
		id={contentId}
		class="astryx-collapsible-content content"
		class:hidden={!isOpen}
		data-density={density}
		data-open={isOpen ? 'open' : undefined}
	>
		<div>{@render children?.()}</div>
	</div>
</div>

<style>
	@layer astryx-base {
		.root { width: 100%; }
		.divided { border-block-start: var(--border-width) solid var(--color-border); }
		.divided:first-child { border-block-start-width: 0; }
		.trigger {
			appearance: none;
			border: none;
			background: none;
			margin: 0;
			padding-inline: 0;
			box-sizing: border-box;
			display: flex;
			align-items: center;
			justify-content: space-between;
			width: 100%;
			cursor: pointer;
			font-family: var(--font-family-body);
			font-size: var(--text-large-size);
			line-height: var(--text-large-leading);
			font-weight: var(--font-weight-semibold);
			color: var(--color-text-primary);
			text-align: start;
			padding-block: 0;
		}
		.trigger:not(.disabled):active { background-color: var(--color-overlay-pressed); }
		.trigger:focus-visible {
			outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color);
			outline-offset: 2px;
		}
		.trigger.disabled { cursor: default; opacity: 0.5; }
		.trigger[data-density='compact'] { padding-block: var(--spacing-1); }
		.trigger[data-density='balanced'] { padding-block: var(--spacing-2); }
		.trigger[data-density='spacious'] { padding-block: var(--spacing-3); }
		.label { text-box-edge: cap alphabetic; text-box-trim: trim-both; flex-grow: 1; }
		.chevron {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			flex-shrink: 0;
			width: var(--text-large-size);
			height: var(--text-large-size);
			transition: transform var(--duration-fast) var(--ease-standard);
		}
		.chevron.open { transform: rotate(180deg); }
		.chevron.start { margin-inline-end: var(--spacing-2); }
		.chevron.start.open { transform: rotate(90deg); }
		:global([dir='rtl']) .chevron.start { transform: scaleX(-1); }
		:global([dir='rtl']) .chevron.start.open { transform: scaleX(-1) rotate(90deg); }
		@media (prefers-reduced-motion: reduce) {
			.chevron { transition-duration: 0s; }
		}
		.content {
			padding-block-start: var(--spacing-1);
			font-family: var(--font-family-body);
			font-size: var(--text-body-size);
			font-weight: var(--text-body-weight);
			line-height: var(--text-body-leading);
			color: var(--color-text-primary);
		}
		.content[data-density='compact'] { padding-block-end: var(--spacing-1); }
		.content[data-density='balanced'] { padding-block-end: var(--spacing-2); }
		.content[data-density='spacious'] { padding-block-end: var(--spacing-3); }
		.hidden { display: none; }
	}
</style>
