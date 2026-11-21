<!--
  Port of Astryx `InputGroup` (packages/core/src/InputGroup), MIT, Meta Platforms, Inc.
  Joins inputs, buttons and `InputGroupText` add-ons into one row under one label. Members
  inside the group drop their own Field and are named by the group label plus their own label.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import Field from '../Field/Field.svelte';
	import type { FieldStatusInput } from '../Field/types.js';
	import { INPUT_GROUP_ITEM, getInputGroupContext, setInputGroupContext, type InputGroupSize } from './context.js';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		label: string;
		isLabelHidden?: boolean;
		description?: string;
		isDisabled?: boolean;
		isOptional?: boolean;
		isRequired?: boolean;
		size?: InputGroupSize;
		status?: FieldStatusInput;
		labelTooltip?: string;
		children: Snippet;
	}

	let {
		label,
		isLabelHidden = false,
		description,
		isDisabled: isDisabledProp = false,
		isOptional = false,
		isRequired = false,
		size = 'md',
		status,
		labelTooltip,
		children,
		class: className,
		...rest
	}: Props = $props();

	const parent = getInputGroupContext();
	const isDisabled = $derived(isDisabledProp || (parent?.isDisabled ?? false));
	const uid = $props.id();
	const inputID = `${uid}-group`;
	const labelID = `${uid}-label`;
	const descriptionID = `${uid}-desc`;
	const statusMessageID = `${uid}-status`;
	const describedByIDs = $derived(
		[description ? descriptionID : null, status?.message ? statusMessageID : null].filter(Boolean).join(' ') ||
			undefined
	);

	setInputGroupContext({
		labelID,
		get describedByIDs() { return describedByIDs; },
		get isDisabled() { return isDisabled; },
		get size() { return size; }
	});

	// Mark the first and last member so joined corners stay rounded. Members may sit inside
	// wrappers (tooltips), so position comes from document order, not :first-child.
	let group: HTMLDivElement | undefined = $state();
	$effect(() => {
		const root = group;
		if (!root) return;
		const sync = () => {
			const items = [...root.querySelectorAll<HTMLElement>(`[${INPUT_GROUP_ITEM}]`)].filter(
				(el) => el.closest('.astryx-input-group') === root && !el.closest('[popover], dialog, template')
			);
			items.forEach((el, i) => {
				el.toggleAttribute('data-group-first', i === 0);
				el.toggleAttribute('data-group-last', i === items.length - 1);
			});
		};
		sync();
		const observer = new MutationObserver(sync);
		observer.observe(root, { childList: true, subtree: true });
		return () => observer.disconnect();
	});
</script>

<Field
	{label}
	{isLabelHidden}
	{description}
	{inputID}
	{labelID}
	descriptionID={description ? descriptionID : undefined}
	isGroupLabel
	{isOptional}
	{isRequired}
	{isDisabled}
	status={status
		? { type: status.type, message: status.message, messageID: status.message ? statusMessageID : undefined }
		: undefined}
	statusVariant="detached"
	{labelTooltip}
>
	<div
		{...rest}
		bind:this={group}
		id={inputID}
		role="group"
		class={['astryx-input-group', 'group', className]}
		class:disabled={isDisabled}
		data-size={size}
		data-status={status?.type}
		aria-disabled={isDisabled || undefined}
		aria-labelledby={labelID}
		aria-describedby={describedByIDs}
	>
		{@render children()}
	</div>
</Field>

<style>
	@layer astryx-base {
		.group {
			display: inline-flex;
			align-items: stretch;
			background-color: transparent;
		}
		.group[data-size='sm'] { height: var(--size-element-sm); }
		.group[data-size='md'] { height: var(--size-element-md); }
		.group[data-size='lg'] { height: var(--size-element-lg); }
		.disabled { cursor: default; opacity: 0.5; }

		/* Joined members: overlap borders and square the inner corners. */
		.group.group :global([data-astryx-input-group-item]) {
			height: 100%;
			margin-inline-start: calc(-1 * var(--border-width));
			border-radius: 0;
		}
		.group.group :global([data-astryx-input-group-item][data-group-first]) {
			margin-inline-start: 0;
			border-start-start-radius: var(--radius-element);
			border-end-start-radius: var(--radius-element);
		}
		.group.group :global([data-astryx-input-group-item][data-group-last]) {
			border-start-end-radius: var(--radius-element);
			border-end-end-radius: var(--radius-element);
		}
		.group.group :global(button[data-astryx-input-group-item]),
		.group.group :global(a[data-astryx-input-group-item]) {
			margin-inline-start: 0;
		}
		.group.group :global([data-astryx-input-group-item]:focus-visible),
		.group.group :global([data-astryx-input-group-item]:focus-within) {
			z-index: 2;
		}
	}
</style>
