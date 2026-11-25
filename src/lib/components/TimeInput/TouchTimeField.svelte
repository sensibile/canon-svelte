<!--
  Port of Astryx `TouchTimeField` (packages/core/src/TimeInput/TouchTimeField.tsx), MIT, Meta Platforms, Inc.
  TimeInput's bottom-sheet surface. The field shows the time and takes no typing; a tap opens a
  sheet of wheels (hour, minute, optional second, and AM/PM on a 12-hour clock). Each wheel commits
  as it comes to rest, held inside `min` and `max`; Save closes the sheet.
  Port change: the wheels are the native scroll-snap wheels on every pointer, each column on its
  own, as Astryx does on a fine pointer. Not yet ported: the coupled touch-physics wheels
  (TimeWheels), `changeAction`, and the "tooltip" status variant.
-->
<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import Field from '../Field/Field.svelte';
	import type { FieldStatusInput, FieldStatusPlacement } from '../Field/types.js';
	import Icon from '../Icon/Icon.svelte';
	import Spinner from '../Spinner/Spinner.svelte';
	import Button from '../Button/Button.svelte';
	import VisuallyHidden from '../VisuallyHidden/VisuallyHidden.svelte';
	import Tooltip from '../Tooltip/Tooltip.svelte';
	import BottomSheet from '../BottomSheet/BottomSheet.svelte';
	import Wheel from '../DateInput/Wheel.svelte';
	import type { SizeValue } from '../../types.js';
	import { getInputGroupContext, INPUT_GROUP_ITEM, setInputGroupContext } from '../InputGroup/context.js';
	import {
		clampTime,
		formatISOTime,
		isTimeInRange,
		parseISOTime,
		type ISOTimeString
	} from '../../internal/date/timeParser.js';
	import { formatLocaleTime } from '../../internal/date/timeFormat.js';
	import {
		hour12From24,
		hour24From12,
		hourRowsInHalf,
		meridiemRows,
		minuteRows,
		secondRows,
		wheelBounds
	} from './timeWheelRules.js';

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
		disabledMessage?: string;
		value?: ISOTimeString | string;
		onChange?: (value: ISOTimeString | undefined) => void;
		isLoading?: boolean;
		min?: ISOTimeString | string;
		max?: ISOTimeString | string;
		hasSeconds?: boolean;
		hasClear?: boolean;
		hourFormat: '12h' | '24h';
		placeholder?: string;
		size?: 'sm' | 'md' | 'lg';
		status?: FieldStatusInput;
		statusVariant?: FieldStatusPlacement;
		width?: SizeValue;
		labelTooltip?: string;
		locale?: string;
		containerClass?: string;
		controlClass?: string;
	}

	let {
		label,
		isLabelHidden = false,
		description,
		isOptional = false,
		isRequired = false,
		isDisabled: isDisabledProp = false,
		disabledMessage,
		value = $bindable(),
		onChange,
		isLoading = false,
		min,
		max,
		hasSeconds = false,
		hasClear = false,
		hourFormat,
		placeholder: placeholderProp,
		size: sizeProp,
		status,
		statusVariant = 'attached',
		width,
		labelTooltip,
		locale = 'en-US',
		containerClass,
		controlClass,
		id: idProp,
		'aria-describedby': describedByProp,
		'aria-labelledby': labelledByProp,
		onclick,
		onkeydown,
		name,
		...rest
	}: Props = $props();

	const inputGroup = getInputGroupContext();
	setInputGroupContext(null);
	const isDisabled = $derived(isDisabledProp || (inputGroup?.isDisabled ?? false));
	const isLocked = $derived(isDisabled || isLoading);
	const size = $derived(sizeProp ?? inputGroup?.size ?? 'md');
	const placeholder = $derived(placeholderProp ?? 'Select a time');
	const timeValue = $derived(value as ISOTimeString | undefined);
	const minTime = $derived(min as ISOTimeString | undefined);
	const maxTime = $derived(max as ISOTimeString | undefined);

	const uid = $props.id();
	const id = $derived(idProp ?? `${uid}-input`);
	const descriptionID = `${uid}-desc`;
	const statusMessageID = `${uid}-status`;
	const disabledMessageID = `${uid}-disabled-reason`;
	const inputLabelID = `${uid}-input-label`;
	const showsDisabledMessage = $derived(isDisabled && !!disabledMessage);
	let isSheetOpen = $state(false);

	function fireChange(next: ISOTimeString | undefined) {
		if (isLocked) return;
		value = next;
		onChange?.(next);
	}

	const displayValue = $derived(timeValue ? formatLocaleTime(timeValue, locale, hourFormat, hasSeconds) : '');

	// With no time set, the wheels start at the time the sheet opens.
	let fallbackTime = $state(formatISOTime({ hour: 0, minute: 0, second: 0 }, false));
	const wheelTime = $derived(parseISOTime(timeValue ?? fallbackTime) ?? { hour: 0, minute: 0, second: 0 });

	function compose(patch: { hour24?: number; hour12?: number; minute?: number; second?: number; meridiem?: number }) {
		const meridiem = patch.meridiem ?? (wheelTime.hour < 12 ? 0 : 1);
		let hour = wheelTime.hour;
		if (patch.hour24 !== undefined) hour = patch.hour24;
		else if (patch.hour12 !== undefined) hour = hour24From12(patch.hour12, meridiem);
		else if (patch.meridiem !== undefined) hour = hour24From12(hour12From24(hour), patch.meridiem);
		return formatISOTime(
			{
				hour,
				minute: patch.minute ?? wheelTime.minute,
				second: hasSeconds ? (patch.second ?? wheelTime.second) : 0
			},
			hasSeconds
		);
	}

	function commit(raw: ISOTimeString) {
		const next = clampTime(raw, minTime, maxTime, hasSeconds);
		if (next !== timeValue && isTimeInRange(next, minTime, maxTime)) fireChange(next);
	}

	const bounds = $derived(wheelBounds(min, max));
	const hourOptions = $derived(hourRowsInHalf(wheelTime.hour, hourFormat, bounds));
	const minuteOptions = $derived(minuteRows(wheelTime.hour, hasSeconds, bounds));
	const secondOptions = $derived(secondRows(wheelTime.hour, wheelTime.minute, bounds));
	const meridiemOptions = $derived(meridiemRows({ am: 'AM', pm: 'PM' }, bounds));

	function openSheet() {
		if (isLocked) return;
		const now = new Date();
		fallbackTime = formatISOTime({ hour: now.getHours(), minute: now.getMinutes(), second: now.getSeconds() }, hasSeconds);
		isSheetOpen = true;
	}

	// Saving an empty field keeps the time the wheels show.
	function save() {
		if (timeValue === undefined) commit(compose({}));
		isSheetOpen = false;
	}

	const describedBy = $derived(
		[
			inputGroup?.describedByIDs,
			description && !inputGroup ? descriptionID : null,
			!inputGroup && status?.message ? statusMessageID : null,
			showsDisabledMessage ? disabledMessageID : null,
			describedByProp
		]
			.filter(Boolean)
			.join(' ') || undefined
	);
	const labelledBy = $derived(
		inputGroup ? [inputGroup.labelID, inputLabelID, labelledByProp].filter(Boolean).join(' ') : labelledByProp
	);
