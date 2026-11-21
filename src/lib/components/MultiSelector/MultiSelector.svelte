<!--
  Port of Astryx `MultiSelector` (packages/core/src/MultiSelector/MultiSelector.tsx), MIT, Meta Platforms, Inc.
  A select-many control: a combobox button that opens a multi-select listbox with checkboxes.
  Use `bind:value`, or `value` + `onChange(value, change)`. The list stays open while you toggle.
  Selected options move to the top of their group when the list opens (and stay put while it's
  open). `hasSelectAll` adds a "Select all" row; `hasCreate` (with `hasSearch`) offers to add the
  typed query as a new value, reported as `change = { type: 'create', query }`.
  Keyboard: ArrowDown/ArrowUp/Enter/Space open; arrows, Home/End and Page keys move; Enter or Space
  toggles; Escape and Tab close; typing jumps to a matching option.
  Not yet ported: option `action`s (grid mode), `renderTrigger`, the imperative handle, the
  bottom-sheet presentation, `changeAction`, the "tooltip" status variant.
-->
<script lang="ts" module>
	import type { SelectorOptionData, SelectorOptionType } from '../Selector/options.js';

	export type MultiSelectorSize = 'sm' | 'md' | 'lg';
	export type MultiSelectorVariant = 'input' | 'secondary' | 'ghost';
	export type MultiSelectorStatusType = 'warning' | 'error' | 'success';
	export interface MultiSelectorStatus {
		type: MultiSelectorStatusType;
		message?: string;
	}
	export type MultiSelectorChange = { type: 'create'; query: string };
	export interface MultiSelectorSelectedItem {
		value: string;
		label: string;
	}
	export type MultiSelectorOptionData = SelectorOptionData;
	export type MultiSelectorOptionType = SelectorOptionType;
</script>

