<!--
  Port of Astryx `DateTimeInput` (packages/core/src/DateTimeInput/DateTimeInput.tsx,
  PointerDateTimeField), MIT, Meta Platforms, Inc. A typed date with a calendar popover beside a
  typed time, which wrap onto two lines when narrow. Values are ISO `YYYY-MM-DDTHH:MM` (or
  `…:SS` with `hasSeconds`) strings; use `bind:value`, or `value` + `onChange(value)`.
  Picking a date keeps the time (or uses now), clamped into `min`/`max` on their own days. The
  time commits only once a date is set. With `timeOptionInterval`, the time also offers a list of
  times (Alt+ArrowDown or a click opens it). ArrowUp/ArrowDown otherwise step the time.
  Emptying the time clears the value. With `name`, a hidden input posts the ISO value.
  Gregorian only (pass `locale`). Not yet ported: the native and bottom-sheet presentations for
  touch, `changeAction` (optimistic async change), and FormLayout's default entry error behavior.
-->
<script lang="ts" module>
	export type ISODateTimeString = string & { readonly __brand: 'ISODateTimeString' };
	export type DateTimeInputHourFormat = '12h' | '24h';
	export type DateTimeInputSize = 'sm' | 'md' | 'lg';
	export type DateTimeInputTimeIncrement = 1 | 5 | 10 | 15 | 30;
	export type DateTimeInputTimeOptionInterval = 5 | 10 | 15 | 30 | 60;
</script>

