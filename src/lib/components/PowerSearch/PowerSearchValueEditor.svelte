<!--
  Internal: the value control of a PowerSearch filter, chosen by the operator's value type. Port of
  Astryx `PowerSearchValueEditor` (packages/core/src/PowerSearch/PowerSearchValueEditor.tsx), MIT,
  Meta Platforms, Inc. `onChange(value, shouldSave)` stages a value, or with `shouldSave` applies it
  at once (a picked option, or Enter on a typed number). `onUnstage` withdraws a staged value the
  control no longer shows (a cleared date or time). The parent remounts this per field and operator.
  Port changes: clearing a date or time unstages its value, typed numbers stage as they change,
  `isArbitraryStringAllowed` stages a suggestion field's typed text, a stepped number replaces the typed
  text Enter would apply, and a range's end is stored as the last second of its end day.
  Not yet ported: the bottom-sheet presentation (its full-width controls and inline range calendar).
-->
<script lang="ts" module>
	import { strings } from './strings.js';
	import type { DateRelativeOperatorValue } from './types.js';

	const RELATIVE_DATE_UNITS = [
		{ unit: 'day', amounts: [1, 3, 7, 14, 30] },
		{ unit: 'week', amounts: [1, 2, 4] },
		{ unit: 'month', amounts: [1, 3, 6, 12] }
	] as const;

	/** The relative-date choices an operator allows, such as "3 days ago" (`3d_ago`). */
	export function buildRelativeDateOptions(operatorValue: DateRelativeOperatorValue): { value: string; label: string }[] {
		const result: { value: string; label: string }[] = [];
		for (const { unit, amounts } of RELATIVE_DATE_UNITS) {
			for (const amount of amounts) {
				if (operatorValue.isPastAllowed !== false)
					result.push({ value: `${amount}${unit[0]}_ago`, label: strings.relative[unit].ago(amount) });
				if (operatorValue.isFutureAllowed !== false)
					result.push({ value: `${amount}${unit[0]}_from_now`, label: strings.relative[unit].fromNow(amount) });
			}
		}
		return result;
	}
</script>

