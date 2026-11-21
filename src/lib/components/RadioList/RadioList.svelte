<!--
  Port of Astryx `RadioList` (packages/core/src/RadioList/RadioList.tsx), MIT, Meta Platforms, Inc.
  A labelled radiogroup of `RadioListItem`s. Use `bind:value`, or `value` + `onChange(value)`.
  Tab enters on the checked radio (or the first/last when none is checked) and leaves the group
  in one step; arrow keys move between radios natively.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import Field from '../Field/Field.svelte';
	import type { FieldStatusInput } from '../Field/types.js';
	import Tooltip from '../Tooltip/Tooltip.svelte';
	import VisuallyHidden from '../VisuallyHidden/VisuallyHidden.svelte';
	import type { SizeValue } from '../../types.js';
	import { setRadioListContext, type RadioListSize } from './context.js';

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'onchange'> {
		label: string;
		isLabelHidden?: boolean;
		description?: string;
		value?: string;
		onChange?: (value: string) => void;
		orientation?: 'vertical' | 'horizontal';
		isDisabled?: boolean;
		/** Why the group is disabled; shown in a tooltip on hover and focus. */
		disabledMessage?: string;
		htmlName?: string;
		isRequired?: boolean;
		isOptional?: boolean;
		status?: FieldStatusInput;
		size?: RadioListSize;
		width?: SizeValue;
		labelTooltip?: string;
		containerClass?: string;
		children: Snippet;
	}

	let {
		label,
		isLabelHidden = false,
		description,
		value = $bindable(''),
		onChange,
		orientation = 'vertical',
		isDisabled = false,
		disabledMessage,
		htmlName,
		isRequired = false,
		isOptional = false,
		status,
		size = 'md',
		width,
		labelTooltip,
		containerClass,
		children,
		class: className,
		onfocusin,
		onkeydown,
		onfocusout,
		'aria-labelledby': labelledByProp,
		'aria-describedby': describedByProp,
		...rest
	}: Props = $props();

	const uid = $props.id();
	const name = $derived(htmlName ?? `${uid}-radio`);
	const inputID = `${uid}-group`;
	const labelID = `${uid}-label`;
	const descriptionID = `${uid}-desc`;
	const statusMessageID = `${uid}-status`;
	const disabledReasonID = `${uid}-disabled-reason`;
	const showsDisabledMessage = $derived(isDisabled && !!disabledMessage);
	let group: HTMLDivElement | undefined = $state();

	setRadioListContext({
		get name() { return name; },
		get value() { return value; },
		get isDisabled() { return isDisabled; },
		get hasDisabledMessage() { return showsDisabledMessage; },
		get disabledReasonID() { return showsDisabledMessage ? disabledReasonID : undefined; },
		get isRequired() { return isRequired && !isOptional; },
		get size() { return size; },
		get status() { return status; },
		select(next: string) {
			if (isDisabled) return;
			value = next;
			onChange?.(next);
		}
	});

	// With nothing checked, browsers make every radio a tab stop. Send entering focus to the
	// first radio (or the last when tabbing backwards) so the group is one stop.
	function handleFocusIn(e: FocusEvent & { currentTarget: EventTarget & HTMLDivElement }) {
		(onfocusin as ((e: FocusEvent) => void) | undefined)?.(e);
		if (value !== '' || !group) return;
		const related = e.relatedTarget as Node | null;
		if (related && group.contains(related)) return;
		const radios = [...group.querySelectorAll<HTMLInputElement>('input[type="radio"]:not([disabled])')];
		const index = radios.indexOf(e.target as HTMLInputElement);
		if (index === -1) return;
		const intended = index === radios.length - 1 ? radios[radios.length - 1] : radios[0];
		if (intended !== e.target) intended.focus();
	}

	// Tab from a radio leaves the group: hide the other radios from the tab order for this one step.
	let restoreTabIndexes: (() => void) | null = null;
	function restore() {
		const r = restoreTabIndexes;
		restoreTabIndexes = null;
		r?.();
	}
	function handleKeydown(e: KeyboardEvent & { currentTarget: EventTarget & HTMLDivElement }) {
		(onkeydown as ((e: KeyboardEvent) => void) | undefined)?.(e);
		if (e.key !== 'Tab' || e.ctrlKey || e.metaKey) return;
		restore();
		const from = e.target as HTMLInputElement;
		if (!group || !(from instanceof HTMLInputElement) || from.type !== 'radio' || from.name !== name) return;
		const others = [...group.querySelectorAll<HTMLInputElement>('input[type="radio"]')].filter(
			(r) => r !== from && r.name === name
		);
		if (others.length === 0) return;
		const saved = others.map((r) => [r, r.getAttribute('tabindex')] as const);
		for (const r of others) r.tabIndex = -1;
		restoreTabIndexes = () => {
			for (const [r, t] of saved) {
				if (t == null) r.removeAttribute('tabindex');
				else r.setAttribute('tabindex', t);
			}
		};
		setTimeout(restore, 0);
	}

	const describedBy = $derived(
		[
			describedByProp,
			description ? descriptionID : null,
			status?.message ? statusMessageID : null,
			showsDisabledMessage ? disabledReasonID : null
		]
			.filter(Boolean)
			.join(' ') || undefined
	);
</script>

<Field
	class={containerClass}
	{label}
	{isLabelHidden}
	{description}
	{inputID}
	{labelID}
	isGroupLabel
	descriptionID={description ? descriptionID : undefined}
	{isOptional}
	{isRequired}
	{isDisabled}
	status={status
		? { type: status.type, message: status.message, messageID: status.message ? statusMessageID : undefined }
		: undefined}
	{labelTooltip}
	statusVariant="detached"
	{width}
>
	<Tooltip content={disabledMessage ?? ''} isEnabled={showsDisabledMessage} focusTrigger="always">
		<div
			{...rest}
			bind:this={group}
			id={inputID}
			role="radiogroup"
			class={['astryx-radio-list', 'group', className]}
			data-orientation={orientation}
			data-size={size}
			aria-disabled={isDisabled || undefined}
			aria-labelledby={[labelID, labelledByProp].filter(Boolean).join(' ')}
			aria-describedby={describedBy}
			aria-invalid={status?.type === 'error' ? true : undefined}
			aria-required={(isRequired && !isOptional) || undefined}
			onfocusin={handleFocusIn}
			onkeydown={handleKeydown}
			onfocusout={(e) => {
				restore();
				(onfocusout as ((e: FocusEvent) => void) | undefined)?.(e);
			}}
		>
			{@render children()}
		</div>
	</Tooltip>
	{#if showsDisabledMessage}
		<VisuallyHidden id={disabledReasonID}>{disabledMessage}</VisuallyHidden>
	{/if}
</Field>

<style>
	@layer astryx-base {
		.group { display: flex; }
		.group[data-orientation='vertical'] { flex-direction: column; gap: var(--spacing-2); }
		.group[data-orientation='horizontal'] { flex-direction: row; gap: var(--spacing-5); }
	}
</style>
