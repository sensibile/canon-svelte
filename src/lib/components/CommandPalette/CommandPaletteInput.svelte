<!--
  Port of Astryx `CommandPaletteInput` (packages/core/src/CommandPalette/CommandPaletteInput.tsx), MIT,
  Meta Platforms, Inc. The search field: inside a CommandPalette it is the combobox driving the list
  (Arrow keys, Page Up/Down, Enter); a spinner shows while a search runs. Pass it to the palette's
  `input` to add `endContent` or change the placeholder. Outside a palette it is a searchbox, or a
  combobox when you give it popup ARIA.
  Not yet ported: the delayed "Loading" announcement.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import Icon from '../Icon/Icon.svelte';
	import Spinner from '../Spinner/Spinner.svelte';
	import { getCommandPaletteContext } from './context.js';
	import { readModality } from '../../internal/modality.js';

	interface Props extends Omit<HTMLInputAttributes, 'value'> {
		value?: string;
		onValueChange?: (value: string) => void;
		/** Defaults to "Search…". */
		placeholder?: string;
		/** The accessible name; defaults to "Search commands". */
		label?: string;
		hasAutoFocus?: boolean;
		endContent?: Snippet;
		/** The input element. */
		element?: HTMLInputElement;
	}
	let {
		value: controlledValue,
		onfocus,
		onblur,
		onValueChange,
		placeholder = 'Search…',
		label,
		hasAutoFocus = true,
		endContent,
		element = $bindable(),
		class: className,
		style,
		oninput,
		onkeydown,
		...rest
	}: Props = $props();

	const ctx = getCommandPaletteContext();
	const hasListbox = $derived(ctx ? ctx.selectableItems.length > 0 : true);
	const value = $derived(controlledValue ?? ctx?.search ?? '');
	const accessibleLabel = $derived(rest['aria-label'] ?? label ?? 'Search commands');
	const has = (key: string) => Object.hasOwn(rest, key);
	const callerOwnsPopup = $derived(
		!ctx &&
		(rest.role === 'combobox' ||
			has('aria-expanded') ||
			has('aria-autocomplete') ||
			has('aria-controls') ||
			has('aria-owns') ||
			has('aria-activedescendant') ||
			(has('aria-haspopup') && rest['aria-haspopup'] !== false && rest['aria-haspopup'] !== 'false'))
	);
	const role = $derived(ctx ? 'combobox' : has('role') ? rest.role : callerOwnsPopup ? 'combobox' : 'searchbox');
	const activeDescendant = $derived(
		ctx
			? hasListbox && ctx.highlightedIndex >= 0 && ctx.highlightedIndex < ctx.selectableItems.length
				? ctx.getItemId(ctx.highlightedIndex)
				: undefined
			: rest['aria-activedescendant']
	);

	// The focus ring shows only for keyboard focus, like Astryx's modality tracking.
	let isKeyboardFocus = $state(false);

	$effect(() => {
		if (!hasAutoFocus || !element) return;
		const frame = requestAnimationFrame(() => element?.focus());
		return () => cancelAnimationFrame(frame);
	});

	function handleInput(e: Event & { currentTarget: EventTarget & HTMLInputElement }) {
		const next = e.currentTarget.value;
		(onValueChange ?? ctx?.setSearch)?.(next);
		oninput?.(e);
	}
	function handleKeydown(e: KeyboardEvent & { currentTarget: EventTarget & HTMLInputElement }) {
		onkeydown?.(e);
		if (e.defaultPrevented || e.isComposing || e.keyCode === 229) return;
		ctx?.onKeyDown(e);
	}
</script>

<div class={['astryx-command-palette-input', 'wrapper', className]} {style}>
	<span class="icon"><Icon icon="search" size="sm" color="inherit" /></span>
	<input
		{...rest}
		bind:this={element}
		class="input"
		type="text"
		enterkeyhint="search"
		autocomplete="off"
		autocorrect="off"
		autocapitalize="off"
		spellcheck="false"
		{role}
		aria-expanded={ctx ? ctx.isOpen && hasListbox : has('aria-expanded') ? rest['aria-expanded'] : callerOwnsPopup || undefined}
		aria-autocomplete={ctx ? 'list' : has('aria-autocomplete') ? rest['aria-autocomplete'] : callerOwnsPopup ? 'list' : undefined}
		aria-controls={ctx ? (hasListbox ? ctx.listId : undefined) : rest['aria-controls']}
		aria-activedescendant={activeDescendant}
		aria-label={accessibleLabel}
		{placeholder}
		{value}
		data-autofocus={hasAutoFocus || undefined}
		class:keyboard-focus={isKeyboardFocus}
		oninput={handleInput}
		onkeydown={handleKeydown}
		onfocus={(e) => {
			isKeyboardFocus = readModality() === 'keyboard';
			onfocus?.(e);
		}}
		onblur={(e) => {
			isKeyboardFocus = false;
			onblur?.(e);
		}}
	/>
	{#if ctx?.isBusy || endContent}
		<span class="end">
			{#if ctx?.isBusy}<span class="icon spinner"><Spinner size="sm" aria-hidden="true" /></span>{/if}
			{@render endContent?.()}
		</span>
	{/if}
</div>

<style>
	@layer astryx-base {
		.wrapper {
			display: flex;
			align-items: center;
			gap: var(--spacing-2);
			padding-inline: var(--spacing-4);
			padding-block: var(--spacing-3);
			flex-shrink: 0;
		}
		.icon {
			display: flex;
			align-items: center;
			flex-shrink: 0;
			color: var(--color-text-secondary);
		}
		.end { display: flex; align-items: center; gap: var(--spacing-1); flex-shrink: 0; }
		/* Shown only once a search has run 150ms, so quick searches don't flash it. */
		.spinner {
			opacity: 1;
			transition: opacity 1ms 150ms;
		}
		@starting-style {
			.spinner { opacity: 0; }
		}
		.input {
			flex: 1;
			min-width: 0;
			border: 0 none;
			background-color: transparent;
			color: var(--color-text-primary);
			font-family: var(--font-family-body);
			font-size: var(--text-body-size);
			line-height: var(--text-body-leading);
			padding: 0;
			outline: none;
		}
		.input.keyboard-focus:focus-visible {
			outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color);
			outline-offset: var(--focus-outline-offset);
		}
		@media (pointer: coarse) {
			@supports (-webkit-touch-callout: none) {
				.input { font-size: max(1rem, var(--text-body-size)); }
			}
		}
		.input::placeholder { color: var(--color-text-secondary); }
	}
</style>