<script lang="ts">
	import TextInput from '../TextInput/TextInput.svelte';
	import NumberInput from '../NumberInput/NumberInput.svelte';
	import { resolveNumberInputCommit, type NumberInputCommitDecision } from '../NumberInput/numberInputCommit.js';
	import DateInput from '../DateInput/DateInput.svelte';
	import DateRangeInput from '../DateRangeInput/DateRangeInput.svelte';
	import TimeInput from '../TimeInput/TimeInput.svelte';
	import Selector from '../Selector/Selector.svelte';
	import Tokenizer from '../Tokenizer/Tokenizer.svelte';
	import Typeahead from '../Typeahead/Typeahead.svelte';
	import type { SearchSource, SearchableItem } from '../Typeahead/types.js';
	import type { ISODateString, DateRange } from '../../internal/date/dateTypes.js';
	import type { ISOTimeString } from '../../internal/date/timeParser.js';
	import type { ISODateTimeString } from '../DateTimeInput/DateTimeInput.svelte';
	import {
		isoDateTimeToUnixSeconds,
		isoDateToUnixSeconds,
		resolveDateZone,
		unixSecondsToISODate,
		unixSecondsToISODateTime
	} from './powerSearchDateZone.js';
	import { resolveDateTimeRangePart } from './resolveDateTimeRangePart.js';
	import { plainDateAddDays, plainDateFromISO, plainDateToISO } from '../../internal/date/plainDate.js';
	import type { FilterValue, OperatorValue } from './types.js';

	interface Props {
		operatorValue: OperatorValue;
		filterValue: FilterValue | undefined;
		onChange: (value: FilterValue, shouldSave?: boolean) => void;
		/** Enter in a number field with no new text: apply the staged filter. */
		onEnter?: () => void;
		/** The control was cleared: withdraw the staged value. */
		onUnstage?: () => void;
		maxMenuItems?: number;
		isDisabled?: boolean;
		timezoneID?: string;
		locale?: string;
	}

	let { operatorValue, filterValue, onChange, onEnter, onUnstage, maxMenuItems, isDisabled, timezoneID, locale = 'en-US' }: Props =
		$props();

	const EMPTY_SOURCE: SearchSource<SearchableItem> = { search: () => [], bootstrap: () => [] };

	function staticSource(items: SearchableItem[]): SearchSource<SearchableItem> {
		return {
			search: (query) => items.filter((item) => item.label.toLowerCase().includes(query.toLowerCase())),
			bootstrap: () => items
		};
	}

	// Numbers: what the typed text would commit, read on each input since focus. Enter with no new
	// text applies the staged filter; Enter on text that commits applies that number.
	let pendingDecision: NumberInputCommitDecision | null = null;
	function onNumberInput(e: Event) {
		if (operatorValue.type !== 'integer' && operatorValue.type !== 'float') return;
		pendingDecision = resolveNumberInputCommit((e.target as HTMLInputElement).value, {
			min: operatorValue.minValue,
			max: operatorValue.maxValue,
			isIntegerOnly: operatorValue.type === 'integer',
			locale,
			hasClear: false
		});
		// Port change: the typed text stages as it changes, so Apply never saves a number the
		// field no longer shows; text that can't commit withdraws the staged number.
		if (pendingDecision.type === 'commit') onChange(toNumberValue(pendingDecision.value));
		else onUnstage?.();
	}
	function toNumberValue(value: number): FilterValue {
		return operatorValue.type === 'integer' ? { type: 'integer', value } : { type: 'float', value };
	}
	function onNumberEnter() {
		const decision = pendingDecision;
		pendingDecision = null;
		if (decision === null) onEnter?.();
		else if (decision.type === 'commit') onChange(toNumberValue(decision.value), true);
	}
	function stopEnter(e: KeyboardEvent) {
		if (e.key === 'Enter') e.stopPropagation();
	}

	// A suggestion field shows its picked item; typed arbitrary text stages without becoming one.
	// svelte-ignore state_referenced_locally
	const initialString = filterValue?.type === 'string' ? filterValue.value : '';
	let pickedItem: SearchableItem | null = $state(initialString ? { id: initialString, label: initialString } : null);
	function onArbitraryInput(e: Event) {
		const text = (e.target as HTMLInputElement).value;
		if (text.trim()) onChange({ type: 'string', value: text });
		else onUnstage?.();
	}

	// Date and time: the parts picked before both are known.
	let pendingDate: ISODateString | undefined = $state();
	let pendingTime: ISOTimeString | undefined = $state();
</script>

