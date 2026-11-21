<!--
  Port of Astryx `AspectRatio` (packages/core/src/AspectRatio/AspectRatio.tsx), MIT, Meta Platforms, Inc.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		/** Width divided by height, e.g. 16 / 9. */
		ratio: number;
		shape?: 'rectangle' | 'ellipse';
		/** How an img/video child fills the box; "center" centers any child. */
		fit?: 'cover' | 'contain' | 'center';
		children: Snippet;
	}

	let { ratio, shape = 'rectangle', fit, children, class: className, style, ...rest }: Props = $props();
</script>

<div
	{...rest}
	class={['astryx-aspect-ratio', 'aspect-ratio', className]}
	class:ellipse={shape === 'ellipse'}
	data-shape={shape}
	style={[`aspect-ratio: ${ratio}`, style].filter(Boolean).join('; ')}
>
	<div class="child" data-astryx-aspect-ratio-override={fit} data-fit={fit}>
		{@render children()}
	</div>
</div>

<style>
	@layer astryx-base {
		.aspect-ratio { position: relative; width: 100%; overflow: clip; min-height: 0; flex-shrink: 0; }
		.ellipse { border-radius: 50%; }
		.child { position: absolute; top: 0; inset-inline-start: 0; width: 100%; height: 100%; }
		.child[data-fit='center'] { display: flex; align-items: center; justify-content: center; }
		.child:is([data-fit='cover'], [data-fit='contain']) > :global(*) { width: 100%; height: 100%; }
		.child[data-fit='cover'] > :global(:is(img, video)) { object-fit: cover; }
		.child[data-fit='contain'] > :global(:is(img, video)) { object-fit: contain; }
	}
</style>
