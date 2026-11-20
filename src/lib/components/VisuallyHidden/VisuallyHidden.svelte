<!-- Port of Astryx `VisuallyHidden`: content for assistive tech only. MIT, Meta Platforms, Inc. -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLElement> {
		as?: string;
		children?: Snippet;
	}
	let { as = 'span', class: className, children, ...rest }: Props = $props();
</script>

<svelte:element this={as} class={['astryx-visually-hidden', 'vh', className]} {...rest}>
	{@render children?.()}
</svelte:element>

<style>
	@layer astryx-base {
		.vh {
			position: absolute;
			width: 1px;
			height: 1px;
			padding: 0;
			margin: -1px;
			overflow: hidden;
			clip-path: inset(50%);
			white-space: nowrap;
			border: 0;
		}
	}
</style>
