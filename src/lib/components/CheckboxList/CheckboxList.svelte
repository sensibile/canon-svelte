<!--
  Port of Astryx `CheckboxList` (packages/core/src/CheckboxList/CheckboxList.tsx), MIT, Meta Platforms, Inc.
  A labelled group of `CheckboxListItem`s. Pass `value` (an array, `bind:value` works) for a
  controlled set, or give each item `isChecked` + `onCheck`.
  With `isRequired`, the first enabled box is marked required while none is checked, so native
  form validation asks for at least one.
  Not yet ported: `changeAction` (optimistic async change). The list rows are a plain list until
  `List` is ported.
-->
<script lang="ts">
	import { tick, type Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import Field from '../Field/Field.svelte';
	import type { FieldStatusInput } from '../Field/types.js';
	import type { ItemDensity } from '../Item/Item.svelte';
	import Tooltip from '../Tooltip/Tooltip.svelte';
	import VisuallyHidden from '../VisuallyHidden/VisuallyHidden.svelte';
	import type { SizeValue } from '../../types.js';
	import { setCheckboxListContext } from './context.js';

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'onchange'> {
		label: string;
		isLabelHidden?: boolean;
		description?: string;
		isOptional?: boolean;
		isRequired?: boolean;
		status?: FieldStatusInput;
		value?: string[];
		onChange?: (values: string[]) => void;
		density?: ItemDensity;
		hasDividers?: boolean;
		isDisabled?: boolean;
		disabledMessage?: string;
		isReadOnly?: boolean;
		width?: SizeValue;
		labelTooltip?: string;
		containerClass?: string;
		children: Snippet;
	}

	let {
		label,
		isLabelHidden = false,
		description,
		isOptional = false,
		isRequired = false,
		status,
		value = $bindable(),
		onChange,
		density = 'balanced',
		hasDividers = false,
		isDisabled = false,
		disabledMessage,
		isReadOnly = false,
		width,
		labelTooltip,
		containerClass,
		children,
		class: className,
		'aria-labelledby': labelledByProp,
		'aria-describedby': describedByProp,
		...rest
	}: Props = $props();

	const uid = $props.id();
	const inputID = `${uid}-group`;
	const labelID = `${uid}-label`;
	const descriptionID = `${uid}-desc`;
	const statusMessageID = `${uid}-status`;
	const disabledMessageID = `${uid}-disabled-reason`;
	const showsDisabledMessage = $derived(isDisabled && !!disabledMessage);
	let group: HTMLDivElement | undefined = $state();

	setCheckboxListContext({
		get value() { return value; },
		get isDisabled() { return isDisabled; },
		get hasDisabledMessage() { return showsDisabledMessage; },
		get disabledMessageID() { return showsDisabledMessage ? disabledMessageID : undefined; },
		get isReadOnly() { return isReadOnly; },
		get isInvalid() { return status?.type === 'error'; },
		get density() { return density; },
		get hasDividers() { return hasDividers; },
		toggle(v: string) {
			if (value === undefined) return;
			const next = value.includes(v) ? value.filter((x) => x !== v) : [...value, v];
			value = next;
			onChange?.(next);
		},
		itemChanged() {
			syncRequired();
		}
	});

	// Required group: only the first enabled box carries `required`, and only while none is checked.
	function syncRequired() {
		if (!group) return;
		const boxes = [...group.querySelectorAll<HTMLInputElement>('input[type="checkbox"][data-checkbox-list-item]')];
		const isEmpty = !boxes.some((b) => b.checked);
		const target = isRequired && isEmpty ? boxes.find((b) => !b.disabled && !b.readOnly && !b.hasAttribute('aria-readonly')) : undefined;
		for (const b of boxes) b.required = b === target;
	}
	$effect(() => {
		const root = group;
		void value;
		void isRequired;
		if (!root) return;
		tick().then(syncRequired);
		const observer = new MutationObserver(syncRequired);
		observer.observe(root, { childList: true, subtree: true });
		root.addEventListener('change', syncRequired);
		return () => {
			observer.disconnect();
			root.removeEventListener('change', syncRequired);
		};
	});

	const describedBy = $derived(
		[
			describedByProp,
			description ? descriptionID : null,
			status?.message ? statusMessageID : null,
			showsDisabledMessage ? disabledMessageID : null
		]
			.filter(Boolean)
			.join(' ') || undefined
	);
</script>

<Field
	class={['astryx-checkbox-list', containerClass].filter(Boolean).join(' ')}
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
			role="group"
			class={className}
			aria-disabled={isDisabled || undefined}
			aria-labelledby={[labelID, labelledByProp].filter(Boolean).join(' ')}
			aria-describedby={describedBy}
		>
			<ul class="astryx-list list" class:dividers={hasDividers} data-density={density}>
				{@render children()}
			</ul>
		</div>
	</Tooltip>
	{#if showsDisabledMessage}
		<VisuallyHidden id={disabledMessageID}>{disabledMessage}</VisuallyHidden>
	{/if}
</Field>

<style>
	@layer astryx-base {
		.list {
			margin: 0;
			padding-inline-start: 0;
			list-style-type: none;
			display: flex;
			flex-direction: column;
			gap: var(--spacing-0-5);
			overflow-inline: clip;
		}
		.dividers { row-gap: 0; }
	}
</style>
