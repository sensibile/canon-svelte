<!--
  Port of Astryx `InputGroupText` (packages/core/src/InputGroup/InputGroupText.tsx), MIT, Meta Platforms, Inc.
  A static add-on inside an `InputGroup`, such as a unit or a URL prefix.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	let { children, class: className, ...rest }: HTMLAttributes<HTMLDivElement> & { children: Snippet } = $props();
</script>

<div {...rest} data-astryx-input-group-item="" class={['astryx-input-group-text', 'text', className]}>
	<span dir="auto">{@render children()}</span>
</div>

<style>
	@layer astryx-base {
		.text {
			box-sizing: border-box;
			display: flex;
			align-items: center;
			padding-inline: var(--spacing-2);
			background-color: var(--color-background-muted);
			font-family: var(--font-family-body);
			font-size: var(--text-body-size);
			line-height: var(--text-body-leading);
			color: var(--color-text-secondary);
			white-space: nowrap;
			unicode-bidi: isolate;
			flex-shrink: 0;
			border: var(--border-width) solid var(--color-border-emphasized);
			border-radius: var(--radius-element);
		}
	}
</style>
