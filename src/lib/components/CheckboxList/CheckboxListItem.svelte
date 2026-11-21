<!--
  Port of Astryx `CheckboxListItem` (packages/core/src/CheckboxList/CheckboxListItem.tsx), MIT, Meta Platforms, Inc.
  One checkbox row inside a `CheckboxList`. Clicking anywhere on the row toggles it.
  Inside a list with a `value` array give it a `value`; otherwise use `isChecked` + `onCheck`.
  Not yet ported: touch press feedback.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import Item, { type ItemAlign } from '../Item/Item.svelte';
	import CheckboxIndicator from '../Indicator/CheckboxIndicator.svelte';
	import Spinner from '../Spinner/Spinner.svelte';
	import { getCheckboxListContext } from './context.js';

	interface Props extends Omit<HTMLAttributes<HTMLElement>, 'onclick'> {
		label: string | Snippet;
		'aria-label'?: string;
		value?: string;
		description?: string | Snippet;
		endContent?: Snippet;
		isDisabled?: boolean;
		isLoading?: boolean;
		isChecked?: boolean | 'indeterminate';
		onCheck?: (checked: boolean) => void;
		align?: ItemAlign;
		onclick?: (e: MouseEvent) => void;
	}

	let {
		label,
		'aria-label': ariaLabel,
		value,
		description,
		endContent,
		isDisabled: isItemDisabled = false,
		isLoading = false,
		isChecked,
		onCheck,
		align,
		onclick,
		class: className,
		...rest
	}: Props = $props();

	const ctx = getCheckboxListContext();
	$effect.pre(() => {
		if (ctx && ctx.value !== undefined && value === undefined) {
			throw new Error('CheckboxListItem requires a `value` prop when used inside CheckboxList with a value array.');
		}
	});

	const uid = $props.id();
	const id = `${uid}-checkbox`;
	const labelID = `${uid}-label`;
	const descriptionID = `${uid}-desc`;
	const isRichLabel = $derived(typeof label !== 'string');
	const namesFromVisibleLabel = $derived(isRichLabel && ariaLabel == null);
	const checkboxLabel = $derived(ariaLabel ?? (typeof label === 'string' ? label : 'Checkbox'));
	const density = $derived(ctx?.density ?? 'balanced');
	const size = $derived(density === 'compact' ? 'sm' : 'md');
	const isDisabled = $derived((ctx?.isDisabled ?? false) || isItemDisabled);
	const keepsFocusable = $derived((ctx?.hasDisabledMessage ?? false) && !isItemDisabled);
	const isReadOnly = $derived(ctx?.isReadOnly ?? false);
	const resolved: boolean | 'indeterminate' = $derived(
		ctx?.value !== undefined && value !== undefined ? ctx.value.includes(value) : (isChecked ?? false)
	);
	const isInteractive = $derived(!isReadOnly && (ctx != null || onCheck != null));
	const hasRowInteraction = $derived(isInteractive || onclick != null);
	const isCheckedRow = $derived(resolved === true && !isDisabled && !isReadOnly);
	const hasDescription = $derived(description != null && description !== '');
	let input: HTMLInputElement | undefined = $state();

	function toggle() {
		if (isDisabled || isReadOnly || isLoading) return;
		if (ctx?.value !== undefined && value !== undefined) ctx.toggle(value);
		else onCheck?.(resolved !== true);
	}
</script>

{#snippet media()}
	<span class="box-wrapper" data-size={size}>
		<input
			bind:this={input}
			{id}
			type="checkbox"
			data-checkbox-list-item=""
			{value}
			checked={resolved === true}
			indeterminate={resolved === 'indeterminate'}
			disabled={isDisabled && !keepsFocusable}
			aria-disabled={keepsFocusable || (isDisabled && keepsFocusable) ? 'true' : undefined}
			aria-readonly={isReadOnly || undefined}
			form={keepsFocusable ? '' : undefined}
			aria-label={namesFromVisibleLabel ? undefined : checkboxLabel}
			aria-labelledby={namesFromVisibleLabel ? labelID : undefined}
			aria-describedby={[hasDescription ? descriptionID : null, ctx?.disabledMessageID].filter(Boolean).join(' ') ||
				undefined}
			aria-invalid={ctx?.isInvalid || undefined}
			aria-busy={isLoading || undefined}
			class:inactive={isDisabled || isReadOnly}
			onclick={(e) => {
				if (isDisabled || isReadOnly || isLoading) {
					e.preventDefault();
					if (isReadOnly) onclick?.(e);
					return;
				}
				onclick?.(e);
			}}
			onchange={toggle}
		/>
		<CheckboxIndicator
			state={resolved === 'indeterminate' ? 'indeterminate' : resolved ? 'checked' : 'unchecked'}
			{size}
			{isDisabled}
		>
			{#snippet children()}
				{#if isLoading}
					<Spinner size="sm" shade="inherit" />
				{:else if resolved === true}
					<svg viewBox="0 0 10 10" class="check" data-size={size}>
						<path d="M8.5 2.5L4 7.5L1.5 5" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
				{:else if resolved === 'indeterminate'}
					<span class="dash"></span>
				{/if}
			{/snippet}
		</CheckboxIndicator>
	</span>
{/snippet}

<Item
	{...rest}
	as="li"
	class={['astryx-checkbox-list-item', 'astryx-indicator-scope', 'row', ctx?.hasDividers && 'divided', className]}
	startContent={media}
	interactive={hasRowInteraction ? (input ?? null) : undefined}
	{isDisabled}
	{label}
	{description}
	labelId={namesFromVisibleLabel ? labelID : undefined}
	descriptionId={descriptionID}
	{endContent}
	{align}
	{density}
	isSelected={isCheckedRow}
	aria-busy={isLoading || undefined}
/>

<style>
	@layer astryx-base {
		:global(.astryx-item.astryx-checkbox-list-item[data-selected]) { background-color: var(--color-accent-muted); }
		:global(.astryx-item.astryx-checkbox-list-item.divided) {
			border-radius: 0;
			border-block-end: var(--border-width) solid var(--color-border);
		}
		:global(.astryx-item.astryx-checkbox-list-item.divided:last-child) { border-block-end-width: 0; }
		/* The indicator, not the row, shows focus. */
		:global(.astryx-item.astryx-checkbox-list-item:has(:focus-visible)) { outline: none; }
		.box-wrapper {
			position: relative;
			display: flex;
			align-items: center;
			justify-content: center;
			flex-shrink: 0;
			isolation: isolate;
		}
		.box-wrapper[data-size='sm'] input { width: 20px; height: 20px; }
		.box-wrapper[data-size='md'] input { width: 24px; height: 24px; }
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
		input.inactive { cursor: default; }
		.box-wrapper:has(input:focus-visible) :global(.astryx-checkbox-indicator) {
			outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color);
			outline-offset: var(--focus-outline-offset);
		}
		.check[data-size='sm'] { width: calc((100% + 2 * var(--border-width)) * 12 / 20); height: calc((100% + 2 * var(--border-width)) * 12 / 20); }
		.check[data-size='md'] { width: calc((100% + 2 * var(--border-width)) * 14 / 24); height: calc((100% + 2 * var(--border-width)) * 14 / 24); }
		.dash { height: 2px; width: calc((100% + 2 * var(--border-width)) / 2); background-color: var(--color-on-accent); border-radius: var(--radius-full); }
		@media (forced-colors: active) {
			.check { color: CanvasText; }
			.dash { background-color: CanvasText; }
		}
	}
</style>
