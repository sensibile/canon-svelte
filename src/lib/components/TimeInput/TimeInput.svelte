<!--
  Port of Astryx `TimeInput` (packages/core/src/TimeInput/TimeInput.tsx), MIT, Meta Platforms, Inc.
  A time field whose `presentation` picks how the time is entered:
  - `'text-input'`: the typed field on every pointer
  - `'popover'`: the typed field (TimeInput has no popover of its own)
  - `'bottom-sheet'`: a sheet of wheels on every pointer
  - `'native'`: the browser's own time control on every pointer
  - `'adaptive-bottom-sheet'`: the typed field on a fine pointer, the wheel sheet on a coarse one
  - `'adaptive-native'` (default): the typed field on a fine pointer, the browser's control on a
    coarse one, except for seconds or an `increment` other than 1, which it can't express
  The deprecated `nativePicker` maps onto these: `touch` is `adaptive-native`, `always` is
  `native` (keeping the typed field where native can't express the time), `never` is `text-input`.
  Values are ISO `HH:MM` (or `HH:MM:SS`) strings; use `bind:value`, or `value` + `onChange(value)`.
  Port change: no development warning for the deprecated `nativePicker`.
-->
<script lang="ts" module>
	import type { InputPresentation, LegacyNativePicker } from '../../internal/date/inputPresentation.js';

	export type TimeInputSize = 'sm' | 'md' | 'lg';
	export type TimeInputHourFormat = '12h' | '24h';
	export type TimeInputPresentation = InputPresentation;
	/** @deprecated Use `TimeInputPresentation` through the `presentation` prop. */
	export type TimeInputNativePicker = LegacyNativePicker;
</script>

<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import { MediaQuery } from 'svelte/reactivity';
	import TimeField from './TimeField.svelte';
	import TouchTimeField from './TouchTimeField.svelte';
	import { resolveHourFormat } from '../../internal/date/timeFormat.js';
	import {
		effectiveInputPresentation,
		resolveInputPresentation,
		TOUCH_POINTER_QUERY
	} from '../../internal/date/inputPresentation.js';

	type Props = Omit<ComponentProps<typeof TimeField>, 'nativeMode'> & {
		/** Which surface collects the time. */
		presentation?: TimeInputPresentation;
		/** @deprecated Use `presentation`. */
		nativePicker?: TimeInputNativePicker;
	};

	let { value = $bindable(), presentation, nativePicker, hourFormat, locale = 'en-US', ...rest }: Props = $props();

	const coarse = new MediaQuery(TOUCH_POINTER_QUERY, false);
	const effective = $derived(effectiveInputPresentation(presentation, nativePicker, 'time'));
	// Every surface gets the resolved hour format, so the typed text, the native text and the wheels agree.
	const resolvedHourFormat = $derived(resolveHourFormat(locale, hourFormat));
	const surface = $derived(effective === 'native' ? 'native' : resolveInputPresentation(effective, coarse.current));
	// Only an explicit `presentation="native"` is forced; the others keep the typed field where native can't express the time.
	const nativeMode = $derived(
		effective === 'native'
			? presentation === undefined && nativePicker === 'always'
				? 'legacy'
				: 'forced'
			: surface === 'native'
				? 'adaptive'
				: 'off'
	);
</script>

{#if surface === 'sheet'}
	{@const { onEntryErrorChange: _onEntryErrorChange, entryErrorBehavior: _entryErrorBehavior, increment: _increment, hasAutoFocus: _hasAutoFocus, ...sheetProps } = rest}
	<TouchTimeField {...sheetProps} bind:value hourFormat={resolvedHourFormat} {locale} />
{:else}
	<TimeField {...rest} bind:value hourFormat={resolvedHourFormat} {locale} {nativeMode} />
{/if}
