<!--
  Internal: the field, operator and value editor of one PowerSearch filter. Port of Astryx
  `PowerSearchEditPopover` (packages/core/src/PowerSearch/PowerSearchEditPopover.tsx), MIT,
  Meta Platforms, Inc. Enter applies a complete filter (outside buttons and controls that claim
  Enter); Escape is the popover's. An operator that takes no value applies as soon as it is picked.
  Not yet ported: the nested (group) editor, which needs TreeList; a nested filter shows its field
  and operator only.
-->
<script lang="ts">
	import Button from '../Button/Button.svelte';
	import Selector from '../Selector/Selector.svelte';
	import PowerSearchValueEditor from './PowerSearchValueEditor.svelte';
	import { resolveOperatorLabel } from './resolveOperatorLabel.js';
	import { strings } from './strings.js';
	import type { InternalConfig } from './internalConfig.js';
	import type { FilterValue, PartialFilter, PowerSearchFilter, PowerSearchOperator } from './types.js';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		config: InternalConfig;
		filter: PartialFilter;
		mode: 'create' | 'edit';
		/** Apply a filter, or with null delete the edited one. */
		onSave: (filter: PowerSearchFilter | null) => void;
		onCancel: () => void;
		saveButtonLabel?: string;
		maxMenuItems?: number;
		timezoneID?: string;
		isReadOnly?: boolean;
		locale?: string;
	}

	let {
		config,
		filter: initialFilter,
		mode,
		onSave,
		onCancel,
		saveButtonLabel = strings.editor.apply,
		maxMenuItems,
		timezoneID,
		isReadOnly = false,
		locale,
		class: className,
		...rest
	}: Props = $props();

	// svelte-ignore state_referenced_locally
	let partialFilter: PartialFilter = $state(initialFilter);

	const currentOperator = $derived(
		partialFilter.operator ? config.getOperator(partialFilter.field, partialFilter.operator) : undefined
	);
	const fieldOptions = $derived(config.getVisibleFields().map((field) => ({ value: field.key, label: field.label })));
	const operatorOptions = $derived(
		config.getVisibleOperators(partialFilter.field).map((op) => ({ value: op.key, label: resolveOperatorLabel(op) }))
	);
	const operatorValue = $derived(currentOperator?.value);
	const isEmptyType = $derived(operatorValue?.type === 'empty');
	const isNestedType = $derived(operatorValue?.type === 'nested');
	const hasDateTimeValue = $derived(operatorValue?.type === 'date_absolute' && operatorValue.isDateOnly === false);
	const showOperatorSelector = $derived(operatorOptions.length > 1 || !isEmptyType);
	const isSaveDisabled = $derived(!partialFilter.operator || !partialFilter.value);

	function saveIfEmptyOperator(fieldKey: string, operator: PowerSearchOperator | undefined) {
		if (fieldKey && operator?.value.type === 'empty') {
			const filter: PowerSearchFilter = { field: fieldKey, operator: operator.key, value: { type: 'empty' } };
			queueMicrotask(() => onSave(filter));
		}
	}

	function handleFieldChange(fieldKey: string | null) {
		if (fieldKey == null) return;
		const defaultOp = config.getDefaultOperator(fieldKey);
		const changed = fieldKey !== partialFilter.field || defaultOp?.key !== partialFilter.operator;
		partialFilter = { field: fieldKey, operator: defaultOp?.key, value: undefined };
		if (changed) saveIfEmptyOperator(fieldKey, defaultOp);
	}

	function handleOperatorChange(operatorKey: string | null) {
		if (operatorKey == null) return;
		const newOp = config.getOperator(partialFilter.field, operatorKey);
		const oldOp = currentOperator;
		const keepValue = newOp && oldOp && newOp.value.type === oldOp.value.type;
		const changed = operatorKey !== partialFilter.operator;
		partialFilter = { ...partialFilter, operator: operatorKey, value: keepValue ? partialFilter.value : undefined };
		if (changed) saveIfEmptyOperator(partialFilter.field, newOp);
	}

	function handleValueChange(value: FilterValue, shouldSave?: boolean) {
		partialFilter = { ...partialFilter, value };
		const { field, operator } = partialFilter;
		if (shouldSave && field && operator && value) onSave({ field, operator, value });
	}

	function handleSave() {
		const { field, operator, value } = partialFilter;
		if (field && operator && value) onSave({ field, operator, value });
	}

	function onKeydown(e: KeyboardEvent) {
		if (e.isComposing) return;
		if (e.key === 'Enter' && e.target instanceof HTMLButtonElement) return;
		if (e.key === 'Enter' && !isSaveDisabled && !e.defaultPrevented) {
			e.preventDefault();
			handleSave();
		}
	}

	/** Focus the value control once it mounts, as Astryx's ValueEditorCell does. */
	function focusFirst(node: HTMLElement) {
		const frame = requestAnimationFrame(() => {
			node
				.querySelector<HTMLElement>(
					'input:not([disabled]), button:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
				)
				?.focus();
		});
		return { destroy: () => cancelAnimationFrame(frame) };
	}
