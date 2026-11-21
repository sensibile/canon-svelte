<!--
  Port of Astryx `Skeleton` (packages/core/src/Skeleton/Skeleton.tsx), MIT, Meta Platforms, Inc.
  A loading placeholder. `index` staggers the fade-in start for lists of skeletons.
-->
<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cssSize, type SizeValue } from '../../types.js';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		width?: SizeValue;
		height?: SizeValue;
		radius?: 'none' | 0 | 1 | 2 | 3 | 4 | 'rounded';
		index?: number;
	}

	let { width = '100%', height = '100%', radius = 3, index = 0, class: className, style, ...rest }: Props = $props();

	const DELAY_TIME = 1000;
	const STAGGER_TIME = 100;
</script>

<div
	{...rest}
	aria-hidden="true"
	class={['astryx-skeleton', 'skeleton', className]}
	data-radius={radius}
	style={[
		`width: ${cssSize(width)}`,
		`height: ${cssSize(height)}`,
		`animation-delay: ${DELAY_TIME + STAGGER_TIME * index}ms`,
		style
	]
		.filter(Boolean)
		.join('; ')}
></div>

<style>
	@layer astryx-base {
		.skeleton {
			background-color: var(--color-skeleton);
			opacity: 0.25;
			animation: astryx-skeleton-fade var(--_astryx-pre-tempo-duration-medium-max, var(--duration-medium-max)) linear
				infinite alternate;
			animation-fill-mode: backwards;
		}
		@media (prefers-contrast: more) {
			.skeleton { background-color: color-mix(in srgb, var(--color-skeleton), var(--color-text-primary) 30%); }
		}
		@media (forced-colors: active) {
			.skeleton { background-color: GrayText; opacity: 1; }
		}
		@media (prefers-reduced-motion: reduce) {
			.skeleton { animation: none; }
		}
		.skeleton[data-radius='none'] { border-radius: 0; }
		.skeleton[data-radius='0'] { border-radius: var(--radius-none); }
		.skeleton[data-radius='1'] { border-radius: var(--radius-inner); }
		.skeleton[data-radius='2'] { border-radius: var(--radius-element); }
		.skeleton:is([data-radius='3'], [data-radius='4']) { border-radius: var(--radius-container); }
		.skeleton[data-radius='rounded'] { border-radius: var(--radius-full); }
	}
	/* Stepped fade, as in Astryx. */
	@keyframes astryx-skeleton-fade {
		0%, 9.99% { opacity: 0.25; }
		10%, 19.99% { opacity: 0.325; }
		20%, 29.99% { opacity: 0.4; }
		30%, 39.99% { opacity: 0.475; }
		40%, 49.99% { opacity: 0.55; }
		50%, 59.99% { opacity: 0.625; }
		60%, 69.99% { opacity: 0.7; }
		70%, 79.99% { opacity: 0.775; }
		80%, 89.99% { opacity: 0.85; }
		90%, 100% { opacity: 0.925; }
	}
</style>
