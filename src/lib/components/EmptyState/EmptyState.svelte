<!--
  Port of Astryx `EmptyState` (packages/core/src/EmptyState/EmptyState.tsx), MIT, Meta Platforms, Inc.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
		title: string;
		description?: string;
		icon?: Snippet;
		actions?: Snippet;
		headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
		isCompact?: boolean;
	}

	let {
		title,
		description,
		icon,
		actions,
		headingLevel = 3,
		isCompact = false,
		class: className,
		...rest
	}: Props = $props();

	const variant = $derived(isCompact ? 'compact' : undefined);
</script>

<div {...rest} class={['astryx-empty-state', 'empty-state', className]} class:compact={isCompact} data-variant={variant}>
	{#if icon}<div aria-hidden="true">{@render icon()}</div>{/if}
	<!-- Changes to the title/description are announced politely, like Astryx AnnounceRenderedText. -->
	<div class="text" aria-live="polite">
		<svelte:element this={`h${headingLevel}`} class="astryx-empty-state-title title" data-variant={variant}>
			{title}
		</svelte:element>
		{#if description}
			<div class="astryx-empty-state-description description" data-variant={variant}>{description}</div>
		{/if}
	</div>
	{#if actions}<div class="actions">{@render actions()}</div>{/if}
</div>

<style>
	@layer astryx-base {
		.empty-state {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			text-align: center;
			gap: var(--spacing-4);
			padding-block: var(--spacing-8);
			padding-inline: var(--spacing-6);
		}
		.compact { gap: var(--spacing-2); padding-block: var(--spacing-4); padding-inline: var(--spacing-4); }
		.text { display: flex; flex-direction: column; align-items: center; max-width: 360px; }
		.title {
			margin: 0;
			font-family: inherit;
			font-size: var(--text-large-size);
			font-weight: var(--font-weight-semibold);
			line-height: var(--text-large-leading);
			color: var(--color-text-primary);
		}
		.compact .title { font-size: var(--text-label-size); line-height: var(--text-label-leading); }
		.description {
			margin: 0;
			font-family: inherit;
			font-size: var(--text-body-size);
			font-weight: var(--font-weight-normal);
			line-height: var(--text-body-leading);
			color: var(--color-text-secondary);
		}
		.compact .description { font-size: var(--text-supporting-size); line-height: var(--text-supporting-leading); }
		.actions { display: flex; flex-direction: row; align-items: center; gap: var(--spacing-2); margin-top: var(--spacing-1); }
		.compact .actions { flex-direction: column; }
	}
</style>
