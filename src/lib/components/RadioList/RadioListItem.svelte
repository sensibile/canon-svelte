<!--
  Port of Astryx `RadioListItem` (packages/core/src/RadioList/RadioListItem.tsx), MIT, Meta Platforms, Inc.
  One radio row inside a `RadioList`. Clicking anywhere on the row selects it.
  Invalid state is announced on the radiogroup only (Svelte flags aria-invalid on a radio).
  Not yet ported: touch press feedback and hit-area expansion.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import Item, { type ItemAlign } from '../Item/Item.svelte';
	import RadioIndicator from '../Indicator/RadioIndicator.svelte';
	import { getRadioListContext } from './context.js';

	interface Props extends Omit<HTMLAttributes<HTMLElement>, 'onclick'> {
		label: string | Snippet;
		'aria-label'?: string;
		value: string;
		description?: string | Snippet;
		isDisabled?: boolean;
		startContent?: Snippet;
		endContent?: Snippet;
		align?: ItemAlign;
		onclick?: (e: MouseEvent) => void;
	}

	let {
		label,
		'aria-label': ariaLabel,
		value,
		description,
		isDisabled: isItemDisabled = false,
		startContent,
		endContent,
		align,
		onclick,
		class: className,
		...rest
	}: Props = $props();

	const maybeCtx = getRadioListContext();
	if (!maybeCtx) throw new Error('RadioListItem must be used within a RadioList');
	const ctx = maybeCtx;

	const uid = $props.id();
	const id = `${uid}-radio`;
	const labelID = `${uid}-label`;
	const descriptionID = `${uid}-desc`;
	const isDisabled = $derived(ctx.isDisabled || isItemDisabled);
	// A group-level disabled message keeps radios focusable so the reason can be read.
	const keepsFocusable = $derived(ctx.hasDisabledMessage && !isItemDisabled);
	const isChecked = $derived(ctx.value === value);
	const hasDescription = $derived(description != null && description !== '');
	let input: HTMLInputElement | undefined = $state();
</script>

{#snippet media()}
	<span class="radio-wrapper" data-size={ctx.size}>
		<input
			bind:this={input}
			{id}
			type="radio"
			name={ctx.name}
			{value}
			checked={isChecked}
			disabled={isDisabled && !keepsFocusable}
			aria-disabled={keepsFocusable ? 'true' : undefined}
			form={keepsFocusable ? '' : undefined}
			required={ctx.isRequired}
			aria-label={ariaLabel}
			aria-labelledby={ariaLabel == null ? labelID : undefined}
			aria-describedby={[hasDescription ? descriptionID : null, ctx.disabledReasonID].filter(Boolean).join(' ') ||
				undefined}
			class:disabled={isDisabled}
			onchange={(e) => {
				if (isDisabled) {
					(e.currentTarget as HTMLInputElement).checked = false;
					return;
				}
				ctx.select(value);
			}}
			onclick={(e) => {
				if (isDisabled) {
					e.preventDefault();
					return;
				}
				onclick?.(e);
			}}
		/>
		<RadioIndicator state={isChecked ? 'checked' : 'unchecked'} size={ctx.size} {isDisabled} />
	</span>
	{@render startContent?.()}
{/snippet}

<Item
	{...rest}
	class={['astryx-radio-list-item', 'astryx-indicator-scope', 'row', className]}
	startContent={media}
	interactive={input ?? null}
	{isDisabled}
	{label}
	{description}
	labelId={labelID}
	descriptionId={descriptionID}
	{endContent}
	{align}
	data-size={ctx.size}
	data-selected={isChecked ? 'selected' : undefined}
/>

<style>
	@layer astryx-base {
		:global(.astryx-item.astryx-radio-list-item.row[data-density]) {
			padding: 0;
			border-radius: 0;
			min-width: 0;
			background-color: transparent;
		}
		:global(.astryx-item.astryx-radio-list-item.row[data-density]:hover) { background-color: transparent; background-image: none; }
		/* The indicator, not the row, shows focus. */
		:global(.astryx-item.astryx-radio-list-item.row:has(:focus-visible)) { outline: none; }
		.radio-wrapper {
			position: relative;
			display: flex;
			align-items: center;
			justify-content: center;
			flex-shrink: 0;
			isolation: isolate;
		}
		.radio-wrapper[data-size='sm'] input { width: 20px; height: 20px; }
		.radio-wrapper[data-size='md'] input { width: 24px; height: 24px; }
		input {
			position: absolute;
			top: 50%;
			inset-inline-start: 50%;
			translate: -50% -50%;
			margin: 0;
			padding: 0;
			opacity: 0;
			cursor: pointer;
			z-index: 1;
		}
		:global([dir='rtl']) input { translate: 50% -50%; }
		input.disabled { cursor: default; }
		@media (pointer: coarse) {
			input { min-inline-size: 24px; min-block-size: 24px; }
		}
		.radio-wrapper:has(input:focus-visible) :global(.astryx-radio-indicator) {
			outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color);
			outline-offset: var(--focus-outline-offset);
		}
		:global(.astryx-indicator-scope:not([data-disabled])) .radio-wrapper:active :global(.astryx-radio-indicator)::after,
		:global(.astryx-indicator-scope:not([data-disabled]):active) .radio-wrapper :global(.astryx-radio-indicator)::after {
			content: '';
			position: absolute;
			inset: 0;
			border-radius: 50%;
			pointer-events: none;
			background: var(--color-overlay-pressed);
		}
	}
</style>
