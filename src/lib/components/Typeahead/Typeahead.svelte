<!--
  Port of Astryx `Typeahead` (packages/core/src/Typeahead/Typeahead.tsx and BaseTypeahead.tsx), MIT, Meta Platforms, Inc.
  A search field that picks one item from a `searchSource` (see `createStaticSource`). The picked
  item shows as a token; click it, or press Backspace on it without `hasClear`, to edit the search.
  Use `bind:value`, or `value` + `onChange(item)`.
  Keyboard: type to search; ArrowDown/ArrowUp wrap through results; Home/End; Enter picks; Escape
  closes. Backspace or Delete on the token clears it.
  Not yet ported: the custom `menu` (dialog or wrapped listbox), the imperative handle, result
  grouping, keeping the focus list open across picks.
-->
<script lang="ts" module>
	export type TypeaheadSize = 'sm' | 'md' | 'lg';
</script>

<script lang="ts" generics="T extends SearchableItem">
	import { onDestroy, tick, type Snippet } from 'svelte';
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
	import TypeaheadListbox from './TypeaheadListbox.svelte';
	import { SearchController } from './searchController.svelte.js';
	import type { SearchableItem, SearchSource } from './types.js';
	import { pushLayer } from '../../internal/layerStack.js';
	import type { SizeValue } from '../../types.js';
	import { getInputGroupContext, INPUT_GROUP_ITEM } from '../InputGroup/context.js';

	interface Props
		extends Omit<HTMLInputAttributes, 'value' | 'size' | 'disabled' | 'onchange' | 'type' | 'placeholder'> {
		label: string;
		searchSource: SearchSource<T>;
		value?: T | null;
		onChange?: (item: T | null) => void;
		/** Custom content for each result row (see TypeaheadItem). */
		renderItem?: Snippet<[T]>;
		placeholder?: string;
		/** Show the source's bootstrap entries when the empty field gets focus. */
		hasEntriesOnFocus?: boolean;
		maxMenuItems?: number;
		minQueryLength?: number;
		emptySearchText?: string;
		isLabelHidden?: boolean;
		description?: string;
		isOptional?: boolean;
		isRequired?: boolean;
		isDisabled?: boolean;
		disabledMessage?: string;
		labelTooltip?: string;
		/** Show a clear (×) button while an item is picked. */
		hasClear?: boolean;
		hasAutoFocus?: boolean;
		size?: TypeaheadSize;
		debounceMs?: number;
		status?: FieldStatusInput;
		statusVariant?: FieldStatusPlacement;
		startIcon?: IconName | IconComponent;
		width?: SizeValue;
		onChangeQuery?: (query: string) => void;
		onOpenChange?: (isOpen: boolean) => void;
		containerClass?: string;
		controlClass?: string;
	}

	let {
		label,
		searchSource,
		value = $bindable(null),
		onChange,
		renderItem,
		placeholder = 'Search…',
		hasEntriesOnFocus = false,
		maxMenuItems = 10,
		minQueryLength = 1,
		emptySearchText = 'No results found',
		isLabelHidden = false,
		description,
		isOptional = false,
		isRequired = false,
		isDisabled: isDisabledProp = false,
		disabledMessage,
		labelTooltip,
		hasClear = true,
		hasAutoFocus = false,
		size: sizeProp,
		debounceMs = 150,
		status,
		statusVariant = 'attached',
		startIcon,
		width,
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

	const inputGroup = getInputGroupContext();
	const isDisabled = $derived(isDisabledProp || (inputGroup?.isDisabled ?? false));
	const size = $derived(sizeProp ?? inputGroup?.size ?? 'md');
	const uid = $props.id();
	const inputId = $derived(idProp ?? `${uid}-input`);
	const listboxId = `${uid}-listbox`;
	const fieldLabelId = `${uid}-label`;
	const inputLabelId = `${uid}-input-label`;
	const tokenValueId = `${uid}-token-value`;
	const descriptionId = `${uid}-desc`;
	const statusMessageId = `${uid}-status`;
	const disabledMessageId = `${uid}-disabled-reason`;
	const itemId = (index: number) => `${listboxId}-item-${index}`;
	const showsDisabledMessage = $derived(isDisabled && !!disabledMessage);

	let wrapper: HTMLDivElement | undefined = $state();
	let inputEl: HTMLInputElement | undefined = $state();
	let tokenWrap: HTMLSpanElement | undefined = $state();
	let surface: HTMLDivElement | undefined = $state();
	let query = $state('');
	let isEditing = $state(false);
	let isKeyboardHighlight = $state(false);
	let announcement = $state('');

	const search = new SearchController<T>(() => ({
		source: searchSource,
		debounceMs,
		minQueryLength,
		hasEntriesOnFocus,
		maxMenuItems,
		announce: (m) => (announcement = m)
	}));
	onDestroy(() => search.destroy());

	const showToken = $derived(value != null && !isEditing);
	const isEmpty = $derived(search.results.length === 0 && search.hasSearched && !search.isPending);
	const open = $derived(search.isOpen && !isDisabled);

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

	function focusToken() {
		requestAnimationFrame(() => tokenWrap?.querySelector<HTMLElement>('button, [tabindex]')?.focus());
	}

	function pick(item: T) {
		if (isDisabled) return;
		search.reset();
		isEditing = false;
		if (query !== '') onChangeQuery?.('');
		query = '';
		value = item;
		onChange?.(item);
		focusToken();
	}

	function clear() {
		search.reset();
		query = '';
		isEditing = false;
		value = null;
		onChange?.(null);
		inputEl?.focus();
	}

	async function enterEditMode() {
		if (isDisabled || !value) return;
		// Move focus first, so the token's removal isn't read as focus leaving the field.
		inputEl?.focus();
		isEditing = true;
		setQuery(value.label);
		await tick();
		inputEl?.setSelectionRange(0, inputEl.value.length);
	}

	function onTokenKeydown(e: KeyboardEvent) {
		if ((e.key !== 'Backspace' && e.key !== 'Delete') || isDisabled || !value) return;
		e.preventDefault();
		if (hasClear) {
			const cleared = value.label;
			clear();
			announcement = `Cleared ${cleared}`;
		} else {
			void enterEditMode();
		}
	}

	function onInput(e: Event & { currentTarget: HTMLInputElement }) {
		if (isDisabled) return;
		isKeyboardHighlight = true;
		setQuery(e.currentTarget.value);
	}

	function onKeydown(e: KeyboardEvent & { currentTarget: EventTarget & HTMLInputElement }) {
		onkeydownProp?.(e);
		if (e.defaultPrevented || e.isComposing || isDisabled) return;
		isKeyboardHighlight = true;
		if (!open) {
			if (e.key === 'Escape') {
				if (search.isPending) {
					search.reset();
					return;
				}
				if (isEditing) {
					// Leave edit mode and return to the picked item.
					e.preventDefault();
					isEditing = false;
					query = '';
					focusToken();
				}
				return;
			}
			if (e.key === 'ArrowDown' && (hasEntriesOnFocus || query.length > 0)) {
				e.preventDefault();
				search.openFor(query);
			}
			return;
		}
		search.keydown(e, pick);
	}

	function onFocus() {
		if (!isDisabled && hasEntriesOnFocus && query === '' && !showToken) search.openFor('');
	}

	function onWrapperClick(e: MouseEvent) {
		if (isDisabled || (e.target as Element).closest('[data-typeahead-keep]')) return;
		if (showToken) {
			if (!(e.target as Element).closest('.astryx-token')) void enterEditMode();
		} else inputEl?.focus();
	}

	// Leaving the field (and its list) closes the list and ends edit mode.
	function onFocusOut(e: FocusEvent) {
		const next = e.relatedTarget as Node | null;
		if (next && (wrapper?.contains(next) || surface?.contains(next))) return;
		// Also drops a pending search, so a late answer can't reopen the list.
		search.reset();
		if (isEditing) {
			isEditing = false;
			query = '';
		}
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
			showsDisabledMessage ? disabledMessageId : null
		]
			.filter(Boolean)
			.join(' ') || undefined
	);
	const activeDescendant = $derived(
		open && search.highlightedIndex >= 0 && search.highlightedIndex < search.results.length
			? itemId(search.highlightedIndex)
			: undefined
	);