</script>

<div {...rest} class={['astryx-power-search-editor', 'container', className]} role="presentation" onkeydown={onKeydown}>
	<div class="content">
		<div class="chip-row" class:wrapped={hasDateTimeValue}>
			<div class="field-selector">
				<Selector
					label={strings.editor.field}
					isLabelHidden
					options={fieldOptions}
					value={partialFilter.field}
					onChange={handleFieldChange}
					isDisabled={isReadOnly}
					size="md"
				/>
			</div>
			{#if showOperatorSelector && operatorOptions.length > 0}
				<div class="operator-selector">
					<Selector
						label={isNestedType ? strings.editor.groupOperator : strings.editor.operator}
						isLabelHidden
						options={operatorOptions}
						value={partialFilter.operator}
						onChange={handleOperatorChange}
						isDisabled={isReadOnly}
						size="md"
					/>
				</div>
			{/if}
			{#if operatorValue && !isEmptyType && !isNestedType}
				{#key `${partialFilter.field}\u0000${partialFilter.operator ?? ''}`}
					<div class="value-editor" class:full-width={hasDateTimeValue} use:focusFirst>
						<PowerSearchValueEditor
							{operatorValue}
							filterValue={partialFilter.value}
							onChange={handleValueChange}
							onEnter={handleSave}
							{maxMenuItems}
							{timezoneID}
							{locale}
							isDisabled={isReadOnly}
						/>
					</div>
				{/key}
			{/if}
		</div>
	</div>
	{#if !isEmptyType}
		<div class="footer">
			{#if !isReadOnly && mode === 'edit'}
				<Button label={strings.editor.delete} onclick={() => onSave(null)} variant="ghost" size="sm" />
			{:else}
				<div></div>
			{/if}
			<div class="actions">
				<Button label={strings.editor.cancel} onclick={onCancel} variant="ghost" size="sm" />
				<Button label={saveButtonLabel} onclick={handleSave} variant="primary" size="sm" isDisabled={isSaveDisabled} />
			</div>
		</div>
	{/if}
</div>

<style>
	@layer astryx-base {
		.container { overflow: hidden; container-type: inline-size; }
		.content { padding: var(--spacing-4); }
		.chip-row { display: flex; gap: var(--spacing-2); flex-wrap: nowrap; }
		@container (max-width: 399px) {
			.chip-row { flex-wrap: wrap; }
		}
		.chip-row.wrapped { flex-wrap: wrap; }
		.field-selector { flex: 1 1 auto; min-width: 0; }
		.operator-selector { flex: 1 0 auto; max-width: 100%; }
		.value-editor { flex-grow: 2; min-width: 0; }
		.value-editor.full-width { flex-basis: 100%; }
		.footer {
			display: flex;
			justify-content: space-between;
			gap: var(--spacing-2);
			padding: var(--spacing-3);
			padding-top: 0;
		}
		.actions { display: flex; gap: var(--spacing-2); }
	}
</style>