{#if operatorValue.type === 'string'}
	{@const currentValue = filterValue?.type === 'string' ? filterValue.value : ''}
	{#if operatorValue.searchSource}
		<!-- Port change: with isArbitraryStringAllowed, typed text stages as typed (read from input
		     events, so the field's own query resets on blur don't withdraw it). -->
		<div class="cell" oninput={operatorValue.isArbitraryStringAllowed ? onArbitraryInput : undefined}>
			<Typeahead
				label={strings.valueEditor.value}
				isLabelHidden
				{isDisabled}
				searchSource={operatorValue.searchSource}
				value={pickedItem}
				onChange={(item) => {
					pickedItem = item;
					// Port change: a cleared pick withdraws the staged value.
					if (item) onChange({ type: 'string', value: item.label }, true);
					else onUnstage?.();
				}}
				placeholder={strings.valueEditor.searchPlaceholder}
				debounceMs={150}
				{maxMenuItems}
			/>
		</div>
	{:else}
		<TextInput
			label={strings.valueEditor.value}
			isLabelHidden
			{isDisabled}
			value={currentValue}
			placeholder={strings.valueEditor.enterValuePlaceholder}
			onChange={(value) => onChange({ type: 'string', value })}
		/>
	{/if}
{:else if operatorValue.type === 'string_list'}
	<Tokenizer
		label={strings.valueEditor.values}
		isLabelHidden
		{isDisabled}
		searchSource={operatorValue.searchSource ?? EMPTY_SOURCE}
		value={filterValue?.type === 'string_list' ? filterValue.value.map((v) => ({ id: v, label: v })) : []}
		onChange={(items) => onChange({ type: 'string_list', value: items.map((item) => item.label) })}
		placeholder={strings.valueEditor.addValuesPlaceholder}
		debounceMs={operatorValue.searchSource ? 150 : 0}
		hasCreate={operatorValue.isArbitraryStringAllowed || !operatorValue.searchSource}
		{maxMenuItems}
	/>
{:else if operatorValue.type === 'integer' || operatorValue.type === 'float'}
	{@const currentValue = filterValue?.type === operatorValue.type ? filterValue.value : null}
	<div class="cell" oninput={onNumberInput} onfocusin={() => (pendingDecision = null)}>
		<NumberInput
			label={strings.valueEditor.value}
			isLabelHidden
			{isDisabled}
			value={currentValue}
			onChange={(value) => {
				// Port change: a committed or stepped number supersedes the typed text, so Enter
				// applies the number shown.
				pendingDecision = null;
				if (value != null) onChange(toNumberValue(value));
			}}
			onEnter={onNumberEnter}
			onkeydown={stopEnter}
			min={operatorValue.minValue}
			max={operatorValue.maxValue}
			units={operatorValue.units}
			isIntegerOnly={operatorValue.type === 'integer'}
			placeholder={strings.valueEditor.enterNumberPlaceholder}
			{locale}
		/>
	</div>
{:else if operatorValue.type === 'time'}
	<TimeInput
		label={strings.valueEditor.time}
		isLabelHidden
		entryErrorBehavior="complete"
		{isDisabled}
		value={filterValue?.type === 'time' ? filterValue.value : undefined}
		onChange={(value) => (value != null ? onChange({ type: 'time', value }) : onUnstage?.())}
		min={operatorValue.minValue}
		max={operatorValue.maxValue}
		{locale}
	/>
{:else if operatorValue.type === 'date_absolute'}
	{@const unixSeconds = filterValue?.type === 'date_absolute' ? filterValue.unixSeconds : undefined}
	{#if operatorValue.isDateOnly === false}
		{@const zone = resolveDateZone(timezoneID, false)}
		{@const parts = unixSeconds == null ? [] : unixSecondsToISODateTime(unixSeconds, zone).split('T')}
		{@const date = (parts[0] as ISODateString | undefined) ?? pendingDate}
		{@const time = (parts[1] as ISOTimeString | undefined) ?? pendingTime}
		{@const commit = (nextDate: ISODateString | undefined, nextTime: ISOTimeString | undefined) => {
			// Port change: a cleared part withdraws the staged instant.
			if (nextDate == null || nextTime == null) return onUnstage?.();
			onChange({
				type: 'date_absolute',
				unixSeconds: isoDateTimeToUnixSeconds(`${nextDate}T${nextTime}` as ISODateTimeString, zone)
			});
		}}
		<div class="date-time">
			<DateInput
				label={strings.valueEditor.date}
				isLabelHidden
				entryErrorBehavior="complete"
				{isDisabled}
				value={date}
				onChange={(value) => {
					pendingDate = value;
					commit(value, time);
				}}
				{locale}
			/>
			<TimeInput
				label={strings.valueEditor.time}
				isLabelHidden
				entryErrorBehavior="complete"
				{isDisabled}
				value={time}
				onChange={(value) => {
					pendingTime = value;
					commit(date, value);
				}}
				{locale}
			/>
		</div>
	{:else}
		{@const zone = resolveDateZone(timezoneID, true)}
		<DateInput
			label={strings.valueEditor.date}
			isLabelHidden
			entryErrorBehavior="complete"
			{isDisabled}
			value={unixSeconds == null ? undefined : unixSecondsToISODate(unixSeconds, zone)}
			onChange={(value) => {
				if (value != null) onChange({ type: 'date_absolute', unixSeconds: isoDateToUnixSeconds(value, zone) });
				else onUnstage?.();
			}}
			{locale}
		/>
	{/if}
{:else if operatorValue.type === 'date_relative'}
	<Selector
		label={strings.valueEditor.relativeDate}
		isLabelHidden
		{isDisabled}
		options={buildRelativeDateOptions(operatorValue)}
		value={filterValue?.type === 'date_relative' ? filterValue.value : undefined}
		onChange={(value) => value != null && onChange({ type: 'date_relative', value }, true)}
	/>
{:else if operatorValue.type === 'date_range'}
	{@const zone = resolveDateZone(timezoneID, true)}
	{@const nowSeconds = Date.now() / 1000}
	{@const currentValue: DateRange | null =
		filterValue?.type === 'date_range'
			? {
					start: unixSecondsToISODate(resolveDateTimeRangePart(filterValue.value.start, nowSeconds), zone),
					end: unixSecondsToISODate(resolveDateTimeRangePart(filterValue.value.end, nowSeconds), zone)
				}
			: null}
	<!-- Enter in the range field belongs to it, not to the editor's Apply. -->
	<div class="cell" role="presentation" onkeydown={stopEnter}>
		<DateRangeInput
			label={strings.valueEditor.dateRange}
			isLabelHidden
			{isDisabled}
			value={currentValue}
			onChange={(range) => {
				if (range == null) return;
				onChange({
					type: 'date_range',
					value: {
						start: { type: 'ABSOLUTE', unixSeconds: isoDateToUnixSeconds(range.start, zone) },
						// Port change: the end day is inclusive, so the range ends at its last second.
						end: {
							type: 'ABSOLUTE',
							unixSeconds: isoDateToUnixSeconds(plainDateToISO(plainDateAddDays(plainDateFromISO(range.end), 1)), zone) - 1
						}
					}
				});
			}}
			hasClear={false}
			{locale}
		/>
	</div>
{:else if operatorValue.type === 'enum'}
	<Selector
		label={strings.valueEditor.value}
		isLabelHidden
		{isDisabled}
		options={operatorValue.values.map((item) => ({ value: item.value, label: item.label }))}
		value={filterValue?.type === 'enum' ? filterValue.value : undefined}
		onChange={(value) => value != null && onChange({ type: 'enum', value }, true)}
	/>
{:else if operatorValue.type === 'enum_list'}
	{@const values = operatorValue.values}
	<Tokenizer
		label={strings.valueEditor.values}
		isLabelHidden
		{isDisabled}
		searchSource={staticSource(values.map((item) => ({ id: item.value, label: item.label })))}
		value={filterValue?.type === 'enum_list'
			? filterValue.value.map((v) => ({ id: v, label: values.find((e) => e.value === v)?.label ?? v }))
			: []}
		onChange={(items) => onChange({ type: 'enum_list', value: items.map((item) => item.id) })}
		placeholder={strings.valueEditor.selectValuesPlaceholder}
		hasEntriesOnFocus
		debounceMs={0}
		maxMenuItems={values.length}
	/>
{:else if operatorValue.type === 'entity_list'}
	<Tokenizer
		label={strings.valueEditor.entities}
		isLabelHidden
		{isDisabled}
		searchSource={operatorValue.searchSource ?? EMPTY_SOURCE}
		value={filterValue?.type === 'entity_list'
			? filterValue.value.map((entity) => ({
					id: entity.id,
					label: entity.label,
					auxiliaryData: entity.photo ? { photo: entity.photo } : undefined
				}))
			: []}
		onChange={(items) =>
			onChange({
				type: 'entity_list',
				value: items.map((item) => {
					const aux = item.auxiliaryData as { photo?: string } | undefined;
					return { id: item.id, label: item.label, ...(aux?.photo ? { photo: aux.photo } : {}) };
				})
			})}
		renderItem={operatorValue.renderItem}
		placeholder={strings.valueEditor.searchPlaceholder}
		debounceMs={operatorValue.searchSource ? 150 : 0}
		{maxMenuItems}
	/>
{:else if operatorValue.type === 'custom'}
	{@const Editor = operatorValue.Editor}
	<Editor
		{isDisabled}
		onChange={(value) => value != null && onChange({ type: 'custom', value })}
		placeholder={strings.valueEditor.enterValuePlaceholder}
		value={filterValue?.type === 'custom' ? filterValue.value : null}
	/>
{/if}

<style>
	@layer astryx-base {
		.cell { display: contents; }
		.date-time { display: flex; flex-wrap: wrap; gap: var(--spacing-2); }
	}
</style>