</script>

{#snippet control()}
	<Tooltip content={disabledMessage ?? ''} isEnabled={showsDisabledMessage} focusTrigger="always">
		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
		<div
			bind:this={wrapper}
			class={['astryx-typeahead', 'control', controlClass]}
			class:disabled={isDisabled}
			class:in-group={inputGroup != null}
			data-size={size}
			data-status={status?.type}
			{...{ [INPUT_GROUP_ITEM]: inputGroup ? '' : undefined }}
			onclick={onWrapperClick}
			onfocusout={onFocusOut}
		>
			{#if startIcon}<Icon icon={startIcon} size="sm" color="secondary" />{/if}
			{#if inputGroup}<VisuallyHidden id={inputLabelId}>{label}</VisuallyHidden>{/if}
			<div class="lane">
				{#if showToken && value}
					<span id={tokenValueId} hidden>{value.label}</span>
					<span class="token" bind:this={tokenWrap}>
						<Token
							label={value.label}
							{size}
							{isDisabled}
							onclick={() => void enterEditMode()}
							onkeydown={onTokenKeydown}
							aria-labelledby="{inputLabelledBy ?? fieldLabelId} {tokenValueId}"
							aria-describedby={describedBy}
						/>
					</span>
				{/if}
				<input
					{...rest}
					bind:this={inputEl}
					id={inputId}
					type="text"
					role="combobox"
					class="input"
					class:hidden={showToken}
					tabindex={showToken ? -1 : undefined}
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
					readonly={isDisabled || undefined}
					autocomplete="off"
					autocorrect="off"
					enterkeyhint="search"
					spellcheck="false"
					placeholder={showToken ? undefined : placeholder}
					value={query}
					oninput={onInput}
					onkeydown={onKeydown}
					onfocus={onFocus}
				/>
			</div>
			<span class="end">
				{#if search.isLoading}<Spinner size="sm" label="Loading" />{/if}
				{#if hasClear && value && !isDisabled}
					<span data-typeahead-keep>
						<Button
							class="astryx-input-clear-button input-clear"
							variant="ghost"
							size="sm"
							label="Clear selection"
							icon="close"
							isIconOnly
							onmousedown={(e) => e.preventDefault()}
							onclick={(e) => {
								e.stopPropagation();
								clear();
							}}
						/>
					</span>
				{/if}
				{#if status && statusVariant !== 'detached'}<Icon icon={status.type} size="md" color={status.type} />{/if}
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
		matchAnchorWidth
		bind:element={surface}
		class="astryx-typeahead-popup"
	>
		<TypeaheadListbox
			id={listboxId}
			{itemId}
			results={search.results}
			highlightedIndex={search.highlightedIndex}
			{isKeyboardHighlight}
			isSelected={(item) => item.id === value?.id}
			{isEmpty}
			{emptySearchText}
			{size}
			{renderItem}
			onselect={pick}
			onhover={(i) => {
				isKeyboardHighlight = false;
				search.highlightedIndex = i;
			}}
		/>
	</Layer>
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
		.in-group { flex: 1; min-width: 0; }
		.in-group.disabled { opacity: 1; }

		.lane {
			position: relative;
			display: flex;
			align-items: center;
			align-self: stretch;
			flex: 1;
			min-width: 0;
			padding-inline-start: calc(var(--spacing-1) - 1px);
		}
		.token {
			position: absolute;
			inset-block: 0;
			inset-inline-start: 0;
			display: flex;
			align-items: center;
			max-width: 100%;
		}
		.input {
			display: block;
			flex: 1;
			min-width: 0;
			border: 0 none;
			padding: 0;
			font-family: var(--font-family-body);
			font-size: var(--text-body-size);
			line-height: var(--text-body-leading);
			color: var(--color-text-primary);
			background-color: transparent;
			outline: none;
		}
		@media (pointer: coarse) {
			@supports (-webkit-touch-callout: none) {
				.input { font-size: max(1rem, var(--text-body-size)); }
			}
		}
		.input::placeholder { color: var(--color-text-secondary); }
		.input.hidden { opacity: 0; pointer-events: none; }
		.disabled .input { cursor: default; }
		.end { display: flex; align-items: center; gap: var(--spacing-1); margin-inline-start: auto; }
		.control :global(.input-clear) { height: 20px; color: var(--color-icon-secondary); }

		:global(.astryx-layer.astryx-typeahead-popup) {
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
			:global(.astryx-layer.astryx-typeahead-popup) { border: 1px solid CanvasText; }
		}
	}
</style>
