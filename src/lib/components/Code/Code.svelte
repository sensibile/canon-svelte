<!--
  Port of Astryx `Code` (packages/core/src/Code/Code.tsx), MIT, Meta Platforms, Inc.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends Omit<HTMLAttributes<HTMLElement>, 'color'> {
		color?: 'primary' | 'secondary' | 'inherit';
		/** "inherit" takes the surrounding font size and line height. */
		size?: 'inherit';
		children: Snippet;
	}

	let { color = 'primary', size, children, class: className, ...rest }: Props = $props();
</script>

<code {...rest} dir="ltr" class={['astryx-code', 'code', className]} data-color={color} data-size={size}
	>{@render children()}</code
>

<style>
	@layer astryx-base {
		.code {
			font-family: var(--font-family-code);
			font-size: var(--text-code-size);
			line-height: inherit;
			background-color: var(--color-background-muted);
			padding-inline: var(--spacing-1);
			padding-block: var(--spacing-0);
			border-radius: var(--radius-inner);
			overflow-wrap: break-word;
			word-break: break-word;
		}
		.code[data-color='primary'] { color: var(--color-text-primary); }
		.code[data-color='secondary'] { color: var(--color-text-secondary); }
		.code[data-color='inherit'] { color: inherit; }
		.code[data-size='inherit'] { font-size: inherit; line-height: inherit; }
	}
</style>
