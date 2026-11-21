<!--
  Port of Astryx `PowerSearch` (packages/core/src/PowerSearch/PowerSearch.tsx), MIT, Meta Platforms, Inc.
  A search field that builds structured filters. Typing offers fields, "field operator" pairs and
  typed values ("Status is Active") from `config`; picking one adds the filter, or opens a popover
  to choose its operator and value. Pressing a filter token edits it; read-only filters (and
  `isReadOnly`) cannot be edited or removed. `onChange(filters, changeType, index)` reports each
  add, edit and removal. `resultCount` shows and announces a count at the field's end.
  `createPowerSearchConfig(definitions)` builds a config, and an `applyFilters`, from typed fields.
  `focusTypeahead()` and `blurTypeahead()` move focus to and from the field (bind:this).
  `onFocus` and `onBlur` fire as focus enters and leaves the field.
  Port changes (marked "Port change"): a read-only field takes no new filters, and each opening
  of the editor starts from the new pick, and an editor whose filter moves or goes away closes.
  Not yet ported: the bottom-sheet presentation on touch, token overflow behaviors, the nested
  (group) editor, group headings in the results, translations (English only).
-->
<script lang="ts" module>
	export type PowerSearchSize = 'sm' | 'md' | 'lg';
</script>

<script lang="ts">
	import { on } from 'svelte/events';
	import type { Snippet } from 'svelte';
	import Tokenizer from '../Tokenizer/Tokenizer.svelte';
	import TypeaheadItem from '../Typeahead/TypeaheadItem.svelte';
	import Token from '../Token/Token.svelte';
	import Avatar from '../Avatar/Avatar.svelte';
	import Icon from '../Icon/Icon.svelte';
	import type { IconName } from '../Icon/defaultIcons.js';
	import Layer from '../Layer/Layer.svelte';
	import VisuallyHidden from '../VisuallyHidden/VisuallyHidden.svelte';
	import type { FieldStatusInput, FieldStatusPlacement } from '../Field/types.js';
	import { pushLayer } from '../../internal/layerStack.js';
	import PowerSearchEditPopover from './PowerSearchEditPopover.svelte';
	import { createInternalConfig } from './internalConfig.js';
	import { createPowerSearchSource } from './powerSearchSource.js';
	import { formatFilterValue, formatTokenLabel, formatTokenText, formatTokenValueText } from './formatValue.js';
	import { resolveOperatorLabel } from './resolveOperatorLabel.js';
	import { strings } from './strings.js';
	import type {
		PartialFilter,
		PowerSearchAuxData,
		PowerSearchChangeType,
		PowerSearchComponents,
		PowerSearchConfig,
		PowerSearchFilter,
		PowerSearchIcon,
		PowerSearchItem,
		PowerSearchOperator
	} from './types.js';
	import type { TokenizerChange } from '../Tokenizer/Tokenizer.svelte';

	interface Props {
		config: PowerSearchConfig;
		filters: ReadonlyArray<PowerSearchFilter>;
		onChange: (filters: ReadonlyArray<PowerSearchFilter>, changeType: PowerSearchChangeType, index: number) => void;
		label?: string;
		isLabelHidden?: boolean;
		placeholder?: string;
		hasAutoFocus?: boolean;
		/** Show a "Clear all" button that removes the editable filters. */
		hasClear?: boolean;
		isReadOnly?: boolean;
		isDisabled?: boolean;
		disabledMessage?: string;
		startIcon?: PowerSearchIcon;
		onFocus?: (e: FocusEvent) => void;
		onBlur?: (e: FocusEvent) => void;
		status?: FieldStatusInput;
		statusVariant?: FieldStatusPlacement;
		/** The results list width in px; defaults to the field's width. */
		menuWidth?: number;
		/** The character budget of a token's text. */
		maxTokenLength?: number;
		maxOperatorMenuItems?: number;
		/** The most rows shown for typed text. */
		maxSearchResults?: number;
		popoverSaveButtonLabel?: string;
		/** The zone date values are read and written in (an IANA name). */
		timezoneID?: string;
		endContent?: Snippet;
		/** A count, shown as "N results", or text shown as is. */
		resultCount?: number | string;
		size?: PowerSearchSize;
		/** Custom tokens and editors per operator value type. */
		components?: PowerSearchComponents;
		locale?: string;
		class?: string;
	}

	let {
		config: configProp,
		filters,
		onChange,
		label = strings.label,
		isLabelHidden = true,
		placeholder = strings.placeholder,
		hasAutoFocus = false,
		hasClear = true,
		isReadOnly = false,
		isDisabled = false,
		disabledMessage,
		startIcon,
		onFocus,
		onBlur,
		status,
		statusVariant = 'attached',
		menuWidth,
		maxTokenLength = 40,
		maxOperatorMenuItems,
		maxSearchResults = 10,
		popoverSaveButtonLabel = strings.editor.apply,
		timezoneID,
		endContent,
		resultCount,
		size = 'md',
		components: componentOverrides,
		locale = 'en-US',
		class: className
	}: Props = $props();

	const MAX_BROWSE_MENU_ITEMS = 1000;
	const OPERATOR_VALUE_TYPE_TO_ICON: Record<string, IconName> = {
		date_absolute: 'calendar',
		date_range: 'calendar',
		date_relative: 'calendar',
		time: 'clock',
		enum: 'menu',
		enum_list: 'menu'
	};

	type PopoverState =
		| { type: 'idle' }
		| { type: 'adding'; partialFilter: PartialFilter }
		| { type: 'editing'; filterIndex: number; partialFilter: PartialFilter };

	const config = $derived(createInternalConfig(configProp));
	const searchSource = $derived(createPowerSearchSource(config, maxSearchResults));

	let root: HTMLDivElement | undefined = $state();
	let tokenizer: ReturnType<typeof Tokenizer> | undefined = $state();
	let surface: HTMLDivElement | undefined = $state();
	let popoverState = $state<PopoverState>({ type: 'idle' });
	let isPopoverShown = $state(false);
	// Bumped on every change the tokenizer reports, so its tokens follow `filters` even when the
	// filters stay the same (a pick that opens the editor instead of adding).
	let tokenizerSync = $state(0);

	function commitsWithoutEditor(operator: PowerSearchOperator | undefined): boolean {
		return operator?.value.type === 'empty' && componentOverrides?.empty?.Editor == null;
	}

	function tokenText(filter: PowerSearchFilter) {
		const field = config.getField(filter.field);
		const operator = config.getOperator(filter.field, filter.operator);
		const fieldLabel = field?.label ?? filter.field;
		const operatorLabel = operator ? resolveOperatorLabel(operator) : '';
		const label = formatTokenLabel(fieldLabel, operatorLabel);
		const value = operator
			? formatTokenValueText(
					operator.value,
					filter.value,
					Math.max(maxTokenLength - fieldLabel.length - operatorLabel.length, 10),
					locale,
					'gregory',
					timezoneID
				)
			: null;
		return { label, value, full: value != null ? formatTokenText(label, value) : label };
	}

	const editedFilter = $derived(popoverState.type === 'editing' ? filters[popoverState.filterIndex] : undefined);
	const editedOperator = $derived(
		editedFilter != null ? config.getOperator(editedFilter.field, editedFilter.operator) : undefined
	);
	const editedBuiltInFilter = $derived(
		editedOperator == null || componentOverrides?.[editedOperator.value.type]?.Token == null ? editedFilter : undefined
	);

	let showFrame = 0;
	// Port change: each opening remounts the editor, so a new pick replaces any draft in it.
	let popoverSeq = 0;
	// The filter an open editor was opened on; the editor closes if it moves or goes away.
	let editingTarget: PowerSearchFilter | undefined;
	function setPopoverState(state: PopoverState) {
		if (state.type !== 'idle') popoverSeq++;
		editingTarget = state.type === 'editing' ? filters[state.filterIndex] : undefined;
		popoverState = state;
		cancelAnimationFrame(showFrame);
		if (state.type !== 'idle') {
			showFrame = requestAnimationFrame(() => {
				isPopoverShown = true;
				tokenizer?.blur();
			});
		} else {
			isPopoverShown = false;
			tokenizer?.focus();
		}
	}

	/** Move focus to the search field. */
	export function focusTypeahead() {
		tokenizer?.focus();
	}

	/** Move focus out of the search field. */
	export function blurTypeahead() {
		tokenizer?.blur();
	}

	const tokenizerValue: PowerSearchItem[] = $derived.by(() => {
		void tokenizerSync;
		return filters.map((filter, index) => {
			const field = config.getField(filter.field);
			const operator = config.getOperator(filter.field, filter.operator);
			const label = formatTokenLabel(field?.label ?? filter.field, operator ? resolveOperatorLabel(operator) : '');
			const valueStr = operator ? formatFilterValue(operator.value, filter.value, maxTokenLength, locale, timezoneID) : '';
			return {
				id: `filter-${index}-${filter.field}-${filter.operator}`,
				label: valueStr ? formatTokenText(label, valueStr) : label,
				auxiliaryData: { fieldKey: filter.field, operatorKey: filter.operator, filterValue: filter.value, filterIndex: index }
			};
		});
	});

	function handleTokenizerChange(items: PowerSearchItem[], change: TokenizerChange<PowerSearchItem>) {
		tokenizerSync++;
		if (change.type === 'add') {
			// A read-only field takes no new filters either.
			if (isReadOnly) return;
			const auxData = change.item.auxiliaryData as PowerSearchAuxData | undefined;
			if (!auxData) return;
			if (!config.getField(auxData.fieldKey)) return;
			const operator = auxData.operatorKey
				? config.getOperator(auxData.fieldKey, auxData.operatorKey)
				: config.getDefaultOperator(auxData.fieldKey);
			if (auxData.filterValue && operator) {
				onChange([...filters, { field: auxData.fieldKey, operator: operator.key, value: auxData.filterValue }], 'add', filters.length);
				return;
			}
			if (operator && commitsWithoutEditor(operator)) {
				onChange([...filters, { field: auxData.fieldKey, operator: operator.key, value: { type: 'empty' } }], 'add', filters.length);
				return;
			}
			setPopoverState({ type: 'adding', partialFilter: { field: auxData.fieldKey, operator: operator?.key, value: undefined } });
		} else if (change.type === 'remove') {
			const keptIndices = new Set(items.map((item) => item.auxiliaryData?.filterIndex));
			const firstRemovedIndex = filters.findIndex((_, i) => !keptIndices.has(i));
			if (firstRemovedIndex >= 0) {
				onChange(
					filters.filter((_, i) => keptIndices.has(i)),
					'remove',
					firstRemovedIndex
				);
			}
		}
	}

	function isItemRemovable(item: PowerSearchItem) {
		if (isReadOnly) return false;
		const filterIndex = item.auxiliaryData?.filterIndex;
		return filterIndex == null || !filters[filterIndex]?.isReadOnly;
	}

	function handleTokenClick(index: number) {
		if (isReadOnly || isDisabled) return;
		const filter = filters[index];
		if (filter.isReadOnly) return;
		const operator = config.getOperator(filter.field, filter.operator);
		if (commitsWithoutEditor(operator)) {
			const next = [...filters];
			next[index] = { field: filter.field, operator: filter.operator, value: { type: 'empty' } };
			onChange(next, 'edit', index);
			setPopoverState({ type: 'idle' });
			return;
		}
		setPopoverState({
			type: 'editing',
			filterIndex: index,
			partialFilter: { field: filter.field, operator: filter.operator, value: filter.value }
		});
	}

	function handlePopoverSave(savedFilter: PowerSearchFilter | null) {
		const state = popoverState;
		if (state.type === 'adding') {
			if (savedFilter) onChange([...filters, savedFilter], 'add', filters.length);
		} else if (state.type === 'editing') {
			if (savedFilter) {
				const next = [...filters];
				next[state.filterIndex] = savedFilter;
				onChange(next, 'edit', state.filterIndex);
			} else {
				onChange(
					filters.filter((_, i) => i !== state.filterIndex),
					'remove',
					state.filterIndex
				);
			}
		}
		setPopoverState({ type: 'idle' });
	}

	function handlePopoverCancel() {
		setPopoverState({ type: 'idle' });
	}

	// Port change: removing tokens (or any change to `filters`) can shift the edited filter's index;
	// close the editor rather than apply or delete at a stale index.
	$effect(() => {
		const state = popoverState;
		if (state.type !== 'editing') return;
		if (filters[state.filterIndex] === editingTarget) return;
		cancelAnimationFrame(showFrame);
		isPopoverShown = false;
		popoverState = { type: 'idle' };
	});

	// Light dismiss: a press outside the popover and the field closes it without moving focus;
	// Escape cancels it and returns focus to the field.
	$effect(() => {
		const el = surface;
		if (!isPopoverShown || !el) return;
		const doc = el.ownerDocument;
		const layer = pushLayer();
		const onPointerDown = (e: PointerEvent) => {
			if (!layer.isTop()) return;
			const path = e.composedPath();
			if (path.includes(el) || (root != null && path.includes(root))) return;
			cancelAnimationFrame(showFrame);
			isPopoverShown = false;
			popoverState = { type: 'idle' };
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key !== 'Escape' || e.defaultPrevented || !layer.isTop()) return;
			e.preventDefault();
			handlePopoverCancel();
		};
		doc.addEventListener('pointerdown', onPointerDown, true);
		const offKey = on(el, 'keydown', onKey);
		return () => {
			layer.remove();
			doc.removeEventListener('pointerdown', onPointerDown, true);
			offKey();
		};
	});

	const popoverPartialFilter = $derived(popoverState.type !== 'idle' ? popoverState.partialFilter : null);
	const popoverKey = $derived(
		popoverState.type === 'editing'
			? `edit-${popoverState.filterIndex}-${popoverPartialFilter?.field}-${popoverSeq}`
			: `add-${popoverPartialFilter?.field}-${popoverSeq}`
	);
	const EditorOverride = $derived.by(() => {
		if (!popoverPartialFilter?.field || !popoverPartialFilter.operator) return undefined;
		const op = config.getOperator(popoverPartialFilter.field, popoverPartialFilter.operator);
		return op ? componentOverrides?.[op.value.type]?.Editor : undefined;
	});

	const resultCountText = $derived(
		resultCount == null ? null : typeof resultCount === 'number' ? strings.resultCount(resultCount) : resultCount
	);
	// Announce a count when it changes, not on first render.
	let announcement = $state('');
	// svelte-ignore state_referenced_locally
	let announcedCount = resultCountText;
	$effect(() => {
		const text = resultCountText;
		if (text === announcedCount) return;
		announcedCount = text;
		if (text != null) announcement = text;
	});

	const clearAllMessage = $derived(
		filters.some((filter) => filter.isReadOnly) ? strings.editableFiltersRemoved : strings.allFiltersRemoved
	);

	function onFocusIn(e: FocusEvent) {
		if (e.relatedTarget instanceof Node && root?.contains(e.relatedTarget)) return;
		onFocus?.(e);
	}
	function onFocusOut(e: FocusEvent) {
		if (e.relatedTarget instanceof Node && root?.contains(e.relatedTarget)) return;
		onBlur?.(e);
	}