<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import type { FieldStatusPlacement } from '../Field/types.js';
	import type { IconComponent } from '../Icon/Icon.svelte';
	import type { IconName } from '../Icon/defaultIcons.js';
	import Badge from '../Badge/Badge.svelte';
	import Divider from '../Divider/Divider.svelte';
	import SelectorOptionRow from '../Selector/SelectorOptionRow.svelte';
	import SelectorShell, { selectorIds } from '../Selector/SelectorShell.svelte';
	import {
		createTypeahead,
		enabledEdgeIndex,
		followHighlight,
		getSelectableOptions,
		isDivider,
		isSection,
		isShortcutChord,
		normalizeOption,
		optionMatchesQuery,
		stepEnabled,
		type IndicatorPosition
	} from '../Selector/options.js';
	import type { LayerPlacement } from '../../internal/position.js';
	import type { SizeValue } from '../../types.js';
	import { getInputGroupContext, setInputGroupContext } from '../InputGroup/context.js';

	interface Props extends Omit<HTMLAttributes<HTMLButtonElement>, 'onchange' | 'placeholder'> {
		label: string;
		options: MultiSelectorOptionType[];
		value?: string[];
		onChange?: (value: string[], change?: MultiSelectorChange) => void;
		onOpenChange?: (isOpen: boolean) => void;
		/** Show a clear (×) button while anything is selected. */
		hasClear?: boolean;
		hasSelectAll?: boolean;
		selectAllLabel?: string;
		hasSearch?: boolean;
		searchPlaceholder?: string;
		/** Offer the search query as a new value when no option has that label. Needs `hasSearch`. */
		hasCreate?: boolean;
		emptyText?: string;
		emptySearchText?: string;
		/** How the trigger shows the selection: "3 selected", "A, B, C, +2", or badges. */
		triggerDisplay?: 'count' | 'labels' | 'badges';
		/** Custom trigger text for the "count" and "labels" displays. */
		formatValue?: (items: MultiSelectorSelectedItem[]) => string;
		maxBadges?: number;
		isLabelHidden?: boolean;
		description?: string;
		isOptional?: boolean;
		isRequired?: boolean;
		isDisabled?: boolean;
		isReadOnly?: boolean;
		disabledMessage?: string;
		labelTooltip?: string;
		isLoading?: boolean;
		placeholder?: string;
		size?: MultiSelectorSize;
		variant?: MultiSelectorVariant;
		status?: MultiSelectorStatus;
		statusVariant?: FieldStatusPlacement;
		width?: SizeValue;
		startIcon?: IconName | IconComponent;
		renderOption?: Snippet<[MultiSelectorOptionData]>;
		indicatorPosition?: IndicatorPosition;
		placement?: LayerPlacement;
		isDefaultOpen?: boolean;
		/** The `name` of the hidden inputs carrying the values, for form submission. */
		htmlName?: string;
		containerClass?: string;
		controlClass?: string;
	}

	let {
		label,
		options,
		value = $bindable([]),
		onChange,
		onOpenChange,
		hasClear = false,
		hasSelectAll = false,
		selectAllLabel = 'Select all',
		hasSearch = false,
		searchPlaceholder = 'Search…',
		hasCreate = false,
		emptyText = 'No options',
		emptySearchText = 'No results found',
		triggerDisplay = 'count',
		formatValue,
		maxBadges = 3,
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
		indicatorPosition = 'start',
		placement = 'below',
		isDefaultOpen = false,
		htmlName,
		containerClass,
		controlClass,
		id: idProp,
		onkeydown: onkeydownProp,
		'aria-describedby': describedByProp,
		'aria-labelledby': labelledByProp,
		...rest
	}: Props = $props();

	const SELECT_ALL = '__astryx_select_all__';
	const CREATE_PREFIX = '__astryx_multi_selector_create__';

	const inputGroup = getInputGroupContext();
	// Internal buttons (clear, steppers) belong to this control, not to the group row.
	setInputGroupContext(null);
	const isDisabled = $derived(isDisabledProp || (inputGroup?.isDisabled ?? false));
	const isEffectivelyReadOnly = $derived(isReadOnly && !isDisabled);
	const size = $derived(sizeProp ?? inputGroup?.size ?? 'md');
	const effectiveStatusVariant = $derived(variant !== 'input' ? 'detached' : statusVariant);
	const isEffectivelyRequired = $derived(isRequired && !isOptional);

	const uid = $props.id();
	const ids = selectorIds(uid);
	const triggerId = $derived(idProp ?? ids.trigger);

	let control: HTMLDivElement | undefined = $state();
	let trigger: HTMLButtonElement | undefined = $state();
	let surface: HTMLDivElement | undefined = $state();
	let searchInput: HTMLInputElement | undefined = $state();
	let open = $state(false);
	let query = $state('');
	let highlightedIndex = $state(-1);
	let isKeyboardHighlight = $state(false);
	let announcement = $state('');
	// The selection when the list opened; it decides the order so rows don't jump while toggling.
	let selectedAtOpen = $state<Set<string> | null>(null);

	const selectable = $derived(getSelectableOptions(options));
	const searchQuery = $derived(hasSearch ? query : '');
	const filtered = $derived(searchQuery ? selectable.filter((o) => optionMatchesQuery(o, searchQuery)) : selectable);
	const enabledFiltered = $derived(filtered.filter((o) => !o.disabled));
	const allEnabledSelected = $derived(enabledFiltered.length > 0 && enabledFiltered.every((o) => value.includes(o.value)));
	const someSelected = $derived(enabledFiltered.some((o) => value.includes(o.value)));
	const selectAllState = $derived<'checked' | 'unchecked' | 'indeterminate'>(
		allEnabledSelected ? 'checked' : someSelected ? 'indeterminate' : 'unchecked'
	);
	const createQuery = $derived.by(() => {
		if (!hasCreate || !hasSearch || isLoading) return null;
		const trimmed = query.trim();
		if (!trimmed) return null;
		const wanted = trimmed.toLowerCase();
		return selectable.some((o) => (o.label ?? o.value).toLowerCase() === wanted) ? null : trimmed;
	});

	type Row =
		| { kind: 'option'; item: SelectorOptionData; index: number }
		| { kind: 'divider'; key: string }
		| { kind: 'section'; key: string; title?: string; rows: { item: SelectorOptionData; index: number }[] };

	/** The navigable items in order (create row, select-all row, options) and the rows to render. */
	const layout = $derived.by(() => {
		const selectedSet = selectedAtOpen ?? new Set(value);
		const selectedFirst = (items: SelectorOptionData[]) => [
			...items.filter((o) => selectedSet.has(o.value)),
			...items.filter((o) => !selectedSet.has(o.value))
		];
		const nav: SelectorOptionData[] = [];
		const lead: Row[] = [];
		if (createQuery != null) {
			const item = { value: `${CREATE_PREFIX}${createQuery}`, label: `Create "${createQuery}"` };
			lead.push({ kind: 'option', item, index: nav.length });
			nav.push(item);
		}
		if (hasSelectAll && filtered.length > 0) {
			const item = { value: SELECT_ALL, label: selectAllLabel };
			lead.push({ kind: 'option', item, index: nav.length });
			nav.push(item);
		}
		const rows: Row[] = [];
		let pending: SelectorOptionData[] = [];
		const flush = () => {
			for (const item of selectedFirst(pending)) {
				rows.push({ kind: 'option', item, index: nav.length });
				nav.push(item);
			}
			pending = [];
		};
		options.forEach((option, i) => {
			if (isDivider(option)) {
				flush();
				if (!searchQuery) rows.push({ kind: 'divider', key: `divider-${i}` });
			} else if (isSection(option)) {
				flush();
				const matches = option.options.map(normalizeOption).filter((o) => optionMatchesQuery(o, searchQuery));
				if (matches.length === 0) return;
				const sectionRows = selectedFirst(matches).map((item) => {
					const row = { item, index: nav.length };
					nav.push(item);
					return row;
				});
				rows.push({ kind: 'section', key: `section-${i}`, title: option.title, rows: sectionRows });
			} else {
				const item = normalizeOption(option);
				if (optionMatchesQuery(item, searchQuery)) pending.push(item);
			}
		});
		flush();
		return { nav, lead, rows };
	});
	const navItems = $derived(layout.nav);

	let previousList: SelectorOptionData[] = [];
	let previousQuery = '';
	$effect.pre(() => {
		const next = navItems;
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

	function setOpen(next: boolean) {
		if (open === next) return;
		open = next;
		onOpenChange?.(next);
	}

	function show(highlight: 'start' | 'end' | 'none' = 'start') {
		if (isDisabled || isEffectivelyReadOnly) return false;
		selectedAtOpen = new Set(value);
		setOpen(true);
		if (!hasSearch && highlight !== 'none') highlightedIndex = enabledEdgeIndex(navItems, highlight === 'end');
		return true;
	}

	function hide(restoreFocus = false) {
		if (!open) return;
		const hadFocusInside = surface?.contains(document.activeElement) ?? false;
		setOpen(false);
		query = '';
		highlightedIndex = -1;
		selectedAtOpen = null;
		announcement = '';
		typeahead.reset();
		if (restoreFocus || hadFocusInside) trigger?.focus({ preventScroll: true });
	}

	function commit(next: string[], change?: MultiSelectorChange) {
		if (isDisabled || isEffectivelyReadOnly) return;
		value = next;
		onChange?.(next, change);
	}

	function announceSelection(next: string[]) {
		const total = selectable.length;
		const set = new Set(selectable.map((o) => o.value));
		const count = next.filter((v) => set.has(v)).length;
		announcement =
			count === 0 ? 'Selection cleared' : total > 0 && count === total ? 'All selected' : `${count} of ${total} selected`;
	}

	function toggle(item: SelectorOptionData | undefined) {
		if (!item || item.disabled) return;
		if (item.value === SELECT_ALL) {
			let next: string[];
			if (allEnabledSelected) {
				const enabled = new Set(enabledFiltered.map((o) => o.value));
				next = value.filter((v) => !enabled.has(v));
			} else {
				next = [...value, ...enabledFiltered.map((o) => o.value).filter((v) => !value.includes(v))];
			}
			commit(next);
			announceSelection(next);
		} else if (item.value.startsWith(CREATE_PREFIX)) {
			const created = item.value.slice(CREATE_PREFIX.length);
			commit(value.includes(created) ? value : [...value, created], { type: 'create', query: created });
			query = '';
			announcement = `${created} created`;
		} else {
			const next = value.includes(item.value) ? value.filter((v) => v !== item.value) : [...value, item.value];
			commit(next);
			announceSelection(next);
		}
	}

	function clearValues() {
		typeahead.reset();
		commit([]);
		announcement = 'Selection cleared';
		trigger?.focus({ preventScroll: true });
	}

	function setQuery(next: string) {
		query = next;
		if (!next || isLoading) {
			announcement = '';
			return;
		}
		const count = selectable.filter((o) => optionMatchesQuery(o, next)).length;
		if (count > 0) announcement = `${count} ${count === 1 ? 'result' : 'results'}`;
	}

	function navigate(e: KeyboardEvent): boolean {
		const enabled = navItems.map((o, i) => (o.disabled ? -1 : i)).filter((i) => i >= 0);
		switch (e.key) {
			case 'ArrowDown':
			case 'ArrowUp': {
				e.preventDefault();
				const down = e.key === 'ArrowDown';
				if (!open) show(down ? 'start' : 'end');
				else if (highlightedIndex < 0) highlightedIndex = enabledEdgeIndex(navItems, !down);
				else highlightedIndex = stepEnabled(navItems, highlightedIndex, down ? 1 : -1);
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
				if (open && highlightedIndex >= 0) toggle(navItems[highlightedIndex]);
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
		if (!hasSearch && printable && e.key !== ' ') {
			// Typeahead only moves the highlight; it never toggles.
			e.preventDefault();
			const labels = navItems.map((o) => o.label ?? o.value);
			const match = typeahead.match(e.key, labels, (i) => navItems[i]?.disabled === true, highlightedIndex);
			if (match < 0) return;
			if (!open) show('none');
			highlightedIndex = match;
			return;
		}
		if (navigate(e)) return;
		if ((e.key === 'Delete' || e.key === 'Backspace') && !hasSearch && !open && hasClear && value.length > 0) {
			e.preventDefault();
			clearValues();
			return;
		}
		if (hasSearch && printable) {
			e.preventDefault();
			if (open || show('none')) setQuery(query + e.key);
		}
	}

	function onSearchKeydown(e: KeyboardEvent) {
		if (e.isComposing) return;
		isKeyboardHighlight = true;
		if (e.key === 'Enter' && highlightedIndex < 0 && createQuery != null) {
			// Enter with nothing highlighted creates the typed value.
			e.preventDefault();
			toggle(navItems[0]);
			return;
		}
		if (['ArrowDown', 'ArrowUp', 'PageUp', 'PageDown', 'Enter', 'Escape'].includes(e.key)) navigate(e);
		else if (e.key === 'Tab' && (e.shiftKey || !query)) hide();
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

	const selectedItems = $derived<MultiSelectorSelectedItem[]>(
		value.map((v) => ({ value: v, label: selectable.find((o) => o.value === v)?.label ?? v }))
	);
	const triggerText = $derived.by(() => {
		if (value.length === 0) return placeholder;
		const custom = formatValue?.(selectedItems);
		if (custom != null) return custom;
		if (triggerDisplay === 'labels') {
			const labels = selectedItems.map((i) => i.label);
			const shown = labels.slice(0, 3);
			const remaining = labels.length - shown.length;
			return remaining > 0 ? `${shown.join(', ')}, +${remaining}` : shown.join(', ');
		}
		return `${value.length} selected`;
	});

	const triggerLabelledBy = $derived.by(() => {
		const name = inputGroup ? [inputGroup.labelID, ids.inputLabel].filter(Boolean).join(' ') : ids.fieldLabel;
		const parts = [name, labelledByProp];
		if (hasSearch && !isEffectivelyReadOnly) parts.push(ids.valueText);
		return parts.filter(Boolean).join(' ') || undefined;
	});
	const describedBy = $derived(
		[
			describedByProp,
			inputGroup?.describedByIDs,
			description && !inputGroup ? ids.description : null,
			!inputGroup && status?.message ? ids.statusMessage : null,
			isDisabled && disabledMessage ? ids.disabledMessage : null,
			isEffectivelyReadOnly ? ids.readOnly : null
		]
			.filter(Boolean)
			.join(' ') || undefined
	);
	const activeDescendant = $derived(open && highlightedIndex >= 0 ? ids.item(highlightedIndex) : undefined);
	const isTriggerCombobox = $derived(isEffectivelyReadOnly || !hasSearch);
	const hasOptions = $derived(filtered.length > 0);
</script>

{#snippet optionRow(item: SelectorOptionData, index: number)}
	{@const isSelectAll = item.value === SELECT_ALL}
	{@const isCreate = item.value.startsWith(CREATE_PREFIX)}
	{@const isSelected = isSelectAll ? allEnabledSelected : !isCreate && value.includes(item.value)}
	<SelectorOptionRow
		{item}
		id={ids.item(index)}
		isHighlighted={index === highlightedIndex}
		isKeyboardHighlighted={index === highlightedIndex && isKeyboardHighlight}
		{isSelected}
		{size}
		{indicatorPosition}
		mark={isCreate ? 'none' : 'checkbox'}
		markState={isSelectAll ? selectAllState : undefined}
		ariaLabel={isSelectAll && selectAllState === 'indeterminate' ? `${selectAllLabel}, partially selected` : undefined}
		renderOption={isSelectAll || isCreate ? undefined : renderOption}
		onselect={() => toggle(item)}
		onhover={() => {
			if (item.disabled) return;
			isKeyboardHighlight = false;
			highlightedIndex = index;
		}}
	/>
{/snippet}

{#snippet listbox()}
	<div
		id={ids.listbox}
		role="listbox"
		aria-multiselectable="true"
		aria-labelledby={triggerId}
		tabindex="-1"
		class="astryx-multi-selector-listbox selector-listbox"
		onmousedown={(e) => e.preventDefault()}
	>
		{#each layout.lead as row (row.kind === 'option' ? row.item.value : row.key)}
			{#if row.kind === 'option'}{@render optionRow(row.item, row.index)}{/if}
		{/each}
		{#if !hasOptions && !isLoading && createQuery == null}
			<div class="astryx-multi-selector-empty-state selector-empty" role="presentation" aria-live="polite">
				{searchQuery ? emptySearchText : emptyText}
			</div>
		{:else}
			{#each layout.rows as row (row.kind === 'option' ? `o-${row.item.value}` : row.key)}
				{#if row.kind === 'divider'}
					<Divider aria-hidden="true" class="selector-divider" />
				{:else if row.kind === 'section'}
					<div role="group" aria-label={row.title}>
						{#if row.title}<div class="astryx-multi-selector-section-heading selector-heading" aria-hidden="true">{row.title}</div>{/if}
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
		{#if triggerDisplay === 'badges' && value.length > 0 && !formatValue}
			{@const shown = selectedItems.slice(0, maxBadges)}
			<span id={ids.valueText} class="badges">
				{#each shown as item (item.value)}<Badge label={item.label} variant="neutral" />{/each}
				{#if selectedItems.length > shown.length}<span class="overflow">+{selectedItems.length - shown.length}</span>{/if}
			</span>
		{:else}
			<span id={ids.valueText} class="selector-value-text">{triggerText}</span>
		{/if}
	</button>
{/snippet}

{#snippet hiddenInputs()}
	{#if htmlName != null && !isDisabled}
		{#each value as v (v)}<input type="hidden" name={htmlName} value={v} />{/each}
	{/if}
{/snippet}

<SelectorShell
	{uid}
	kind="astryx-multi-selector"
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
	isPlaceholder={value.length === 0}
	{inputGroup}
	{open}
	{placement}
	clearLabel={hasClear && value.length > 0 ? `Clear all ${label}` : null}
	onclear={clearValues}
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
	hidden={hiddenInputs}
	bind:control
	bind:surface
	bind:searchInput
/>

<style>
	@layer astryx-base {
		.badges {
			display: flex;
			flex-wrap: wrap;
			gap: var(--spacing-1);
			align-items: center;
			min-width: 0;
		}
		.overflow {
			flex-shrink: 0;
			font-size: var(--text-label-size);
			line-height: var(--text-label-leading);
			color: var(--color-text-secondary);
			font-weight: var(--font-weight-medium);
		}
	}
</style>
