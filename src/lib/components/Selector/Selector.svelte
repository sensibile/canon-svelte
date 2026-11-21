<!--
  Port of Astryx `Selector` (packages/core/src/Selector/Selector.tsx), MIT, Meta Platforms, Inc.
  A select-one control: a combobox button that opens a listbox of options in a popover.
  Use `bind:value`, or `value` + `onChange(value)`. With `hasClear`, the value can be cleared to null.
  Keyboard: ArrowDown/ArrowUp/Enter/Space open; arrows, Home/End and Page keys move; Enter or Space
  picks; Escape and Tab close. Typing a label's first letters picks it while closed and highlights
  it while open. With `hasSearch`, a search field heads the list and typing on the trigger seeds it.
  Not yet ported: the bottom-sheet presentation on touch, positioning the list over the selected
  option, `changeAction` (optimistic async updates), the "tooltip" status variant.
-->
<script lang="ts" module>
	export type SelectorSize = 'sm' | 'md' | 'lg';
	export type SelectorVariant = 'input' | 'secondary' | 'ghost';
	export type SelectorStatusType = 'warning' | 'error' | 'success';
	export interface SelectorStatus {
		type: SelectorStatusType;
		message?: string;
	}
</script>

<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import type { FieldStatusPlacement } from '../Field/types.js';
	import Icon, { type IconComponent } from '../Icon/Icon.svelte';
	import type { IconName } from '../Icon/defaultIcons.js';
	import Divider from '../Divider/Divider.svelte';
	import SelectorOptionRow from './SelectorOptionRow.svelte';
	import SelectorShell, { selectorIds } from './SelectorShell.svelte';
	import {
		buildOptionRows,
		createTypeahead,
		enabledEdgeIndex,
		followHighlight,
		getSelectableOptions,
		isShortcutChord,
		optionMatchesQuery,
		stepEnabled,
		type IndicatorPosition,
		type SelectorOptionData,
		type SelectorOptionType
	} from './options.js';
	import type { LayerPlacement } from '../../internal/position.js';
	import type { SizeValue } from '../../types.js';
	import { getInputGroupContext, setInputGroupContext } from '../InputGroup/context.js';

	interface Props extends Omit<HTMLAttributes<HTMLButtonElement>, 'onchange' | 'placeholder'> {
		label: string;
		options: SelectorOptionType[];
		/** The selected option's value; null or undefined when nothing is selected. */
		value?: string | null;
		onChange?: (value: string | null) => void;
		/** Show a clear (×) button while there's a value; clearing sets it to null. */
		hasClear?: boolean;
		isLabelHidden?: boolean;
		description?: string;
		isOptional?: boolean;
		isRequired?: boolean;
		isDisabled?: boolean;
		isReadOnly?: boolean;
		/** Why the control is disabled; shown in a tooltip on hover and focus while disabled. */
		disabledMessage?: string;
		labelTooltip?: string;
		isLoading?: boolean;
		placeholder?: string;
		size?: SelectorSize;
		variant?: SelectorVariant;
		status?: SelectorStatus;
		statusVariant?: FieldStatusPlacement;
		width?: SizeValue;
		startIcon?: IconName | IconComponent;
		/** Custom content for each option row. */
		renderOption?: Snippet<[SelectorOptionData]>;
		/** Custom content for the selected value in the trigger. */
		renderValue?: Snippet<[SelectorOptionData]>;
		indicatorPosition?: IndicatorPosition;
		hasSearch?: boolean;
		searchPlaceholder?: string;
		emptyText?: string;
		emptySearchText?: string;
		placement?: LayerPlacement;
		isDefaultOpen?: boolean;
		/** The `name` of a hidden input carrying the value, for form submission. */
		htmlName?: string;
		/** The id of a form outside this one that the hidden inputs belong to. */
		form?: string;
		containerClass?: string;
		controlClass?: string;
	}

	let {
		label,
		options,
		value = $bindable(),
		onChange,
		hasClear = false,
		isLabelHidden = false,
		description,
		isOptional = false,
		isRequired = false,
		isDisabled: isDisabledProp = false,
		isReadOnly = false,
		disabledMessage,
		labelTooltip,
		isLoading = false,
		placeholder = 'Select…',
		size: sizeProp,
		variant = 'input',
		status,
		statusVariant = 'attached',
		width,
		startIcon,
		renderOption,
		renderValue,
		indicatorPosition = 'end',
		hasSearch = false,
		searchPlaceholder = 'Search…',
		emptyText = 'No options',
		emptySearchText = 'No results found',
		placement = 'below',
		isDefaultOpen = false,
		htmlName,
		form,
		containerClass,
		controlClass,
		id: idProp,
		onkeydown: onkeydownProp,
		'aria-describedby': describedByProp,
		'aria-labelledby': labelledByProp,
		...rest
	}: Props = $props();

	const inputGroup = getInputGroupContext();
	// Internal buttons (clear, steppers) belong to this control, not to the group row.
	setInputGroupContext(null);
	const isDisabled = $derived(isDisabledProp || (inputGroup?.isDisabled ?? false));
	const isEffectivelyReadOnly = $derived(isReadOnly && !isDisabled);
	const size = $derived(sizeProp ?? inputGroup?.size ?? 'md');
	// Non-input variants have no border to attach a status message to.
	const effectiveStatusVariant = $derived(variant !== 'input' ? 'detached' : statusVariant);
	const isEffectivelyRequired = $derived(isRequired && !isOptional);

	const uid = $props.id();
	const ids = selectorIds(uid);
	const triggerId = $derived(idProp ?? ids.trigger);
	const itemId = ids.item;

	let control: HTMLDivElement | undefined = $state();
	let trigger: HTMLButtonElement | undefined = $state();
	let surface: HTMLDivElement | undefined = $state();
	let searchInput: HTMLInputElement | undefined = $state();
	let open = $state(false);
	let query = $state('');
	let highlightedIndex = $state(-1);
	// Keyboard highlights get a focus ring; pointer hover only tints the row.
	let isKeyboardHighlight = $state(false);
	let announcement = $state('');

	const selectable = $derived(getSelectableOptions(options));
	const searchQuery = $derived(hasSearch ? query : '');
	const filtered = $derived(searchQuery ? selectable.filter((o) => optionMatchesQuery(o, searchQuery)) : selectable);
	const rows = $derived(buildOptionRows(options, searchQuery));
	const selectedIndex = $derived(selectable.findIndex((o) => o.value === value));
	const selectedItem = $derived(selectedIndex >= 0 ? selectable[selectedIndex] : undefined);
	const showsDisabledMessage = $derived(isDisabled && !!disabledMessage);

	// Keep the highlight on a sensible option when the list changes under it; a new query resets it.
	let previousList: SelectorOptionData[] = [];
	let previousQuery = '';
	$effect.pre(() => {
		const next = filtered;
		const q = searchQuery;
		untrack(() => {
			if (q !== previousQuery) highlightedIndex = -1;
			else if (highlightedIndex >= 0 && next !== previousList)
				highlightedIndex = followHighlight(previousList, next, highlightedIndex);
			previousList = next;
			previousQuery = q;
		});
	});

	const typeahead = createTypeahead();

	function openingIndex(fromEnd: boolean): number {
		if (selectedIndex >= 0 && !filtered[selectedIndex]?.disabled && filtered[selectedIndex]?.value === value)
			return selectedIndex;
		return enabledEdgeIndex(filtered, fromEnd);
	}

	function show(highlight: 'start' | 'end' | 'none' = 'start') {
		if (isDisabled || isEffectivelyReadOnly) return false;
		open = true;
		if (!hasSearch && highlight !== 'none') highlightedIndex = openingIndex(highlight === 'end');
		return true;
	}

	function hide(restoreFocus = false) {
		if (!open) return;
		const hadFocusInside = surface?.contains(document.activeElement) ?? false;
		open = false;
		query = '';
		highlightedIndex = -1;
		announcement = '';
		typeahead.reset();
		if (restoreFocus || hadFocusInside) trigger?.focus({ preventScroll: true });
	}

	function commit(next: string | null) {
		if (isDisabled || isEffectivelyReadOnly) return;
		value = next;
		onChange?.(next);
	}

	function selectItem(item: SelectorOptionData | undefined) {
		if (!item || item.disabled) return;
		commit(item.value);
		hide(true);
	}

	function clearValue(e: MouseEvent) {
		typeahead.reset();
		commit(null);
		trigger?.focus({ preventScroll: e.detail !== 0 });
	}

	function announceResults(q: string) {
		if (!q || isLoading) {
			announcement = '';
			return;
		}
		const count = selectable.filter((o) => optionMatchesQuery(o, q)).length;
		if (count > 0) announcement = `${count} ${count === 1 ? 'result' : 'results'}`;
	}

	function setQuery(next: string) {
		query = next;
		announceResults(next);
	}

	/** Shared listbox keys for the trigger and the search field. Returns true when handled. */
	function navigate(e: KeyboardEvent): boolean {
		const enabled = filtered.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0);
		switch (e.key) {
			case 'ArrowDown':
			case 'ArrowUp': {
				e.preventDefault();
				const down = e.key === 'ArrowDown';
				if (!open) show(down ? 'start' : 'end');
				else if (highlightedIndex < 0) highlightedIndex = enabledEdgeIndex(filtered, !down);
				else highlightedIndex = stepEnabled(filtered, highlightedIndex, down ? 1 : -1);
				return true;
			}
			case 'Home':
			case 'PageUp':
				if (!open) return false;
				e.preventDefault();
				if (enabled.length) highlightedIndex = enabled[0];
				return true;
			case 'End':
			case 'PageDown':
				if (!open) return false;
				e.preventDefault();
				if (enabled.length) highlightedIndex = enabled[enabled.length - 1];
				return true;
			case ' ':
				if (hasSearch) return false;
			// falls through
			case 'Enter':
				e.preventDefault();
				if (open && highlightedIndex >= 0) selectItem(filtered[highlightedIndex]);
				else if (!open) show();
				return true;
			case 'Escape':
				if (!open) return false;
				e.preventDefault();
				e.stopPropagation();
				hide(true);
				return true;
			case 'Tab':
				if (open) hide();
				return false;
		}
		return false;
	}

	function onTriggerKeydown(e: KeyboardEvent & { currentTarget: EventTarget & HTMLButtonElement }) {
		onkeydownProp?.(e);
		if (e.defaultPrevented || isDisabled || isEffectivelyReadOnly) return;
		isKeyboardHighlight = true;
		const printable = e.key.length === 1 && !isShortcutChord(e);
		if (!hasSearch && printable && (e.key !== ' ' || typeahead.isActive)) {
			e.preventDefault();
			const labels = selectable.map((o) => o.label ?? o.value);
			const from = open ? highlightedIndex : selectedIndex;
			const match = typeahead.match(e.key, labels, (i) => selectable[i]?.disabled === true, from);
			if (match < 0) return;
			if (open) highlightedIndex = match;
			else if (selectable[match].value !== value) {
				commit(selectable[match].value);
				announcement = selectable[match].label ?? selectable[match].value;
			}
			return;
		}
		if (navigate(e)) return;
		if ((e.key === 'Delete' || e.key === 'Backspace') && !hasSearch && !open && hasClear && value != null) {
			e.preventDefault();
			typeahead.reset();
			commit(null);
			return;
		}
		if (hasSearch && printable) {
			// Typing on the trigger opens the list and seeds the search with that character.
			e.preventDefault();
			if (open || show('none')) setQuery(query + e.key);
		}
	}

	function onSearchKeydown(e: KeyboardEvent) {
		if (e.isComposing) return;
		isKeyboardHighlight = true;
		if (['ArrowDown', 'ArrowUp', 'PageUp', 'PageDown', 'Enter', 'Escape'].includes(e.key)) {
			navigate(e);
		} else if (e.key === 'Tab' && (e.shiftKey || !query)) {
			hide();
		}
	}

	function onControlClick(e: MouseEvent) {
		if (isDisabled || isEffectivelyReadOnly) return;
		isKeyboardHighlight = e.detail === 0;
		if (open) hide();
		else show();
		trigger?.focus({ preventScroll: true });
	}

	$effect(() => {
		if (isEffectivelyReadOnly && open) untrack(() => hide());
	});

	let didDefaultOpen = false;
	$effect(() => {
		if (didDefaultOpen || !control) return;
		didDefaultOpen = true;
		if (isDefaultOpen) untrack(() => show());
	});

	const triggerLabelledBy = $derived.by(() => {
		const name = inputGroup ? [inputGroup.labelID, ids.inputLabel].filter(Boolean).join(' ') : ids.fieldLabel;
		const parts = [name, labelledByProp];
		// With search, the trigger is a plain button, so its value must be part of its name.
		if (hasSearch && !isEffectivelyReadOnly) parts.push(ids.valueText);
		return parts.filter(Boolean).join(' ') || undefined;
	});
	const describedBy = $derived(
		[
			describedByProp,
			inputGroup?.describedByIDs,
			description && !inputGroup ? ids.description : null,
			!inputGroup && status?.message ? ids.statusMessage : null,
			showsDisabledMessage ? ids.disabledMessage : null,
			isEffectivelyReadOnly ? ids.readOnly : null
		]
			.filter(Boolean)
			.join(' ') || undefined
	);
	const activeDescendant = $derived(open && highlightedIndex >= 0 ? itemId(highlightedIndex) : undefined);
	const isTriggerCombobox = $derived(isEffectivelyReadOnly || !hasSearch);