</script>

{#snippet control()}
	<Tooltip content={disabledMessage ?? ''} isEnabled={showsDisabledMessage} focusTrigger="always">
		<div
			class={['astryx-time-input', 'control', controlClass]}
			class:disabled={isDisabled}
			class:in-group={inputGroup != null}
			data-size={size}
			data-status={status?.type}
			data-disabled={isDisabled ? 'disabled' : undefined}
			{...{ [INPUT_GROUP_ITEM]: inputGroup ? '' : undefined }}
		>
			{#if inputGroup}<VisuallyHidden id={inputLabelID}>{label}</VisuallyHidden>{/if}
			<button
				type="button"
				class="icon-button"
				tabindex="-1"
				aria-label="Open time picker for {label}"
				aria-disabled={isLocked || undefined}
				onclick={openSheet}
			>
				<Icon icon="clock" size="sm" color="secondary" />
			</button>
			<input
				{...rest}
				{id}
				name={isDisabled ? undefined : name}
				type="text"
				role="combobox"
				value={displayValue}
				readonly
				inputmode="none"
				autocomplete="off"
				{placeholder}
				aria-disabled={isLocked ? 'true' : undefined}
				aria-labelledby={labelledBy}
				aria-describedby={describedBy}
				aria-required={isRequired && !isOptional ? 'true' : undefined}
				aria-invalid={status?.type === 'error' ? 'true' : undefined}
				aria-busy={isLoading || undefined}
				aria-expanded={isSheetOpen}
				aria-haspopup="dialog"
				aria-autocomplete="none"
				onclick={(e) => {
					if (isLocked) return;
					openSheet();
					onclick?.(e);
				}}
				onkeydown={(e) => {
					// The keys that open the sheet; Enter in a disabled field would also submit a surrounding form.
					if (!e.isComposing && e.keyCode !== 229 && ['ArrowDown', 'Enter', ' ', 'Spacebar'].includes(e.key)) {
						e.preventDefault();
						openSheet();
					}
					onkeydown?.(e);
				}}
			/>
			{#if isLoading}<Spinner size="sm" aria-hidden="true" />{/if}
			{#if hasClear && timeValue && !isLocked}
				<Button
					class="astryx-input-clear-button input-clear"
					variant="ghost"
					size="sm"
					label="Clear {label}"
					icon="close"
					isIconOnly
					onmousedown={(e) => e.preventDefault()}
					onclick={() => fireChange(undefined)}
				/>
			{/if}
			{#if status}<Icon icon={status.type} size="md" color={status.type} />{/if}
		</div>
	</Tooltip>
	{#if showsDisabledMessage}
		<VisuallyHidden id={disabledMessageID}>{disabledMessage}</VisuallyHidden>
	{/if}
	<BottomSheet isOpen={isSheetOpen} onOpenChange={(open) => (isSheetOpen = open)} {label} height="hug" padding={0}>
		<div class="sheet-body">
			<div class="wheels">
				<Wheel
					label="Hour"
					options={hourOptions}
					value={hourFormat === '24h' ? wheelTime.hour : hour12From24(wheelTime.hour)}
					isActive={isSheetOpen}
					onChange={(hour) => commit(hourFormat === '24h' ? compose({ hour24: hour }) : compose({ hour12: hour }))}
				/>
				<Wheel
					label="Minute"
					options={minuteOptions}
					value={wheelTime.minute}
					isActive={isSheetOpen}
					onChange={(minute) => commit(compose({ minute }))}
				/>
				{#if hasSeconds}
					<Wheel
						label="Second"
						options={secondOptions}
						value={wheelTime.second}
						isActive={isSheetOpen}
						onChange={(second) => commit(compose({ second }))}
					/>
				{/if}
				{#if hourFormat === '12h'}
					<Wheel
						label="AM/PM"
						options={meridiemOptions}
						value={wheelTime.hour < 12 ? 0 : 1}
						isActive={isSheetOpen}
						onChange={(meridiem) => commit(compose({ meridiem }))}
					/>
				{/if}
			</div>
			<div class="footer">
				<Button variant="primary" size="md" width="100%" label="Save" onclick={save} />
			</div>
		</div>
	</BottomSheet>
{/snippet}

{#if inputGroup}
	{@render control()}
{:else}
	<Field
		class={containerClass}
		{label}
		{isLabelHidden}
		{description}
		inputID={id}
		descriptionID={description ? descriptionID : undefined}
		{isOptional}
		{isRequired}
		{isDisabled}
		{labelTooltip}
		status={status
			? { type: status.type, message: status.message, messageID: status.message ? statusMessageID : undefined }
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
			gap: var(--spacing-2);
			padding-block: var(--spacing-1);
			padding-inline: var(--spacing-2);
			min-width: 120px;
			border: var(--border-width) solid var(--color-border-emphasized);
			--_field-radius: var(--radius-element);
			border-radius: var(--_field-radius);
			background-color: var(--color-background-surface);
			transition-property: border-color, box-shadow;
			transition-duration: var(--duration-fast);
			transition-timing-function: var(--ease-standard);
			outline: none;
		}
		@media (prefers-reduced-motion: reduce), (pointer: coarse) {
			.control { transition-duration: 0s; }
		}
		@media (hover: hover) {
			.control:not(.disabled):hover:not(:focus-within) {
				box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--color-border-emphasized) 30%, transparent);
			}
			.control[data-status='warning']:not(.disabled):hover:not(:focus-within) { box-shadow: var(--shadow-inset-warning); }
			.control[data-status='error']:not(.disabled):hover:not(:focus-within) { box-shadow: var(--shadow-inset-error); }
			.control[data-status='success']:not(.disabled):hover:not(:focus-within) { box-shadow: var(--shadow-inset-success); }
		}
		.control:focus-within {
			border-color: var(--color-accent);
			box-shadow: inset 0 0 0 2px var(--color-accent-muted);
		}
		@media (forced-colors: active) {
			.control:focus-within { border-color: Highlight; }
		}
		.control[data-status='warning'] { border-color: var(--color-border-warning); }
		.control[data-status='error'] { border-color: var(--color-border-error); }
		.control[data-status='success'] { border-color: var(--color-border-success); }
		.in-group { flex: 1; min-width: 0; }
		.in-group.disabled { opacity: 1; }
		.disabled { opacity: 0.5; border-color: var(--color-border-emphasized); box-shadow: none; }
		.disabled:focus-within { box-shadow: none; }
		.control[data-size='sm'] { height: var(--size-element-sm); }
		.control[data-size='md'] { height: var(--size-element-md); }
		.control[data-size='lg'] { height: var(--size-element-lg); }

		.icon-button {
			display: flex;
			align-items: center;
			justify-content: center;
			flex-shrink: 0;
			padding: 0;
			margin: 0;
			border: 0 none;
			background-color: transparent;
			border-radius: var(--radius-element);
			cursor: pointer;
		}
		.icon-button[aria-disabled='true'] { cursor: default; }
		.icon-button:focus-visible {
			outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color);
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
			cursor: pointer;
		}
		@media (pointer: coarse) {
			@supports (-webkit-touch-callout: none) {
				input { font-size: max(1rem, var(--text-body-size)); }
			}
		}
		input::placeholder { color: var(--color-text-secondary); }
		input[aria-disabled='true'] { cursor: default; }
		.control :global(.input-clear) { height: 20px; color: var(--color-icon-secondary); }

		.sheet-body {
			box-sizing: border-box;
			display: flex;
			flex-direction: column;
			inline-size: 100%;
			min-inline-size: 0;
			gap: var(--spacing-2);
			padding-inline: var(--spacing-4);
			padding-block: 0 var(--spacing-4);
		}
		.wheels {
			display: flex;
			inline-size: 100%;
			min-inline-size: 0;
			block-size: calc(6 * 44px);
			gap: var(--spacing-2);
		}
		.footer {
			display: flex;
			margin-block-start: auto;
			padding-block-start: var(--spacing-1);
		}
	}
</style>
