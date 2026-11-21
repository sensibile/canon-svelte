<!--
  Port of Astryx `Tokenizer` (packages/core/src/Tokenizer/Tokenizer.tsx), MIT, Meta Platforms, Inc.
  A search field that collects many items from a `searchSource` as removable tokens.
  Use `bind:value`, or `value` + `onChange(items, change)`; `change` says what happened
  ({ type: 'add' | 'create' | 'remove', item }). Chosen items drop out of the results.
  `hasCreate` offers the query itself as a new item; `maxEntries` caps the count.
  Keyboard: type to search; ArrowDown/ArrowUp wrap through results; Enter adds; Escape closes;
  Backspace in the empty field removes the last token.
  Not yet ported: token overflow behaviors ("+N more" when unfocused), the bottom-sheet
  presentation, reordering, the custom `menu`, the imperative handle.
-->
<script lang="ts" module>
	import type { SearchableItem } from '../Typeahead/types.js';

	export type TokenizerSize = 'sm' | 'md' | 'lg';
	export type TokenizerChange<T extends SearchableItem> =
		| { item: T; type: 'add' }
		| { item: T; type: 'create' }
		| { item: T; type: 'remove' };
</script>

<script lang="ts" generics="T extends SearchableItem">
	import { onDestroy, type Snippet } from 'svelte';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import Field from '../Field/Field.svelte';
	import type { FieldStatusInput, FieldStatusPlacement } from '../Field/types.js';
	import Icon, { type IconComponent } from '../Icon/Icon.svelte';
	import type { IconName } from '../Icon/defaultIcons.js';
	import Spinner from '../Spinner/Spinner.svelte';
	import Button from '../Button/Button.svelte';
	import Token from '../Token/Token.svelte';
	import Layer from '../Layer/Layer.svelte';
	import VisuallyHidden from '../VisuallyHidden/VisuallyHidden.svelte';
	import Tooltip from '../Tooltip/Tooltip.svelte';
	import TypeaheadItem from '../Typeahead/TypeaheadItem.svelte';
	import TypeaheadListbox from '../Typeahead/TypeaheadListbox.svelte';
	import { SearchController } from '../Typeahead/searchController.svelte.js';
	import type { SearchSource } from '../Typeahead/types.js';
	import { pushLayer } from '../../internal/layerStack.js';
	import { cssSize, type SizeValue } from '../../types.js';
	import { getInputGroupContext, INPUT_GROUP_ITEM, setInputGroupContext } from '../InputGroup/context.js';

	interface Props
		extends Omit<HTMLInputAttributes, 'value' | 'size' | 'disabled' | 'onchange' | 'type' | 'placeholder'> {
		label: string;
		searchSource: SearchSource<T>;
		value?: T[];
		onChange?: (items: T[], change: TokenizerChange<T>) => void;
		/** Custom content for each result row (see TypeaheadItem). */
		renderItem?: Snippet<[T]>;
		/** Custom token; call `remove` to remove it. */
		renderToken?: Snippet<[T, () => void]>;
		maxEntries?: number;
		placeholder?: string;
		hasEntriesOnFocus?: boolean;
		maxMenuItems?: number;
		/** The results list width in px; defaults to the field's width. */
		menuWidth?: number;
		minQueryLength?: number;
		emptySearchText?: string;
		hasCreate?: boolean;
		/** Show a "Clear all" button while there are tokens. */
		hasClear?: boolean;
		endContent?: Snippet;
		isLabelHidden?: boolean;
		description?: string;
		isOptional?: boolean;
		isRequired?: boolean;
		isDisabled?: boolean;
		disabledMessage?: string;
		labelTooltip?: string;
		hasAutoFocus?: boolean;
		size?: TokenizerSize;
		debounceMs?: number;
		status?: FieldStatusInput;
		statusVariant?: FieldStatusPlacement;
		startIcon?: IconName | IconComponent;
		width?: SizeValue;
		/** The `name` of hidden inputs carrying the item ids, for form submission. */
		htmlName?: string;
		onChangeQuery?: (query: string) => void;
		onOpenChange?: (isOpen: boolean) => void;
		containerClass?: string;
		controlClass?: string;
	}

	let {
		label,
		searchSource,
		value = $bindable([]),
		onChange,
		renderItem,
		renderToken,
		maxEntries,
		placeholder = 'Search…',
		hasEntriesOnFocus = false,
		maxMenuItems = 10,
		menuWidth,
		minQueryLength = 1,
		emptySearchText = 'No results found',
		hasCreate = false,
		hasClear = false,
		endContent,
		isLabelHidden = false,
		description,
		isOptional = false,
		isRequired = false,
		isDisabled: isDisabledProp = false,
		disabledMessage,
		labelTooltip,
		hasAutoFocus = false,
		size: sizeProp,
		debounceMs = 150,
		status,
		statusVariant = 'attached',
		startIcon,
		width,
		htmlName,
		onChangeQuery,
		onOpenChange,
		containerClass,
		controlClass,
		id: idProp,
		onkeydown: onkeydownProp,
		'aria-describedby': describedByProp,
		'aria-labelledby': labelledByProp,
		...rest
	}: Props = $props();

	const CREATE_PREFIX = '__astryx_tokenizer_create__';

	const inputGroup = getInputGroupContext();
	// Internal buttons (clear, steppers) belong to this control, not to the group row.
	setInputGroupContext(null);
	const isDisabled = $derived(isDisabledProp || (inputGroup?.isDisabled ?? false));
	const size = $derived(sizeProp ?? inputGroup?.size ?? 'md');
	const uid = $props.id();
	const inputId = $derived(idProp ?? `${uid}-input`);
	const listboxId = `${uid}-listbox`;
	const fieldLabelId = `${uid}-label`;
	const inputLabelId = `${uid}-input-label`;
	const descriptionId = `${uid}-desc`;
	const statusMessageId = `${uid}-status`;
	const disabledMessageId = `${uid}-disabled-reason`;
	const limitId = `${uid}-limit`;
	const itemId = (index: number) => `${listboxId}-item-${index}`;
	const showsDisabledMessage = $derived(isDisabled && !!disabledMessage);

	let wrapper: HTMLDivElement | undefined = $state();
	let inputEl: HTMLInputElement | undefined = $state();
	let surface: HTMLDivElement | undefined = $state();
	let query = $state('');
	let isKeyboardHighlight = $state(false);
	let announcement = $state('');

	const isAtMax = $derived(maxEntries != null && value.length >= maxEntries);
	const selectedIds = $derived(new Set(value.map((i) => i.id)));
	const selectedLabels = $derived(new Set(value.map((i) => i.label.toLowerCase())));

	const search = new SearchController<T>(() => ({
		source: searchSource,
		debounceMs,
		minQueryLength,
		hasEntriesOnFocus,
		maxMenuItems,
		exclude: (item) => selectedIds.has(item.id),
		announce: (m) => (announcement = m)
	}));
	onDestroy(() => search.destroy());

	/** The "Create …" row, offered after the results when nothing matches the query exactly. */
	const createEntry = $derived.by((): T | null => {
		const trimmed = query.trim();
		if (!hasCreate || trimmed === '' || search.isPending) return null;
		const wanted = trimmed.toLowerCase();
		if (selectedIds.has(trimmed) || selectedLabels.has(wanted)) return null;
		// Check past the display cap, so an exact match that isn't shown still blocks creation.
		if (search.allResults.some((i) => i.label.toLowerCase() === wanted)) return null;
		return { id: `${CREATE_PREFIX}${trimmed}`, label: `Create "${trimmed}"` } as T;
	});
	const results = $derived(createEntry ? [...search.results, createEntry] : search.results);
	const isEmpty = $derived(results.length === 0 && search.hasSearched && !search.isPending);
	const open = $derived(!isDisabled && !isAtMax && search.isOpen);

	// With only the create row to show, highlight it.
	$effect.pre(() => {
		if (createEntry && search.isOpen && search.results.length === 0 && search.highlightedIndex < 0)
			search.highlightedIndex = 0;
	});

	let lastOpen = false;
	$effect(() => {
		const o = open;
		if (o !== lastOpen) {
			lastOpen = o;
			onOpenChange?.(o);
		}
	});

	function setQuery(next: string) {
		query = next;
		onChangeQuery?.(next);
		search.queryChanged(next);
	}

	function add(item: T) {
		if (isDisabled || isAtMax) return;
		let added: T;
		let change: TokenizerChange<T>;
		if (item.id.startsWith(CREATE_PREFIX)) {
			const created = item.id.slice(CREATE_PREFIX.length);
			if (selectedIds.has(created) || selectedLabels.has(created.toLowerCase())) return;
			added = { id: created, label: created } as T;
			change = { item: added, type: 'create' };
		} else {
			if (selectedIds.has(item.id)) return;
			added = item;
			change = { item, type: 'add' };
		}
		const next = [...value, added];
		value = next;
		onChange?.(next, change);
		announcement = `Added ${added.label}`;
		search.reset();
		if (query !== '') onChangeQuery?.('');
		query = '';
		inputEl?.focus();
		// Keep offering entries while the field stays focused.
		if (hasEntriesOnFocus && !(maxEntries != null && next.length >= maxEntries)) queueMicrotask(() => search.openFor(''));
	}

	function remove(item: T) {
		if (isDisabled) return;
		const next = value.filter((v) => v.id !== item.id);
		value = next;
		onChange?.(next, { item, type: 'remove' });
		announcement = `Removed ${item.label}`;
		inputEl?.focus();
		refreshResults();
	}

	/** After a removal, re-run the current search so removed items can be offered again. */
	function refreshResults() {
		if (isDisabled || document.activeElement !== inputEl) return;
		if (search.isOpen || (query === '' && hasEntriesOnFocus)) queueMicrotask(() => search.openFor(query));
	}

	function clearAll() {
		if (isDisabled || value.length === 0) return;
		const last = value[value.length - 1];
		value = [];
		onChange?.([], { item: last, type: 'remove' });
		announcement = 'All items removed';
		inputEl?.focus();
		refreshResults();
	}

	function onKeydown(e: KeyboardEvent & { currentTarget: EventTarget & HTMLInputElement }) {
		onkeydownProp?.(e);
		if (e.defaultPrevented || e.isComposing || isDisabled) return;
		isKeyboardHighlight = true;
		if (e.key === 'Backspace' && e.currentTarget.value === '' && value.length > 0) {
			e.preventDefault();
			remove(value[value.length - 1]);
			return;
		}
		if (!open) {
			if (e.key === 'Escape' && search.isPending) {
				e.preventDefault();
				search.reset();
			}
			else if (e.key === 'ArrowDown' && (hasEntriesOnFocus || query.length > 0)) {
				e.preventDefault();
				search.openFor(query);
			}
			return;
		}
		// Navigation runs over the results plus the create row.
		const n = results.length;
		const i = search.highlightedIndex;
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				if (n) search.highlightedIndex = i < n - 1 ? i + 1 : 0;
				return;
			case 'ArrowUp':
				e.preventDefault();
				if (n) search.highlightedIndex = i > 0 ? i - 1 : n - 1;
				return;
			case 'Home':
				e.preventDefault();
				if (n) search.highlightedIndex = 0;
				return;
			case 'End':
				e.preventDefault();
				if (n) search.highlightedIndex = n - 1;
				return;
			case 'Enter':
				e.preventDefault();
				if (results[i]) add(results[i]);
				return;
			case 'Escape':
				e.preventDefault();
				search.close();
				return;
		}
		search.keydown(e, add);
	}

	function onFocus() {
		if (!isDisabled && hasEntriesOnFocus && query === '' && !isAtMax) search.openFor('');
	}

	function onWrapperClick(e: MouseEvent) {
		if (isDisabled || (e.target as Element).closest('button, a, [data-tokenizer-keep]')) return;
		inputEl?.focus();
	}

	function onFocusOut(e: FocusEvent) {
		const next = e.relatedTarget as Node | null;
		if (next && (wrapper?.contains(next) || surface?.contains(next))) return;
		search.reset();
	}

	$effect(() => {
		const el = surface;
		if (!open || !el) return;
		const doc = el.ownerDocument;
		const layer = pushLayer();
		const onPointerDown = (e: PointerEvent) => {
			if (!layer.isTop()) return;
			const t = e.target as Node;
			if (el.contains(t) || wrapper?.contains(t)) return;
			search.reset();
		};
		doc.addEventListener('pointerdown', onPointerDown, true);
		return () => {
			layer.remove();
			doc.removeEventListener('pointerdown', onPointerDown, true);
		};
	});

	$effect(() => {
		const i = search.highlightedIndex;
		if (!open || i < 0 || !surface) return;
		surface.querySelector(`#${CSS.escape(itemId(i))}`)?.scrollIntoView({ block: 'nearest' });
	});

	$effect(() => {
		if (hasAutoFocus) inputEl?.focus();
	});

	const inputLabelledBy = $derived(
		[inputGroup ? [inputGroup.labelID, inputLabelId].join(' ') : labelledByProp ? fieldLabelId : null, labelledByProp]
			.filter(Boolean)
			.join(' ') || undefined
	);
	const describedBy = $derived(
		[
			describedByProp,
			inputGroup?.describedByIDs,
			description && !inputGroup ? descriptionId : null,
			!inputGroup && status?.message ? statusMessageId : null,
			showsDisabledMessage ? disabledMessageId : null,
			isAtMax ? limitId : null
		]
			.filter(Boolean)
			.join(' ') || undefined
	);
	const activeDescendant = $derived(
		open && search.highlightedIndex >= 0 && search.highlightedIndex < results.length
			? itemId(search.highlightedIndex)
			: undefined
	);