<script lang="ts">
	import { onDestroy, untrack } from 'svelte';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import Field from '../Field/Field.svelte';
	import type { FieldStatusInput } from '../Field/types.js';
	import Icon from '../Icon/Icon.svelte';
	import Spinner from '../Spinner/Spinner.svelte';
	import Button from '../Button/Button.svelte';
	import VisuallyHidden from '../VisuallyHidden/VisuallyHidden.svelte';
	import Tooltip from '../Tooltip/Tooltip.svelte';
	import Layer from '../Layer/Layer.svelte';
	import Calendar from '../Calendar/Calendar.svelte';
	import { createDateDisabledCheck } from '../Calendar/calendarDays.js';
	import DatePopover from '../DateInput/DatePopover.svelte';
	import { pushLayer } from '../../internal/layerStack.js';
	import { TypedDateField, type DateInputEntryError, type EntryErrorBehavior } from '../DateInput/typedDate.svelte.js';
	import { TypedTimeField } from '../TimeInput/typedTime.svelte.js';
	import type { DayOfWeek, DayOfWeekName, ISODateString } from '../../internal/date/dateTypes.js';
	import {
		adjustTime,
		formatISOTime,
		isTimeInRange,
		parseISOTime,
		type ISOTimeString
	} from '../../internal/date/timeParser.js';
	import { formatLocaleTime, parseLocaleTime, resolveHourFormat } from '../../internal/date/timeFormat.js';
	import type { SizeValue } from '../../types.js';

	interface Props
		extends Omit<
			HTMLInputAttributes,
			'type' | 'size' | 'value' | 'disabled' | 'readonly' | 'required' | 'onchange' | 'min' | 'max' | 'placeholder'
		> {
		label: string;
		isLabelHidden?: boolean;
		description?: string;
		isOptional?: boolean;
		isRequired?: boolean;
		isDisabled?: boolean;
		/** Why the input is disabled; shown in a tooltip on hover and focus while disabled. */
		disabledMessage?: string;
		/** The selected date and time, `YYYY-MM-DDTHH:MM`. */
		value?: ISODateTimeString | string;
		/** Called when the value changes; with undefined when it is cleared. */
		onChange?: (value: ISODateTimeString | undefined) => void;
		/** Busy: the field stays focusable, shows a spinner, and takes no input. */
		isLoading?: boolean;
		min?: ISODateTimeString | string;
		max?: ISODateTimeString | string;
		/** A date is disabled if ANY of these returns false. */
		dateConstraints?: ReadonlyArray<(date: Date) => boolean>;
		hasSeconds?: boolean;
		/** Defaults to the locale's hour cycle. */
		hourFormat?: DateTimeInputHourFormat;
		/** Minutes that ArrowUp/ArrowDown step the time. */
		timeIncrement?: DateTimeInputTimeIncrement;
		/** Minutes between the times the time list offers. Without it, there is no list. */
		timeOptionInterval?: DateTimeInputTimeOptionInterval;
		/** Show a clear button while a value is set. */
		hasClear?: boolean;
		/** Shown in the date input while no date is set. */
		placeholder?: string;
		/** Shown in the time input while no time is set. */
		timePlaceholder?: string;
		/** Accessible name of the time input. Default "{label} time". */
		timeLabel?: string;
		size?: DateTimeInputSize;
		status?: FieldStatusInput;
		/** Called when the date's rejection of typed text changes, with null when it ends. */
		onEntryErrorChange?: (error: DateInputEntryError | null) => void;
		/** `'complete'`: show a rejection as soon as typed text is complete. `'blur-or-enter'`: wait. */
		entryErrorBehavior?: EntryErrorBehavior;
		width?: SizeValue;
		/** Help text shown in an InfoTip next to the label. */
		labelTooltip?: string;
		/** Months shown in the calendar popover. */
		numberOfMonths?: 1 | 2;
		weekStartsOn?: DayOfWeek | DayOfWeekName;
		/** Locale for reading typed text and writing dates and times. */
		locale?: string;
		/** Class for the outer Field container. */
		containerClass?: string;
		/** Class for the row that holds both segments. */
		controlClass?: string;
	}

	let {
		label,
		isLabelHidden = false,
		description,
		isOptional = false,
		isRequired = false,
		isDisabled = false,
		disabledMessage,
		value = $bindable(),
		onChange,
		isLoading = false,
		min,
		max,
		dateConstraints,
		hasSeconds = false,
		hourFormat: hourFormatProp,
		timeIncrement = 1,
		timeOptionInterval,
		hasClear = false,
		placeholder: placeholderProp,
		timePlaceholder: timePlaceholderProp,
		timeLabel,
		size = 'md',
		status,
		onEntryErrorChange,
		entryErrorBehavior = 'complete',
		width,
		labelTooltip,
		numberOfMonths = 1,
		weekStartsOn,
		locale = 'en-US',
		containerClass,
		controlClass,
		id: idProp,
		name,
		form,
		'aria-describedby': describedByProp,
		'aria-labelledby': labelledByProp,
		onfocus,
		onblur,
		onclick,
		onkeydown,
		...rest
	}: Props = $props();

	const MINUTES_PER_DAY = 24 * 60;

	function splitDateTime(dt: string | undefined): { date: ISODateString | undefined; time: ISOTimeString | undefined } {
		if (!dt) return { date: undefined, time: undefined };
		const t = dt.indexOf('T');
		if (t === -1) return { date: dt as ISODateString, time: undefined };
		return { date: dt.slice(0, t) as ISODateString, time: dt.slice(t + 1) as ISOTimeString };
	}

	function combineDateTime(date: ISODateString | undefined, time: ISOTimeString | undefined) {
		return date && time ? (`${date}T${time}` as ISODateTimeString) : undefined;
	}

	function nowTime(): ISOTimeString {
		const now = new Date();
		return formatISOTime({ hour: now.getHours(), minute: now.getMinutes(), second: now.getSeconds() }, hasSeconds);
	}

	const placeholder = $derived(placeholderProp ?? 'Select a date');
	const timePlaceholder = $derived(timePlaceholderProp ?? 'Select a time');
	const timeName = $derived(timeLabel ?? `${label} time`);
	const hourFormat = $derived(resolveHourFormat(locale, hourFormatProp));
	const isBusy = $derived(isLoading);
	const isEffectivelyDisabled = $derived(isDisabled || isBusy);
	const isEffectivelyRequired = $derived(isRequired && !isOptional);
	const showsDisabledMessage = $derived(isDisabled && !!disabledMessage);

	const uid = $props.id();
	const dateInputId = $derived(idProp ?? `${uid}-date`);
	const timeInputId = `${uid}-time`;
	const fieldLabelID = `${uid}-label`;
	const descriptionID = `${uid}-desc`;
	const statusMessageID = `${uid}-status`;
	const disabledMessageID = `${uid}-disabled-reason`;
	const timeListboxId = `${uid}-times`;
	const timeOptionId = (i: number) => `${timeListboxId}-option-${i}`;
	const controlLabelledBy = $derived(labelledByProp != null ? `${fieldLabelID} ${labelledByProp}` : undefined);

	let dateInputEl: HTMLInputElement | undefined = $state();
	let dateSegmentEl: HTMLDivElement | undefined = $state();
	let timeInputEl: HTMLInputElement | undefined = $state();
	let timeSegmentEl: HTMLDivElement | undefined = $state();
	let timeListEl: HTMLDivElement | undefined = $state();
	let calendar: Calendar | undefined = $state();
	let isOpen = $state(false);
	let pendingCalendarFocus = $state(false);
	let isTimeOpen = $state(false);
	let highlightedTimeIndex = $state(-1);
	/** Whether typing moves the highlight, so Enter commits the typed time rather than an option. */
	let highlightFollowsTyping = true;
	let isTimeFocused = $state(false);
	let announcement = $state('');

	const minParts = $derived(splitDateTime(min));
	const maxParts = $derived(splitDateTime(max));
	const valueParts = $derived(splitDateTime(value));
	const isDateDisabled = $derived(createDateDisabledCheck({ min: minParts.date, max: maxParts.date, dateConstraints }));
	// The time bounds apply only on the bound's own day.
	const timeMin = $derived(
		minParts.date && minParts.time && valueParts.date === minParts.date ? minParts.time : undefined
	);
	const timeMax = $derived(
		maxParts.date && maxParts.time && valueParts.date === maxParts.date ? maxParts.time : undefined
	);

	function fireChange(next: ISODateTimeString | undefined) {
		if (isEffectivelyDisabled) return;
		value = next;
		onChange?.(next);
	}

	function handleDateChange(newDate: ISODateString, source: 'calendar' | 'input') {
		let time = valueParts.time ?? nowTime();
		if (minParts.date && newDate === minParts.date && minParts.time && !isTimeInRange(time, minParts.time, undefined)) {
			time = minParts.time;
		}
		if (maxParts.date && newDate === maxParts.date && maxParts.time && !isTimeInRange(time, undefined, maxParts.time)) {
			time = maxParts.time;
		}
		const combined = combineDateTime(newDate, time);
		if (combined) fireChange(combined);
		if (source === 'calendar') hide(true);
	}

	const typedDate = new TypedDateField(() => ({
		format: 'date_long',
		locale,
		min: minParts.date,
		max: maxParts.date,
		isDateDisabled,
		value: valueParts.date,
		onChange: (date) => handleDateChange(date, 'input'),
		onClear: () => {
			if (value !== undefined) fireChange(undefined);
		},
		onTypedDate: (date) => calendar?.navigateTo(date),
		isDisabled: isEffectivelyDisabled,
		status,
		isStatusAnnounced: true,
		onEntryErrorChange,
		entryErrorBehavior
	}));
	const typedTime = new TypedTimeField(() => ({
		value: valueParts.time,
		locale,
		hourFormat,
		hasSeconds,
		min: timeMin,
		max: timeMax,
		isDisabled: false,
		isLocked: isEffectivelyDisabled,
		errorMessage: 'Invalid time',
		isStatusAnnounced: true,
		status,
		entryErrorBehavior
	}));

	// A new date or time from outside replaces that segment's typed text; a change to the other
	// segment keeps it.
	let shownDate = untrack(() => valueParts.date);
	let shownTime = untrack(() => valueParts.time);
	$effect(() => {
		const d = valueParts.date;
		if (d === shownDate) return;
		shownDate = d;
		untrack(() => typedDate.valueChanged(d));
	});
	$effect(() => {
		const t = valueParts.time;
		if (t === shownTime) return;
		shownTime = t;
		untrack(() => typedTime.valueChanged(t));
	});
	let wasDisabled = untrack(() => isEffectivelyDisabled);
	$effect(() => {
		const disabled = isEffectivelyDisabled;
		if (disabled !== wasDisabled) {
			wasDisabled = disabled;
			if (!disabled) untrack(() => typedDate.enabled());
		}
	});
	$effect(() => {
		void typedDate.entryError;
		untrack(() => typedDate.syncEntryError());
	});
	onDestroy(() => typedDate.destroy());

	// The date's rejection takes the field status; the time's shows only while the date has none.
	const dateStatus = $derived(typedDate.fieldStatus);
	const isDateMessageShown = $derived(typedDate.isInvalid);
	const timeStatus = $derived(isDateMessageShown ? status : typedTime.fieldStatus);
	const shownStatus = $derived(isDateMessageShown ? dateStatus : timeStatus);
	const timeAlertMessage = $derived(
		isDateMessageShown && typedTime.fieldStatus !== status ? 'Invalid time' : typedTime.alertMessage
	);
	const messagelessError = $derived(shownStatus?.type === 'error' && !shownStatus.message);

	const describedBy = $derived(
		[
			description ? descriptionID : null,
			shownStatus?.message || messagelessError ? statusMessageID : null,
			showsDisabledMessage ? disabledMessageID : null,
			describedByProp
		]
			.filter(Boolean)
			.join(' ') || undefined
	);

	const formatDisplayTime = (time: ISOTimeString) => formatLocaleTime(time, locale, hourFormat, hasSeconds);
	const timeDisplayValue = $derived(
		typedTime.pendingInput ?? (valueParts.time ? formatDisplayTime(valueParts.time) : '')
	);
	const timeShownPlaceholder = $derived(
		isTimeFocused && !timeDisplayValue ? (hourFormat === '12h' ? 'e.g., 2:30 PM' : 'e.g., 14:30') : timePlaceholder
	);

	// --- Date segment ---

	function show(focusCalendar: boolean) {
		if (isEffectivelyDisabled || isOpen) return;
		isOpen = true;
		pendingCalendarFocus = focusCalendar;
	}
	function hide(restoreFocus: boolean) {
		isOpen = false;
		if (restoreFocus) dateInputEl?.focus({ preventScroll: true });
	}

	function handleCalendarToggle() {
		if (isEffectivelyDisabled) return;
		if (isOpen) hide(false);
		else show(true);
	}

	function handleDateKeydown(e: KeyboardEvent & { currentTarget: HTMLInputElement }) {
		if (!e.isComposing && e.keyCode !== 229) {
			if (e.key === 'Escape' && isOpen) {
				e.preventDefault();
				hide(false);
			} else if (e.key === 'ArrowDown' && !isOpen) {
				e.preventDefault();
				show(false);
			} else if (e.key === 'Enter' && (typedDate.isPending || isEffectivelyDisabled)) {
				e.preventDefault();
				typedDate.commit();
			}
		}
		onkeydown?.(e);
	}

	function isOwnPress(target: EventTarget | null): boolean {
		if (!(target instanceof Node)) return false;
		if (dateSegmentEl?.contains(target)) return true;
		return target instanceof HTMLLabelElement && target.control === dateInputEl;
	}

	function handleClear(e: MouseEvent) {
		fireChange(undefined);
		typedDate.reset();
		typedTime.reset();
		dateInputEl?.focus({ preventScroll: e.detail !== 0 });
	}

	// --- Time segment ---

	const hasTimeOptions = $derived(timeOptionInterval !== undefined);
	const timeOptions = $derived.by(() => {
		if (timeOptionInterval === undefined) return [];
		const options: { time: ISOTimeString; label: string }[] = [];
		for (let minutes = 0; minutes < MINUTES_PER_DAY; minutes += timeOptionInterval) {
			const time = formatISOTime({ hour: Math.floor(minutes / 60), minute: minutes % 60, second: 0 }, hasSeconds);
			if (isTimeInRange(time, timeMin, timeMax)) options.push({ time, label: formatDisplayTime(time) });
		}
		return options;
	});
	const activeTimeIndex = $derived(Math.min(highlightedTimeIndex, timeOptions.length - 1));
	const selectedOptionTime = $derived.by(() => {
		const parsed = valueParts.time ? parseISOTime(valueParts.time) : null;
		return parsed ? formatISOTime(parsed, hasSeconds) : undefined;
	});

	$effect(() => {
		if (isTimeOpen && (isEffectivelyDisabled || timeOptions.length === 0)) hideTimeOptions();
	});
	$effect(() => {
		const i = activeTimeIndex;
		if (!isTimeOpen || i < 0 || !timeListEl) return;
		timeListEl.querySelector(`#${CSS.escape(timeOptionId(i))}`)?.scrollIntoView({ block: 'nearest' });
	});
	// The open list is the top layer, so Escape closes it alone and not an enclosing popover.
	$effect(() => {
		if (!isTimeOpen) return;
		const layer = pushLayer();
		return () => layer.remove();
	});
	// A press outside the time segment and its list closes the list.
	$effect(() => {
		if (!isTimeOpen) return;
		const doc = timeSegmentEl?.ownerDocument ?? document;
		const onPointerDown = (e: PointerEvent) => {
			const path = e.composedPath();
			if ((timeSegmentEl && path.includes(timeSegmentEl)) || (timeListEl && path.includes(timeListEl))) return;
			hideTimeOptions();
		};
		doc.addEventListener('pointerdown', onPointerDown, true);
		return () => doc.removeEventListener('pointerdown', onPointerDown, true);
	});

	/** The last option at or before `time`, else the first. */
	function closestOptionIndex(time: ISOTimeString | undefined): number {
		if (timeOptions.length === 0) return -1;
		if (!time) return 0;
		let candidate = -1;
		for (let i = 0; i < timeOptions.length; i++) {
			if (timeOptions[i].time <= time) candidate = i;
			else break;
		}
		return candidate === -1 ? 0 : candidate;
	}

	function showTimeOptions() {
		if (!hasTimeOptions || isEffectivelyDisabled || isTimeOpen || timeOptions.length === 0) return;
		highlightedTimeIndex = closestOptionIndex(selectedOptionTime);
		highlightFollowsTyping = true;
		timeInputEl?.focus();
		isTimeOpen = true;
	}

	function hideTimeOptions() {
		isTimeOpen = false;
		highlightedTimeIndex = -1;
	}

	function commitTimeOption(time: ISOTimeString) {
		if (isEffectivelyDisabled || !isTimeInRange(time, timeMin, timeMax)) return;
		typedTime.reset();
		if (time !== selectedOptionTime && valueParts.date) {
			const combined = combineDateTime(valueParts.date, time);
			if (combined) fireChange(combined);
		}
		hideTimeOptions();
		timeInputEl?.focus();
	}

	/** The time commits only once a date is set. Emptied time text clears the value. */
	function commitTypedTime(time: ISOTimeString | undefined | null) {
		if (time === undefined) {
			if (value !== undefined) fireChange(undefined);
			return;
		}
		if (time === null || !valueParts.date) return;
		const combined = combineDateTime(valueParts.date, time);
		if (combined) fireChange(combined);
	}

	function handleTimeInput(e: Event & { currentTarget: HTMLInputElement }) {
		if (isEffectivelyDisabled) return;
		const text = e.currentTarget.value;
		const committed = typedTime.handleChange(text);
		const parsed = parseLocaleTime(text, locale, hasSeconds);
		if (isTimeOpen && parsed) {
			highlightFollowsTyping = true;
			highlightedTimeIndex = closestOptionIndex(parsed);
		}
		commitTypedTime(committed);
	}

	function handleTimeBlur(e: FocusEvent) {
		isTimeFocused = false;
		const next = e.relatedTarget as Node | null;
		if (isTimeOpen && !(next && (timeSegmentEl?.contains(next) || timeListEl?.contains(next)))) hideTimeOptions();
		commitTypedTime(typedTime.commit('blur'));
	}

	function handleTimeKeydown(e: KeyboardEvent) {
		if (e.isComposing || e.keyCode === 229 || isEffectivelyDisabled) return;
		if (hasTimeOptions) {
			if (e.key === 'Escape' && isTimeOpen) {
				e.preventDefault();
				hideTimeOptions();
				return;
			}
			if (e.key === 'ArrowDown' && e.altKey) {
				e.preventDefault();
				showTimeOptions();
				return;
			}
			if (isTimeOpen && timeOptions.length > 0) {
				const last = timeOptions.length - 1;
				const move = (i: number) => {
					e.preventDefault();
					highlightFollowsTyping = false;
					highlightedTimeIndex = i;
				};
				switch (e.key) {
					case 'ArrowDown':
						return move(Math.min(activeTimeIndex + 1, last));
					case 'ArrowUp':
						return move(Math.max(activeTimeIndex - 1, 0));
					case 'Home':
						return move(0);
					case 'End':
						return move(last);
					case 'Enter': {
						e.preventDefault();
						const pending = typedTime.pendingInput;
						if (highlightFollowsTyping && pending !== null) {
							// Typed text decides: a time the field accepts commits; anything else stays
							// with its rejection rather than falling back to the highlighted option.
							const typed = parseLocaleTime(pending, locale, hasSeconds);
							if (typed && isTimeInRange(typed, timeMin, timeMax)) {
								commitTimeOption(typed);
							} else {
								hideTimeOptions();
								commitTypedTime(typedTime.commit('enter'));
							}
							return;
						}
						const option = timeOptions[activeTimeIndex];
						if (option) commitTimeOption(option.time);
						return;
					}
					case 'Tab':
						hideTimeOptions();
						return;
				}
			}
		}
		if (e.key === 'Enter') {
			const time = typedTime.commit('enter');
			// A rejected draft holds back a form's submission.
			if (time === null && typedTime.draft.rejection != null) e.preventDefault();
			commitTypedTime(time);
			return;
		}
		if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
			e.preventDefault();
			const current = valueParts.time ?? nowTime();
			const next = adjustTime(current, e.key === 'ArrowUp' ? timeIncrement : -timeIncrement, hasSeconds);
			if (isTimeInRange(next, timeMin, timeMax) && valueParts.date) {
				const combined = combineDateTime(valueParts.date, next);
				if (combined) {
					fireChange(combined);
					// Screen readers don't announce a programmatic textbox change.
					announcement = formatDisplayTime(next);
				}
			}
		}
	}

	function focusTimeFromWrapper(e: MouseEvent) {
		if (isEffectivelyDisabled || e.target !== e.currentTarget) return;
		timeInputEl?.focus();
	}