</script>

{#snippet renderToken(item: PowerSearchItem, onRemove: () => void)}
	{@const auxData = item.auxiliaryData}
	{@const filterIndex = auxData?.filterIndex ?? -1}
	{@const filter = filterIndex >= 0 ? filters[filterIndex] : undefined}
	{@const field = auxData ? config.getField(auxData.fieldKey) : undefined}
	{@const operator = auxData?.operatorKey ? config.getOperator(auxData.fieldKey, auxData.operatorKey) : undefined}
	{@const canInteract = !isReadOnly && !isDisabled && !filter?.isReadOnly}
	{@const handleClick = canInteract ? () => handleTokenClick(filterIndex) : undefined}
	{@const handleRemove = canInteract ? onRemove : undefined}
	{@const TokenOverride = operator ? componentOverrides?.[operator.value.type]?.Token : undefined}
	{#if TokenOverride && filter && field && operator}
		<TokenOverride
			config={configProp}
			{filter}
			{field}
			{operator}
			maxLength={maxTokenLength}
			onClick={handleClick}
			onRemove={handleRemove}
			{isDisabled}
			{timezoneID}
		/>
	{:else}
		{@const text =
			filter != null
				? tokenText(filter)
				: {
						label: formatTokenLabel(field?.label ?? '', operator ? resolveOperatorLabel(operator) : ''),
						value: null,
						full: ''
					}}
		{@const fullText = text.value != null ? formatTokenText(text.label, text.value) : text.label}
		{@const entity =
			filter?.value.type === 'entity_list' && filter.value.value.length === 1 && filter.value.value[0].photo
				? filter.value.value[0]
				: undefined}
		{@const opensEditor = handleClick != null && !commitsWithoutEditor(operator)}
		{#snippet tokenIcon()}<Avatar src={entity?.photo} name={entity?.label} size={16} />{/snippet}
		{#snippet tokenValue()}<span class="token-value">{text.value}</span>{/snippet}
		<Token
			label={text.label}
			{size}
			icon={entity ? tokenIcon : undefined}
			aria-label={handleClick ? fullText : undefined}
			removeName={fullText}
			aria-haspopup={opensEditor ? 'dialog' : undefined}
			aria-expanded={opensEditor ? popoverState.type === 'editing' && popoverState.filterIndex === filterIndex : undefined}
			endContent={text.value != null ? tokenValue : undefined}
			onmousedown={handleClick ? (e: MouseEvent) => e.preventDefault() : undefined}
			onclick={handleClick
				? (e) => {
						e.stopPropagation();
						handleClick();
					}
				: undefined}
			onRemove={handleRemove}
			{isDisabled}
		/>
	{/if}
{/snippet}

{#snippet renderItem(item: PowerSearchItem)}
	{@const auxData = item.auxiliaryData}
	{@const field = auxData ? config.getField(auxData.fieldKey) : undefined}
	{#if !auxData || !field}
		<TypeaheadItem {item} />
	{:else}
		{@const operator = auxData.operatorKey
			? config.getOperator(auxData.fieldKey, auxData.operatorKey)
			: config.getDefaultOperator(auxData.fieldKey)}
		{@const icon = field.icon ?? OPERATOR_VALUE_TYPE_TO_ICON[operator?.value.type ?? ''] ?? 'search'}
		{#snippet itemIcon()}<Icon {icon} size="sm" color="secondary" />{/snippet}
		<TypeaheadItem {item} icon={itemIcon} description={field.description} />
	{/if}
{/snippet}

{#snippet combinedEndContent()}
	{#if resultCountText != null}<span class="result-count">{resultCountText}</span>{/if}
	{@render endContent?.()}
{/snippet}

<div bind:this={root} class={['astryx-power-search', 'root', className]} onfocusin={onFocusIn} onfocusout={onFocusOut}>
	<Tokenizer
		bind:this={tokenizer}
		{label}
		{isLabelHidden}
		{searchSource}
		value={tokenizerValue}
		onChange={handleTokenizerChange}
		{renderToken}
		{renderItem}
		{isItemRemovable}
		{clearAllMessage}
		maxMenuItems={MAX_BROWSE_MENU_ITEMS}
		{menuWidth}
		placeholder={filters.length === 0 ? placeholder : ''}
		{hasAutoFocus}
		hasClear={hasClear && !isReadOnly}
		{startIcon}
		endContent={resultCountText != null || endContent ? combinedEndContent : undefined}
		{isDisabled}
		{disabledMessage}
		{size}
		hasEntriesOnFocus
		debounceMs={0}
		{status}
		{statusVariant}
	/>
</div>
<VisuallyHidden><span aria-live="polite" aria-atomic="true">{announcement}</span></VisuallyHidden>

<Layer
	open={isPopoverShown && popoverPartialFilter != null}
	anchor={root}
	placement="below"
	alignment="start"
	offset={4}
	matchAnchorWidth
	bind:element={surface}
	role={editedBuiltInFilter != null ? 'dialog' : undefined}
	aria-label={editedBuiltInFilter != null ? tokenText(editedBuiltInFilter).full : undefined}
	class="astryx-popover astryx-power-search-popover"
>
	{#if popoverPartialFilter}
		{@const mode = popoverState.type === 'editing' ? 'edit' : 'create'}
		{#key popoverKey}
			{#if EditorOverride}
				<EditorOverride
					config={configProp}
					filter={popoverPartialFilter}
					{mode}
					onSave={handlePopoverSave}
					onCancel={handlePopoverCancel}
					saveButtonLabel={popoverSaveButtonLabel}
					{isReadOnly}
					{timezoneID}
				/>
			{:else}
				<PowerSearchEditPopover
					{config}
					filter={popoverPartialFilter}
					{mode}
					onSave={handlePopoverSave}
					onCancel={handlePopoverCancel}
					saveButtonLabel={popoverSaveButtonLabel}
					maxMenuItems={maxOperatorMenuItems}
					{isReadOnly}
					{timezoneID}
					{locale}
				/>
			{/if}
		{/key}
	{/if}
</Layer>

<style>
	@layer astryx-base {
		.token-value { font-weight: var(--font-weight-bold); }
		.result-count {
			font-size: var(--text-supporting-size);
			line-height: var(--text-supporting-leading);
			color: var(--color-text-secondary);
			white-space: nowrap;
		}
		:global(.astryx-layer.astryx-power-search-popover) {
			min-width: min(400px, calc(100vw - 16px));
			box-sizing: border-box;
			background-color: var(--color-background-popover);
			color: var(--color-text-primary);
			border-radius: var(--radius-container);
			box-shadow: var(--shadow-low);
			font-family: var(--font-family-body);
			font-size: var(--text-body-size);
			line-height: var(--text-body-leading);
		}
		@media (forced-colors: active) {
			:global(.astryx-layer.astryx-power-search-popover) { border: 1px solid CanvasText; }
		}
	}
</style>