</script>

{#snippet optionRow(item: SelectorOptionData, index: number)}
	<SelectorOptionRow
		{item}
		id={itemId(index)}
		isHighlighted={index === highlightedIndex}
		isKeyboardHighlighted={index === highlightedIndex && isKeyboardHighlight}
		isSelected={item.value === value}
		{size}
		{indicatorPosition}
		{renderOption}
		onselect={() => selectItem(item)}
		onhover={() => {
			if (item.disabled) return;
			isKeyboardHighlight = false;
			highlightedIndex = index;
		}}
	/>
{/snippet}

{#snippet listbox()}
	<!-- Pressing a row must not move focus out of the combobox. -->
	<div
		id={ids.listbox}
		role="listbox"
		aria-label={label}
		tabindex="-1"
		class="astryx-selector-listbox selector-listbox"
		onmousedown={(e) => e.preventDefault()}
	>
		{#if filtered.length === 0 && !isLoading}
			<div class="astryx-selector-empty-state selector-empty" role="presentation" aria-live="polite">
				{searchQuery ? emptySearchText : emptyText}
			</div>
		{:else}
			{#each rows as row (row.kind === 'option' ? `o-${row.item.value}` : row.key)}
				{#if row.kind === 'divider'}
					<Divider aria-hidden="true" class="selector-divider" />
				{:else if row.kind === 'section'}
					<div role="group" aria-label={row.title}>
						{#if row.title}<div class="astryx-selector-section-heading selector-heading" aria-hidden="true">{row.title}</div>{/if}
						{#each row.rows as r (r.item.value)}{@render optionRow(r.item, r.index)}{/each}
					</div>
				{:else}
					{@render optionRow(row.item, row.index)}
				{/if}
			{/each}
		{/if}
	</div>
{/snippet}

{#snippet triggerButton()}
	<button
		{...rest}
		bind:this={trigger}
		id={triggerId}
		type="button"
		class="selector-trigger focus-owner"
		role={isTriggerCombobox ? 'combobox' : undefined}
		aria-haspopup={isEffectivelyReadOnly ? undefined : 'listbox'}
		aria-expanded={isEffectivelyReadOnly ? false : open}
		aria-controls={isEffectivelyReadOnly ? undefined : ids.listbox}
		aria-readonly={isEffectivelyReadOnly || undefined}
		aria-activedescendant={isTriggerCombobox && !isEffectivelyReadOnly ? activeDescendant : undefined}
		aria-labelledby={triggerLabelledBy}
		aria-describedby={describedBy}
		aria-required={isEffectivelyRequired && isTriggerCombobox ? 'true' : undefined}
		aria-invalid={status?.type === 'error' ? 'true' : undefined}
		aria-busy={isLoading || undefined}
		aria-disabled={isDisabled ? 'true' : undefined}
		onkeydown={onTriggerKeydown}
	>
		{#if selectedItem && renderValue}
			<span id={ids.valueText} class="selector-value">{@render renderValue(selectedItem)}</span>
		{:else}
			{#if !startIcon && selectedItem?.icon}<Icon icon={selectedItem.icon} size="sm" color="secondary" />{/if}
			<span id={ids.valueText} class="selector-value-text">{selectedItem?.label ?? placeholder}</span>
		{/if}
	</button>
{/snippet}

{#snippet hiddenInput()}
	{#if htmlName != null && !isDisabled}<input type="hidden" name={htmlName} {form} value={value ?? ''} />{/if}
{/snippet}

<SelectorShell
	{uid}
	kind="astryx-selector"
	{label}
	{isLabelHidden}
	{description}
	{isOptional}
	{isRequired}
	{labelTooltip}
	{width}
	{containerClass}
	{controlClass}
	{status}
	statusVariant={effectiveStatusVariant}
	{isDisabled}
	isReadOnly={isEffectivelyReadOnly}
	{disabledMessage}
	{variant}
	{size}
	{startIcon}
	{isLoading}
	isPlaceholder={!selectedItem}
	{inputGroup}
	{open}
	{placement}
	clearLabel={hasClear && value != null ? `Clear ${label}` : null}
	onclear={clearValue}
	{onControlClick}
	onDismiss={() => hide()}
	activeOptionId={activeDescendant}
	{triggerId}
	{announcement}
	search={hasSearch
		? {
				query,
				placeholder: searchPlaceholder,
				label: 'Search options',
				isRequired: isEffectivelyRequired,
				activeDescendant,
				oninput: setQuery,
				onkeydown: onSearchKeydown,
				ondismiss: () => hide()
			}
		: null}
	trigger={triggerButton}
	{listbox}
	hidden={hiddenInput}
	bind:control
	bind:surface
	bind:searchInput
/>