</script>

{#snippet control()}
	<Tooltip content={disabledMessage ?? ''} isEnabled={showsDisabledMessage} focusTrigger="always">
		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
		<div
			bind:this={wrapper}
			class={['astryx-tokenizer', 'control', controlClass]}
			class:disabled={isDisabled}
			class:in-group={inputGroup != null}
			class:has-tokens={value.length > 0}
			data-size={size}
			data-status={status?.type}
			{...{ [INPUT_GROUP_ITEM]: inputGroup ? '' : undefined }}
			onclick={onWrapperClick}
			onfocusout={onFocusOut}
		>
			{#if startIcon}<span class="start"><Icon icon={startIcon} size="sm" color="secondary" /></span>{/if}
			{#if inputGroup}<VisuallyHidden id={inputLabelId}>{label}</VisuallyHidden>{/if}
			{#each value as item (item.id)}
				<span class="token">
					{#if renderToken}
						{@render renderToken(item, () => remove(item))}
					{:else}
						<Token label={item.label} {size} {isDisabled} onRemove={() => remove(item)} />
					{/if}
				</span>
			{/each}
			<input
				{...rest}
				bind:this={inputEl}
				id={inputId}
				type="text"
				role="combobox"
				class="input"
				class:at-max={isAtMax}
				aria-expanded={open}
				aria-controls={listboxId}
				aria-activedescendant={activeDescendant}
				aria-autocomplete="list"
				aria-busy={search.isLoading || undefined}
				aria-labelledby={inputLabelledBy}
				aria-describedby={describedBy}
				aria-required={isRequired && !isOptional ? 'true' : undefined}
				aria-invalid={status?.type === 'error' ? 'true' : undefined}
				aria-disabled={isDisabled ? 'true' : undefined}
				readonly={isDisabled || isAtMax || undefined}
				autocomplete="off"
				autocorrect="off"
				enterkeyhint="search"
				spellcheck="false"
				placeholder={value.length === 0 ? placeholder : undefined}
				value={query}
				oninput={(e) => {
					if (isDisabled || isAtMax) return;
					isKeyboardHighlight = true;
					setQuery(e.currentTarget.value);
				}}
				onkeydown={onKeydown}
				onfocus={onFocus}
			/>
			{#if isAtMax}<VisuallyHidden id={limitId}>Limit of {maxEntries} reached</VisuallyHidden>{/if}
			{#if htmlName != null && !isDisabled}
				{#each value as item (item.id)}<input type="hidden" name={htmlName} form={rest.form} value={item.id} />{/each}
			{/if}
			<span class="end">
				{#if search.isLoading}<Spinner size="sm" label="Loading" />{/if}
				{#if hasClear && value.length > 0 && !isDisabled}
					<span data-tokenizer-keep>
						<Button
							class="astryx-input-clear-button input-clear"
							variant="ghost"
							size="sm"
							label="Clear all"
							icon="close"
							isIconOnly
							onmousedown={(e) => e.preventDefault()}
							onclick={(e) => {
								e.stopPropagation();
								clearAll();
							}}
						/>
					</span>
				{/if}
				{#if status && statusVariant !== 'detached'}<Icon icon={status.type} size="md" color={status.type} />{/if}
				{@render endContent?.()}
			</span>
		</div>
	</Tooltip>
	{#if showsDisabledMessage}<VisuallyHidden id={disabledMessageId}>{disabledMessage}</VisuallyHidden>{/if}
	<VisuallyHidden><span aria-live="polite" aria-atomic="true">{announcement}</span></VisuallyHidden>
	<Layer
		open={open && wrapper != null}
		anchor={wrapper}
		placement="below"
		alignment="start"
		offset={4}
		matchAnchorWidth={menuWidth == null}
		bind:element={surface}
		class="astryx-tokenizer-popup"
		style={menuWidth != null ? `width: ${cssSize(menuWidth)}` : undefined}
	>
		<TypeaheadListbox
			id={listboxId}
			{itemId}
			{results}
			highlightedIndex={search.highlightedIndex}
			{isKeyboardHighlight}
			isSelected={() => false}
			{isEmpty}
			{emptySearchText}
			{size}
			renderItem={renderItem ? resultRow : undefined}
			onselect={add}
			onhover={(i) => {
				isKeyboardHighlight = false;
				search.highlightedIndex = i;
			}}
		/>
	</Layer>
{/snippet}

<!-- The synthetic create row always uses the default content; real results keep renderItem. -->
{#snippet resultRow(item: T)}
	{#if item === createEntry || !renderItem}<TypeaheadItem {item} />{:else}{@render renderItem(item)}{/if}
{/snippet}

{#if inputGroup}
	{@render control()}
{:else}
	<Field
		class={containerClass}
		{label}
		{isLabelHidden}
		{description}
		inputID={inputId}
		labelID={fieldLabelId}
		descriptionID={description ? descriptionId : undefined}
		{isOptional}
		{isRequired}
		{isDisabled}
		{labelTooltip}
		status={status
			? { type: status.type, message: status.message, messageID: status.message ? statusMessageId : undefined }
			: undefined}
		{statusVariant}
		{width}
	>
		{@render control()}
	</Field>
{/if}

<style>
	@layer astryx-base {
		.control {
			box-sizing: border-box;
			position: relative;
			z-index: 1;
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: var(--spacing-1);
			padding-block: calc(var(--spacing-1) - 1px);
			padding-inline: var(--spacing-2);
			border: var(--border-width) solid var(--color-border-emphasized);
			--_field-radius: var(--radius-element);
			border-radius: var(--_field-radius);
			background-color: var(--color-background-surface);
			transition-property: border-color, box-shadow;
			transition-duration: var(--duration-fast);
			transition-timing-function: var(--ease-standard);
			cursor: text;
		}
		.control.has-tokens { padding-inline-start: calc(var(--spacing-1) - 1px); row-gap: calc(var(--spacing-1) - 1px); }
		@media (prefers-reduced-motion: reduce), (pointer: coarse) {
			.control { transition-duration: 0s; }
		}
		.control[data-size='sm'] { min-height: var(--size-element-sm); }
		.control[data-size='md'] { min-height: var(--size-element-md); }
		.control[data-size='lg'] { min-height: var(--size-element-lg); }
		@media (hover: hover) {
			.control:not(.disabled):hover:not(:focus-within) {
				box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--color-border-emphasized) 30%, transparent);
			}
			.control[data-status='warning']:not(.disabled):hover:not(:focus-within) { box-shadow: var(--shadow-inset-warning); }
			.control[data-status='error']:not(.disabled):hover:not(:focus-within) { box-shadow: var(--shadow-inset-error); }
			.control[data-status='success']:not(.disabled):hover:not(:focus-within) { box-shadow: var(--shadow-inset-success); }
		}
		.control:focus-within:not(.disabled) {
			border-color: var(--color-accent);
			box-shadow: inset 0 0 0 2px var(--color-accent-muted);
		}
		@media (forced-colors: active) {
			.control:focus-within { border-color: Highlight; }
		}
		.control[data-status='warning'] { border-color: var(--color-border-warning); }
		.control[data-status='error'] { border-color: var(--color-border-error); }
		.control[data-status='success'] { border-color: var(--color-border-success); }
		.disabled { cursor: default; opacity: 0.5; }
		.in-group { flex: 1; min-width: 0; flex-wrap: nowrap; overflow-x: auto; scrollbar-width: none; }
		.in-group.disabled { opacity: 1; }

		.start { display: inline-flex; }
		.has-tokens .start { margin-inline-start: calc(var(--spacing-2) - var(--spacing-1) + 1px); }
		.token { display: flex; flex-shrink: 0; max-width: 100%; }
		.input {
			box-sizing: border-box;
			display: block;
			flex: 1 1 40px;
			min-width: 40px;
			width: 0;
			border: 0 none;
			padding: 0;
			font-family: var(--font-family-body);
			font-size: var(--text-body-size);
			line-height: var(--text-body-leading);
			color: var(--color-text-primary);
			background-color: transparent;
			outline: none;
		}
		.has-tokens .input { padding-inline-start: calc(var(--spacing-2) - var(--spacing-1) + 1px); }
		@media (pointer: coarse) {
			@supports (-webkit-touch-callout: none) {
				.input { font-size: max(1rem, var(--text-body-size)); }
			}
		}
		.input::placeholder { color: var(--color-text-secondary); }
		.input.at-max { flex: 0 0 0; min-width: 0; width: 0; opacity: 0; position: absolute; }
		.disabled .input { cursor: default; }
		.end { display: flex; align-items: center; gap: var(--spacing-2); margin-inline-start: auto; flex-shrink: 0; }
		.has-tokens .end { margin-inline-end: calc(var(--spacing-2) - var(--spacing-1) + 1px); }
		.end:empty { display: none; }
		.control :global(.input-clear) { height: 20px; color: var(--color-icon-secondary); }

		:global(.astryx-layer.astryx-tokenizer-popup) {
			box-sizing: border-box;
			display: flex;
			flex-direction: column;
			background-color: var(--color-background-popover);
			color: var(--color-text-primary);
			border-radius: var(--radius-container);
			box-shadow: var(--shadow-low);
			overflow: hidden;
		}
		@media (forced-colors: active) {
			:global(.astryx-layer.astryx-tokenizer-popup) { border: 1px solid CanvasText; }
		}
	}
</style>
