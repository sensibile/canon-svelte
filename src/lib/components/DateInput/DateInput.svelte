<!--
  Port of Astryx `DateInput` (packages/core/src/DateInput/DateInput.tsx), MIT, Meta Platforms, Inc.
  A date field whose `presentation` picks how the date is entered:
  - `'popover'`: the typed field with a calendar popover on every pointer
  - `'bottom-sheet'`: a bottom-sheet calendar on every pointer
  - `'native'`: the browser's own date control on every pointer
  - `'adaptive-bottom-sheet'`: the popover on a fine pointer, the sheet on a coarse one
  - `'adaptive-native'` (default): the popover on a fine pointer, the browser's control on a coarse one
  The deprecated `nativePicker` maps onto these: `touch` is `adaptive-native`, `always` is
  `native`, `never` is `adaptive-bottom-sheet`.
  Values are ISO `YYYY-MM-DD` strings; use `bind:value`, or `value` + `onChange(value)`.
  Port change: Gregorian only, so every presentation is open to every calendar; no development
  warning for the deprecated `nativePicker`.
-->
<script lang="ts" module>
	import type { LegacyNativePicker, PickerPresentation } from '../../internal/date/inputPresentation.js';

	export type DateInputSize = 'sm' | 'md' | 'lg';
	/** Display formats for the committed date, shared with Timestamp. */
	export type DateInputFormat = 'date' | 'date_long' | 'date_weekday' | 'system_date';
	export type DateInputPresentation = PickerPresentation;
	/** @deprecated Use `DateInputPresentation` through the `presentation` prop. */
	export type DateInputNativePicker = LegacyNativePicker;
</script>

<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import PointerDateField from './PointerDateField.svelte';
	import TouchDateField from './TouchDateField.svelte';
	import NativeDateField from './NativeDateField.svelte';
	import {
		effectivePickerPresentation,
		resolvePickerPresentation,
		TOUCH_POINTER_QUERY
	} from '../../internal/date/inputPresentation.js';

	type Props = ComponentProps<typeof PointerDateField> & {
		/** Which surface collects the date. */
		presentation?: DateInputPresentation;
		/** @deprecated Use `presentation`. */
		nativePicker?: DateInputNativePicker;
	};

	let { value = $bindable(), presentation, nativePicker, ...rest }: Props = $props();

	const coarse = new MediaQuery(TOUCH_POINTER_QUERY, false);
	const surface = $derived(resolvePickerPresentation(effectivePickerPresentation(presentation, nativePicker), coarse.current));
</script>

{#if surface === 'native'}
	{@const { numberOfMonths: _months, weekStartsOn: _weekStart, entryErrorBehavior: _behavior, ...nativeProps } = rest}
	<NativeDateField {...nativeProps} bind:value />
{:else if surface === 'sheet'}
	{@const { numberOfMonths: _months, entryErrorBehavior: _behavior, onEntryErrorChange: _onError, ...sheetProps } = rest}
	<TouchDateField {...sheetProps} bind:value />
{:else}
	<PointerDateField {...rest} bind:value />
{/if}