</script>

<Field
	class={containerClass}
	{label}
	{isLabelHidden}
	{description}
	inputID={dateInputId}
	labelID={labelledByProp != null ? fieldLabelID : undefined}
	descriptionID={description ? descriptionID : undefined}
	{isOptional}
	{isRequired}
	{isDisabled}
	{labelTooltip}
	status={shownStatus
		? { type: shownStatus.type, message: shownStatus.message, messageID: shownStatus.message ? statusMessageID : undefined }
		: undefined}
	statusVariant="detached"
	{width}
>
	<Tooltip content={disabledMessage ?? ''} isEnabled={showsDisabledMessage} focusTrigger="always">
		<div
			class={['astryx-date-time-input', 'row', controlClass]}
			data-size={size}
			data-status={shownStatus?.type}
			data-disabled={isDisabled ? 'disabled' : undefined}
		>
			<div
				bind:this={dateSegmentEl}
				class="astryx-date-time-input-date-segment segment"
				class:disabled={isEffectivelyDisabled}
				data-size={size}
				data-status={dateStatus?.type}
			>
				<button
					type="button"
					class="icon-button"
					aria-disabled={isEffectivelyDisabled || undefined}
					aria-describedby={showsDisabledMessage ? disabledMessageID : undefined}
					aria-label={isOpen ? 'Close calendar' : 'Open calendar'}
					onclick={handleCalendarToggle}
				>
					<span
						class="astryx-date-time-input-toggle-icon"
						data-state={isOpen ? 'expanded' : 'collapsed'}
						style="display: contents"
					>
						<Icon icon="calendar" size="sm" color="secondary" />
					</span>
				</button>
				<input
					{...rest}
					bind:this={dateInputEl}
					id={dateInputId}
					type="text"
					role="combobox"
					value={typedDate.displayValue}
					{placeholder}
					class:invalid={typedDate.isInvalid}
					readonly={isEffectivelyDisabled || undefined}
					aria-disabled={isEffectivelyDisabled ? 'true' : undefined}
					aria-labelledby={controlLabelledBy}
					aria-describedby={describedBy}
					aria-required={isEffectivelyRequired ? 'true' : undefined}
					aria-invalid={dateStatus?.type === 'error' || typedDate.isInvalid ? 'true' : undefined}
					aria-busy={isBusy || undefined}
					aria-expanded={isOpen}
					aria-haspopup="dialog"
					aria-controls={isOpen ? `${uid}-calendar` : undefined}
					aria-autocomplete="none"
					autocomplete="off"
					oninput={(e) => typedDate.handleChange(e.currentTarget.value)}
					onfocus={(e) => {
						typedDate.handleFocus();
						onfocus?.(e);
					}}
					onblur={(e) => {
						typedDate.handleBlur();
						onblur?.(e);
					}}
					onclick={(e) => {
						if (isEffectivelyDisabled) return;
						show(false);
						onclick?.(e);
					}}
					onkeydown={handleDateKeydown}
				/>
				<!-- The form gets the combined ISO value; neither text segment holds all of it. -->
				{#if name != null && !isDisabled}
					<input type="hidden" {name} {form} value={value ?? ''} />
				{/if}
				<!-- Announces the date rejection message that the field status does not announce. -->
				<VisuallyHidden role="alert" aria-live="assertive">{typedDate.alertMessage}</VisuallyHidden>
				{#if hasClear && value !== undefined && !isEffectivelyDisabled}
					<Button
						class="astryx-input-clear-button input-clear"
						variant="ghost"
						size="sm"
						label="Clear {label}"
						icon="close"
						isIconOnly
						onmousedown={(e) => e.preventDefault()}
						onclick={handleClear}
					/>
				{/if}
				{#if isBusy}<Spinner size="sm" aria-hidden="true" />{/if}
				{#if shownStatus}<Icon icon={shownStatus.type} size="md" color={shownStatus.type} />{/if}
			</div>

			<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
			<div
				bind:this={timeSegmentEl}
				class="astryx-date-time-input-time-segment segment time-segment"
				class:disabled={isEffectivelyDisabled}
				data-size={size}
				data-status={timeStatus?.type}
				onclick={focusTimeFromWrapper}
			>
				<span class="astryx-date-time-input-clock-icon icon"><Icon icon="clock" size="sm" color="secondary" /></span>
				<input
					bind:this={timeInputEl}
					id={timeInputId}
					type="text"
					value={timeDisplayValue}
					placeholder={timeShownPlaceholder}
					class:invalid={typedTime.isRejected}
					role={hasTimeOptions ? 'combobox' : undefined}
					aria-expanded={hasTimeOptions ? isTimeOpen : undefined}
					aria-controls={hasTimeOptions && isTimeOpen ? timeListboxId : undefined}
					aria-autocomplete={hasTimeOptions ? 'list' : undefined}
					aria-activedescendant={hasTimeOptions && isTimeOpen && activeTimeIndex >= 0
						? timeOptionId(activeTimeIndex)
						: undefined}
					readonly={isEffectivelyDisabled || undefined}
					aria-disabled={isEffectivelyDisabled ? 'true' : undefined}
					aria-label={timeName}
					aria-describedby={describedBy}
					aria-required={isEffectivelyRequired ? 'true' : undefined}
					aria-invalid={status?.type === 'error' || typedTime.isRejected ? 'true' : undefined}
					aria-busy={isBusy || undefined}
					autocomplete="off"
					oninput={handleTimeInput}
					onfocus={() => {
						if (!isEffectivelyDisabled) isTimeFocused = true;
					}}
					onblur={handleTimeBlur}
					onclick={hasTimeOptions ? showTimeOptions : undefined}
					onkeydown={handleTimeKeydown}
				/>
				<!-- Announces the time rejection message that the field status does not announce. -->
				<VisuallyHidden role="alert" aria-live="assertive">{timeAlertMessage}</VisuallyHidden>
				<VisuallyHidden aria-live="polite">{announcement}</VisuallyHidden>
			</div>
		</div>
	</Tooltip>
	{#if showsDisabledMessage}
		<VisuallyHidden id={disabledMessageID}>{disabledMessage}</VisuallyHidden>
	{/if}
	{#if messagelessError}
		<VisuallyHidden id={statusMessageID}>This field has an error</VisuallyHidden>
	{/if}

	<DatePopover
		open={isOpen}
		anchor={dateSegmentEl}
		id="{uid}-calendar"
		label="Choose date and time"
		closeLabel="Close calendar"
		{isOwnPress}
		onDismiss={hide}
		autoFocus={pendingCalendarFocus}
	>
		{#if isOpen}
			<Calendar
				bind:this={calendar}
				mode="single"
				value={valueParts.date ?? null}
				onChange={((d: ISODateString) => {
					handleDateChange(d, 'calendar');
					typedDate.reset();
				}) as (value: ISODateString) => void}
				min={minParts.date}
				max={maxParts.date}
				{dateConstraints}
				{numberOfMonths}
				{weekStartsOn}
				{locale}
			/>
		{/if}
	</DatePopover>

	{#if hasTimeOptions}
		<Layer
			open={isTimeOpen && timeSegmentEl != null}
			anchor={timeSegmentEl}
			placement="below"
			alignment="start"
			offset={4}
			bind:element={timeListEl}
			class="astryx-date-time-input-time-popup"
			style="min-width: {timeSegmentEl?.offsetWidth ?? 0}px"
		>
			{#if isTimeOpen}
				<div id={timeListboxId} role="listbox" aria-label="{timeName} options" class="astryx-date-time-input-time-listbox listbox">
					{#each timeOptions as option, index (option.time)}
						{@const isSelected = option.time === selectedOptionTime}
						<!-- svelte-ignore a11y_click_events_have_key_events -->
						<div
							id={timeOptionId(index)}
							role="option"
							aria-selected={isSelected}
							tabindex={-1}
							class="astryx-date-time-input-time-option option"
							class:highlighted={index === activeTimeIndex}
							class:selected={isSelected}
							data-size={size}
							onpointerdown={(e) => e.preventDefault()}
							onclick={() => commitTimeOption(option.time)}
							onmouseenter={() => (highlightedTimeIndex = index)}
						>
							{option.label}
						</div>
					{/each}
				</div>
			{/if}
		</Layer>
	{/if}
</Field>

<style>
	@layer astryx-base {
		.row {
			display: flex;
			flex-wrap: wrap;
			gap: var(--spacing-2);
		}
		.segment {
			box-sizing: border-box;
			position: relative;
			z-index: 1;
			display: flex;
			align-items: center;
			gap: var(--spacing-2);
			padding-block: var(--spacing-1);
			padding-inline: var(--spacing-2);
			flex: 1;
			flex-basis: 196px;
			min-width: 0;
			border: var(--border-width) solid var(--color-border-emphasized);
			--_field-radius: var(--radius-element);
			border-radius: var(--_field-radius);
			background-color: var(--color-background-surface);
			transition-property: border-color, box-shadow;
			transition-duration: var(--duration-fast);
			transition-timing-function: var(--ease-standard);
			box-shadow: none;
			outline: none;
		}
		.time-segment { cursor: text; }
		@media (prefers-reduced-motion: reduce), (pointer: coarse) {
			.segment { transition-duration: 0s; }
		}
		@media (hover: hover) {
			.segment:not(.disabled):hover:not(:focus-within) {
				box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--color-border-emphasized) 30%, transparent);
			}
			.segment[data-status='warning']:not(.disabled):hover:not(:focus-within) { box-shadow: var(--shadow-inset-warning); }
			.segment[data-status='error']:not(.disabled):hover:not(:focus-within) { box-shadow: var(--shadow-inset-error); }
			.segment[data-status='success']:not(.disabled):hover:not(:focus-within) { box-shadow: var(--shadow-inset-success); }
		}
		.segment:focus-within {
			border-color: var(--color-accent);
			box-shadow: inset 0 0 0 2px var(--color-accent-muted);
		}
		@media (forced-colors: active) {
			.segment:focus-within { border-color: Highlight; }
		}
		.segment[data-status='warning'] { border-color: var(--color-border-warning); }
		.segment[data-status='error'] { border-color: var(--color-border-error); }
		.segment[data-status='success'] { border-color: var(--color-border-success); }
		.disabled { opacity: 0.5; border-color: var(--color-border-emphasized); box-shadow: none; cursor: default; }
		.disabled:focus-within { box-shadow: none; }

		.segment[data-size='sm'] { height: max(var(--size-element-sm), calc(var(--text-body-size) * var(--text-body-leading) + 2 * var(--border-width))); }
		.segment[data-size='md'] { height: max(var(--size-element-md), calc(var(--text-body-size) * var(--text-body-leading) + 2 * var(--border-width))); }
		.segment[data-size='lg'] { height: max(var(--size-element-lg), calc(var(--text-body-size) * var(--text-body-leading) + 2 * var(--border-width))); }

		.icon-button {
			display: flex;
			align-items: center;
			justify-content: center;
			padding: 0;
			margin: 0;
			border: none;
			background-color: transparent;
			cursor: pointer;
			border-radius: var(--radius-element);
			color: inherit;
		}
		.icon-button[aria-disabled='true'] { cursor: default; }
		.icon-button:focus-visible {
			outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color);
			outline-offset: 2px;
		}
		.icon {
			display: flex;
			align-items: center;
			justify-content: center;
			flex-shrink: 0;
		}

		input {
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
				input { font-size: max(1rem, var(--text-body-size)); }
			}
		}
		input::placeholder { color: var(--color-text-secondary); }
		input[aria-disabled='true'] { cursor: default; }
		input.invalid { color: var(--color-text-secondary); }
		.segment :global(.input-clear) { height: 20px; color: var(--color-icon-secondary); }

		:global(.astryx-layer.astryx-date-time-input-time-popup) {
			box-sizing: border-box;
			background-color: var(--color-background-popover);
			color: var(--color-text-primary);
			border-radius: var(--radius-container);
			box-shadow: var(--shadow-low);
			overflow: hidden;
		}
		@media (forced-colors: active) {
			:global(.astryx-layer.astryx-date-time-input-time-popup) { border: 1px solid CanvasText; }
		}
		.listbox {
			box-sizing: border-box;
			max-height: 300px;
			overflow-y: auto;
			padding: var(--spacing-1);
		}
		.option {
			box-sizing: border-box;
			display: flex;
			align-items: center;
			width: 100%;
			padding-block: var(--spacing-1-5);
			padding-inline: var(--spacing-2);
			border-radius: var(--radius-element);
			cursor: pointer;
			text-align: start;
			font-family: var(--font-family-body);
			font-size: var(--text-body-size);
			line-height: var(--text-body-leading);
			color: var(--color-text-primary);
			background-color: transparent;
		}
		.option[data-size='sm'] { padding-block: var(--spacing-1); }
		.option[data-size='lg'] { padding-block: var(--spacing-2); }
		.option.highlighted { background-color: var(--color-overlay-hover); }
		.option.selected { font-weight: var(--font-weight-medium); }
	}
</style>
