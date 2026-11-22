<!--
  Port of Astryx `AlertDialog` (packages/core/src/AlertDialog/AlertDialog.tsx), MIT, Meta Platforms, Inc.
  A modal confirmation: a title, a description, a Cancel button (focused on open) and one action.
  It is an `alertdialog` labelled by its title and described by its description, and closes on
  Escape or Cancel but not on a backdrop press. On small screens (640px or less) the buttons stack,
  action first.
  Not yet ported: `isInline`, the touch alert motion and press tracking, the phone-width default on
  touch, and `useImperativeAlertDialog`.
-->
<script lang="ts">
	import type { HTMLDialogAttributes } from 'svelte/elements';
	import Dialog from '../Dialog/Dialog.svelte';
	import Heading from '../Heading/Heading.svelte';
	import Button from '../Button/Button.svelte';
	import type { ButtonVariant } from '../Button/Button.svelte';
	import type { SizeValue } from '../../types.js';

	interface Props extends Omit<HTMLDialogAttributes, 'open' | 'title'> {
		isOpen: boolean;
		onOpenChange: (isOpen: boolean) => void;
		title: string;
		description: string;
		/** Defaults to "Cancel". */
		cancelLabel?: string;
		actionLabel: string;
		actionVariant?: ButtonVariant;
		isActionLoading?: boolean;
		onAction: () => void;
		width?: SizeValue;
	}

	let {
		isOpen,
		onOpenChange,
		title,
		description,
		cancelLabel = 'Cancel',
		actionLabel,
		actionVariant = 'destructive',
		isActionLoading,
		onAction,
		width = 400,
		class: className,
		...rest
	}: Props = $props();

	const uid = $props.id();
	const titleId = `${uid}-title`;
	const descriptionId = `${uid}-description`;

	let isSmallScreen = $state(false);
	$effect(() => {
		const query = window.matchMedia('(max-width: 640px)');
		isSmallScreen = query.matches;
		const onChange = () => (isSmallScreen = query.matches);
		query.addEventListener('change', onChange);
		return () => query.removeEventListener('change', onChange);
	});
</script>

{#snippet cancel()}
	<Button variant="ghost" label={cancelLabel} onclick={() => onOpenChange(false)} class="action" data-autofocus />
{/snippet}
{#snippet action()}
	<Button variant={actionVariant} label={actionLabel} onclick={onAction} isLoading={isActionLoading} class="action" />
{/snippet}

<Dialog
	{...rest}
	{isOpen}
	{onOpenChange}
	{width}
	purpose="form"
	role="alertdialog"
	aria-labelledby={titleId}
	aria-describedby={descriptionId}
	class={['astryx-alert-dialog', className]}
>
	<div class="content">
		<Heading level={2} id={titleId} color="primary" display="block" class="astryx-alert-dialog-title">{title}</Heading>
		<span id={descriptionId} class="astryx-alert-dialog-description description">{description}</span>
	</div>
	<div class="actions" class:stacked={isSmallScreen}>
		{#if isSmallScreen}
			{@render action()}{@render cancel()}
		{:else}
			{@render cancel()}{@render action()}
		{/if}
	</div>
</Dialog>

<style>
	@layer astryx-base {
		.content {
			display: flex;
			flex-direction: column;
			gap: var(--spacing-2);
		}
		.description {
			display: inline;
			color: var(--color-text-secondary);
			font-size: var(--text-body-size);
			line-height: var(--text-body-leading);
			font-weight: var(--font-weight-normal);
		}
		.actions {
			display: flex;
			flex-wrap: wrap;
			justify-content: flex-end;
			gap: var(--spacing-2);
		}
		.actions.stacked {
			flex-direction: column;
			flex-wrap: nowrap;
			align-items: stretch;
		}
		.actions :global(.action) { max-width: 100%; min-width: 0; }
		.actions.stacked :global(.action) { width: 100%; }
	}
</style>
