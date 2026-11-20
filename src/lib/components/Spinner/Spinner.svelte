<!--
  Port of Astryx `Spinner` (packages/core/src/Spinner/Spinner.tsx), MIT, Meta Platforms, Inc.
  Not yet ported: theme-provided spinner indicators and live-region announcements.
-->
<script lang="ts" module>
	export type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl';
	export type SpinnerShade = 'default' | 'onMedia' | 'subtle' | 'inherit';

	const ARC_FRACTION = 0.375;
	const SIZES: Record<SpinnerSize, { diameter: number; border: number }> = {
		sm: { diameter: 10, border: 2 },
		md: { diameter: 14, border: 3 },
		lg: { diameter: 18, border: 3 },
		xl: { diameter: 28, border: 4 }
	};

	// Every spinner on the page turns in phase: pin new rotors' animations to the timeline origin.
	const pending = new Set<Element>();
	let scheduled = false;
	function syncRotationPhase(node: Element) {
		if (typeof node.getAnimations !== 'function') return;
		pending.add(node);
		if (!scheduled) {
			scheduled = true;
			requestAnimationFrame(() => {
				scheduled = false;
				for (const el of pending) for (const a of el.getAnimations()) a.startTime = 0;
				pending.clear();
			});
		}
		return () => pending.delete(node);
	}
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import Text from '../Text/Text.svelte';

	interface Props extends HTMLAttributes<HTMLElement> {
		size?: SpinnerSize;
		shade?: SpinnerShade;
		/** Visible text under the spinner; also names it for assistive tech. */
		label?: string;
	}

	let {
		size = 'md',
		shade = 'default',
		label,
		class: className,
		'aria-label': ariaLabel,
		...rest
	}: Props = $props();

	const labelId = $props.id();
	const geom = $derived(SIZES[size]);
	const frame = $derived(geom.diameter + geom.border * 2);
	const circumference = $derived(Math.PI * geom.diameter);
	const arc = $derived(circumference * ARC_FRACTION);
	const namedByLabel = $derived(label != null && ariaLabel == null);
</script>

{#snippet ring()}
	<span
		role="progressbar"
		aria-label={namedByLabel ? undefined : (ariaLabel ?? 'Loading')}
		aria-labelledby={namedByLabel ? labelId : undefined}
		class="spinner"
		style:width="{frame}px"
		style:height="{frame}px"
	>
		<svg width={frame} height={frame} aria-hidden="true" class="ring">
			<circle class="circle track" cx="50%" cy="50%" r={geom.diameter / 2} stroke-width={geom.border} />
		</svg>
		<span class="rotor" aria-hidden="true" {@attach syncRotationPhase}>
			<svg width={frame} height={frame} class="ring">
				<circle
					class="circle arc"
					cx="50%"
					cy="50%"
					r={geom.diameter / 2}
					stroke-width={geom.border}
					stroke-dasharray="{arc} {circumference - arc}"
				/>
			</svg>
		</span>
	</span>
{/snippet}

{#if label == null}
	<span
		{...rest}
		class={['astryx-spinner', 'root', className]}
		data-size={size}
		data-shade={shade}
	>
		{@render ring()}
	</span>
{:else}
	<div
		{...rest}
		class={['astryx-spinner', 'root', 'wrapper', className]}
		data-size={size}
		data-shade={shade}
	>
		{@render ring()}
		<Text id={labelId} type="body" weight="bold">{label}</Text>
	</div>
{/if}

<style>
	@layer astryx-base {
		.root { display: inline-flex; vertical-align: middle; }
		.wrapper { flex-direction: column; align-items: center; gap: var(--spacing-2); }
		.root[data-shade='default'] { --spinner-color: var(--color-accent); --spinner-track-color: var(--color-track); --_track-opacity: 1; }
		.root[data-shade='subtle'] { --spinner-color: var(--color-text-secondary); --spinner-track-color: var(--color-track); --_track-opacity: 1; }
		.root[data-shade='onMedia'] { --spinner-color: var(--color-on-dark); --spinner-track-color: var(--color-on-dark); --_track-opacity: 0.302; }
		.root[data-shade='inherit'] { --spinner-color: currentColor; --spinner-track-color: currentColor; --_track-opacity: 0.3; }

		.spinner { display: inline-grid; place-items: center; flex-shrink: 0; }
		.ring { display: block; grid-area: 1 / 1; overflow: visible; backface-visibility: hidden; }
		.rotor {
			display: block;
			grid-area: 1 / 1;
			will-change: transform;
			animation: astryx-spin calc(var(--_astryx-pre-tempo-duration-slow-min, var(--duration-slow-min)) * 100) linear infinite;
		}
		.circle { fill: none; transform-box: fill-box; transform-origin: center; stroke-linecap: round; }
		.track { stroke: var(--spinner-track-color); stroke-opacity: var(--_track-opacity); }
		.arc { stroke: var(--spinner-color); transform: rotate(-90deg); }

		@media (prefers-reduced-motion: reduce) {
			.rotor { animation-duration: 300s; }
		}
	}

	@keyframes astryx-spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(36000deg); }
	}
</style>
