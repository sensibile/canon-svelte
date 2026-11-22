<!--
  Port of Astryx `DrawerHeader` (packages/core/src/Drawer/DrawerHeader.tsx), MIT, Meta Platforms, Inc.
  A Drawer's title row: a level-2 title, optional subtitle, start and end content, and a close
  button when `onOpenChange` is passed. `endContentEdgeCompensation` pulls the end content out by
  the ghost button's padding (by default on both axes when there is a close button).
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import Heading from '../Heading/Heading.svelte';
	import Text from '../Text/Text.svelte';
	import Button from '../Button/Button.svelte';
	import Divider from '../Divider/Divider.svelte';

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
		title: string | Snippet;
		subtitle?: string | Snippet;
		/** Shows a close button that calls this with false. */
		onOpenChange?: (open: boolean) => void;
		startContent?: Snippet;
		endContent?: Snippet;
		/** Pull the end content out by a ghost button's padding; defaults to "all" with a close button. */
		endContentEdgeCompensation?: 'inline' | 'block' | 'all';
		hasDivider?: boolean;
		closeLabel?: string;
	}

	let {
		title,
		subtitle,
		onOpenChange,
		startContent,
		endContent,
		endContentEdgeCompensation,
		hasDivider = false,
		closeLabel = 'Close',
		class: className,
		...rest
	}: Props = $props();

	const hasEnd = $derived(endContent != null || onOpenChange != null);
	const compensateBlock = $derived(
		endContentEdgeCompensation == null ? onOpenChange != null : endContentEdgeCompensation !== 'inline'
	);
	const compensateInline = $derived(
		endContentEdgeCompensation == null ? onOpenChange != null : endContentEdgeCompensation !== 'block'
	);
</script>

<div {...rest} class={['astryx-drawer-header', 'header', className]}>
	<div class="row" class:compensate-block={compensateBlock && hasEnd}>
		{#if startContent}<div class="actions">{@render startContent()}</div>{/if}
		<div class="title-block">
			<Heading level={2}>
				{#if typeof title === 'function'}{@render title()}{:else}{title}{/if}
			</Heading>
			{#if subtitle}
				<Text type="body" size="sm" color="secondary">
					{#if typeof subtitle === 'function'}{@render subtitle()}{:else}{subtitle}{/if}
				</Text>
			{/if}
		</div>
		{#if hasEnd}
			<div class="actions end" class:compensate-block={compensateBlock} class:compensate-inline={compensateInline}>
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
		.compensate-block { --_end-offset: calc(-1 * var(--spacing-2)); }
		.title-block {
			display: flex;
			flex-direction: column;
			flex: 1;
			min-width: 0;
			margin-block: calc(var(--_title-offset) - var(--_row-offset));
		}
		.actions { display: flex; align-items: center; gap: var(--spacing-2); flex-shrink: 0; }
		.end { margin-block: calc(var(--_end-offset) - var(--_row-offset)); }
		.end.compensate-inline { margin-inline-end: calc(-1 * var(--spacing-2)); }
	}
</style>
