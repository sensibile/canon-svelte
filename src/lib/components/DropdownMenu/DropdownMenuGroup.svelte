<!-- Port of Astryx `DropdownMenuGroup` (packages/core/src/DropdownMenu), MIT, Meta Platforms, Inc. -->
<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		title?: string;
		children: Snippet;
	}
	let { title, children }: Props = $props();
	const uid = $props.id();
</script>

<div class="astryx-dropdown-menu-group group" role="group" aria-labelledby={title ? `${uid}-title` : undefined}>
	{#if title}<div class="title" id="{uid}-title">{title}</div>{/if}
	{@render children()}
</div>

<style>
	@layer astryx-base {
		.group { display: flex; flex-direction: column; gap: var(--spacing-0-5); }
		.title {
			padding-block: var(--spacing-1);
			padding-inline: var(--spacing-2);
			font-size: var(--text-supporting-size);
			line-height: var(--text-supporting-leading);
			font-weight: var(--font-weight-medium);
			color: var(--color-text-secondary);
		}
	}
</style>
