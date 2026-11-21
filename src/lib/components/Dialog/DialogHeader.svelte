<!--
  Port of Astryx `DialogHeader` (packages/core/src/Dialog/DialogHeader.tsx), MIT, Meta Platforms, Inc.
  Title (names the dialog and takes focus on open), optional subtitle, and a close button when
  `onOpenChange` is passed.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import Heading from '../Heading/Heading.svelte';
	import Text from '../Text/Text.svelte';
	import Button from '../Button/Button.svelte';
	import Divider from '../Divider/Divider.svelte';
	import { getDialogContext } from './context.js';

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
		title: string | Snippet;
		subtitle?: string | Snippet;
		/** Shows a close button that calls this with false. */
		onOpenChange?: (open: boolean) => void;
		startContent?: Snippet;
		endContent?: Snippet;
		hasDivider?: boolean;
		closeLabel?: string;
	}

	let {
		title,
		subtitle,
		onOpenChange,
		startContent,
		endContent,
		hasDivider = false,
		closeLabel = 'Close',
		class: className,
		...rest
	}: Props = $props();

	const ctx = getDialogContext();
	const hasEnd = $derived(endContent != null || onOpenChange != null);
</script>

<div {...rest} class={['astryx-dialog-header', 'header', className]}>
	<div class="row" class:compensate={onOpenChange != null}>
		{#if startContent}<div class="actions">{@render startContent()}</div>{/if}
		<div class="title-block">
			<Heading level={2} id={ctx?.titleId} tabindex={-1} data-autofocus={ctx ? 'dialog-title' : undefined} class="dialog-title">
				{#if typeof title === 'function'}{@render title()}{:else}{title}{/if}
			</Heading>
			{#if subtitle}
				<Text type="body" size="sm" color="secondary">
					{#if typeof subtitle === 'function'}{@render subtitle()}{:else}{subtitle}{/if}
				</Text>
			{/if}
		</div>
		{#if hasEnd}
			<div class="actions end">
				{@render endContent?.()}
				{#if onOpenChange}
					<Button variant="ghost" label={closeLabel} tooltip={closeLabel} icon="close" isIconOnly onclick={() => onOpenChange?.(false)} />
				{/if}
			</div>
		{/if}
	</div>
	{#if hasDivider}<Divider />{/if}
</div>

<style>
	@layer astryx-base {
		.header { display: flex; flex-direction: column; gap: var(--spacing-3); }
		.row {
			--_title-offset: calc(var(--size-element-md) / 2 - var(--spacing-2) - var(--text-heading-2-size) * var(--text-heading-2-leading) / 2);
			--_end-offset: 0px;
			--_row-offset: min(var(--_title-offset), var(--_end-offset), 0px);
			display: flex;
			align-items: flex-start;
			justify-content: space-between;
			gap: var(--spacing-3);
			margin-block: var(--_row-offset);
		}
		.row.compensate { --_end-offset: calc(-1 * var(--spacing-2)); }
		.title-block {
			display: flex;
			flex-direction: column;
			flex: 1;
			min-width: 0;
			margin-block: calc(var(--_title-offset) - var(--_row-offset));
		}
		.title-block :global(.dialog-title) { outline: none; }
		.actions { display: flex; align-items: center; gap: var(--spacing-2); flex-shrink: 0; }
		.end { margin-block: calc(var(--_end-offset) - var(--_row-offset)); }
		.compensate .end { margin-inline-end: calc(-1 * var(--spacing-2)); }
	}
</style>
