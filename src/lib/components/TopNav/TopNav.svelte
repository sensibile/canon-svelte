<!--
  Port of Astryx `TopNav` (packages/core/src/TopNav/TopNav.tsx), MIT, Meta Platforms, Inc.
  A horizontal navigation bar: `heading` and `startContent` (or children) on the start side, an
  optional `centerContent` region, and `endContent` on the end side. Items wrap when space runs out.
  Children learn their region through `getTopNavSlot()` (menus open toward the bar's inside edge).
  Port change: `heading` takes a string or a snippet.
  Not yet ported: AppShell render modes (mobile bar and drawer), the unread-region style hook.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import TopNavSlot from './TopNavSlot.svelte';

	interface Props extends Omit<HTMLAttributes<HTMLElement>, 'children'> {
		heading?: string | Snippet;
		startContent?: Snippet;
		children?: Snippet;
		centerContent?: Snippet;
		endContent?: Snippet;
		/** Landmark label (default "Top navigation"). */
		label?: string;
	}

	let {
		heading,
		startContent,
		children,
		centerContent,
		endContent,
		label = 'Top navigation',
		class: className,
		...rest
	}: Props = $props();

	const start = $derived(startContent ?? children);
	const hasCenter = $derived(centerContent != null);
</script>

<nav {...rest} aria-label={label} class={['astryx-top-nav', 'root', className]}>
	<div class="left">
		{#if heading != null && heading !== ''}
			<div class="heading">
				{#if typeof heading === 'string'}{heading}{:else}{@render heading()}{/if}
			</div>
		{/if}
		{#if start}
			<div class="start"><TopNavSlot slot="start">{@render start()}</TopNavSlot></div>
		{/if}
	</div>
	{#if hasCenter}
		<div class="center"><TopNavSlot slot="center">{@render centerContent?.()}</TopNavSlot></div>
		<div class="right"><TopNavSlot slot="end">{@render endContent?.()}</TopNavSlot></div>
	{:else if endContent}
		<div class="end"><TopNavSlot slot="end">{@render endContent()}</TopNavSlot></div>
	{/if}
</nav>

<style>
	@layer astryx-base {
		.root {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			width: 100%;
			padding: var(--spacing-2);
			box-sizing: border-box;
		}
		.left {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: var(--spacing-4);
			flex: 1 1 0%;
			min-width: fit-content;
		}
		.heading { display: flex; align-items: center; flex-shrink: 1; }
		.start { display: flex; flex-wrap: wrap; align-items: center; gap: var(--spacing-1); }
		.center {
			display: flex;
			align-items: center;
			justify-content: center;
			gap: var(--spacing-1);
			flex: 1000 1 min-content;
			min-width: 0;
			max-width: max-content;
		}
		.right {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			justify-content: flex-end;
			gap: var(--spacing-1);
			flex: 1 1 0%;
			min-width: fit-content;
		}
		.end {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			justify-content: flex-end;
			gap: var(--spacing-1);
			flex-shrink: 0;
			margin-inline-start: auto;
			min-width: fit-content;
			max-width: 100%;
		}
	}
</style>
