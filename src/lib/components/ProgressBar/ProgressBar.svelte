<!--
  Port of Astryx `ProgressBar` (packages/core/src/ProgressBar/ProgressBar.tsx), MIT, Meta Platforms, Inc.
  Marks are focusable ticks with a tooltip. Not yet ported: the coarse-pointer minimum-fill and
  touch-tuned motion (ProgressBarTouch).
-->
<script lang="ts" module>
	export type ProgressBarVariant = 'accent' | 'success' | 'warning' | 'error' | 'neutral';
	export interface ProgressBarMark {
		value: number;
		label: string;
	}
	function defaultFormat(value: number, max: number): string {
		return `${max > 0 ? Math.round((value / max) * 100) : 0}%`;
	}
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import Tooltip from '../Tooltip/Tooltip.svelte';
	import VisuallyHidden from '../VisuallyHidden/VisuallyHidden.svelte';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		value?: number;
		max?: number;
		label: string;
		isLabelHidden?: boolean;
		hasValueLabel?: boolean;
		formatValueLabel?: (value: number, max: number) => string;
		variant?: ProgressBarVariant;
		isIndeterminate?: boolean;
		marks?: ReadonlyArray<ProgressBarMark>;
		isDisabled?: boolean;
	}

	let {
		value = 0,
		max = 100,
		label,
		isLabelHidden = false,
		hasValueLabel = false,
		formatValueLabel = defaultFormat,
		variant = 'accent',
		isIndeterminate = false,
		marks,
		isDisabled = false,
		class: className,
		...rest
	}: Props = $props();

	const labelId = $props.id();
	const safeMax = $derived(Number.isFinite(max) ? max : 0);
	const clamped = $derived(Math.min(Math.max(0, Number.isFinite(value) ? value : 0), safeMax));
	const pct = $derived(safeMax > 0 ? (clamped / safeMax) * 100 : 0);
	const valueText = $derived(formatValueLabel(clamped, safeMax));
	const showValueLabel = $derived(hasValueLabel && !isIndeterminate);
	const fillVariant = $derived(isDisabled ? 'disabled' : variant);
	const resolvedMarks = $derived(
		!isIndeterminate && marks
			? marks
					.filter((m) => Number.isFinite(m.value))
					.map((m) => {
						const markPct = safeMax > 0 ? (Math.min(Math.max(0, m.value), safeMax) / safeMax) * 100 : 0;
						return { ...m, pct: markPct, isOnFill: pct > 0 && markPct <= pct };
					})
			: []
	);
</script>

<div {...rest} class={['astryx-progress-bar', 'container', className]} data-variant={variant}>
	{#if !isLabelHidden || showValueLabel}
		<div class="header">
			<span id={labelId} class="label" class:visually-hidden={isLabelHidden} class:disabled={isDisabled}>{label}</span>
			{#if showValueLabel}<span class="value" class:disabled={isDisabled}>{valueText}</span>{/if}
		</div>
	{:else}
		<VisuallyHidden id={labelId}>{label}</VisuallyHidden>
	{/if}
	<div class="track-container">
		<div
			role="progressbar"
			aria-valuenow={isIndeterminate ? undefined : clamped}
			aria-valuemin={isIndeterminate ? undefined : 0}
			aria-valuemax={isIndeterminate ? undefined : safeMax}
			aria-valuetext={isIndeterminate ? undefined : valueText}
			aria-labelledby={labelId}
			class="astryx-progress-bar-track track"
			class:disabled={isDisabled}
		>
			{#if isIndeterminate}
				<div class="astryx-progress-bar-fill fill indeterminate" data-variant={fillVariant}></div>
			{:else}
				<div
					class="astryx-progress-bar-fill fill determinate"
					class:empty={pct === 0}
					data-variant={fillVariant}
					style="--_progress-bar-fill: {pct}%"
				></div>
			{/if}
		</div>
		{#each resolvedMarks as mark (`${mark.value}:${mark.label}`)}
			<Tooltip content={mark.label} placement="above" focusTrigger="always">
				<!-- Marks are focus stops so keyboard users can reach their tooltip, as in Astryx. -->
				<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
				<span
					role="img"
					aria-label={mark.label}
					tabindex="0"
					class="astryx-progress-bar-mark mark"
					data-variant={fillVariant}
					data-placement={mark.isOnFill ? 'fill' : 'track'}
					style="inset-inline-start: {mark.pct}%"
				></span>
			</Tooltip>
		{/each}
	</div>
</div>

<style>
	@layer astryx-base {
		.container { display: flex; flex-direction: column; gap: var(--spacing-1); width: 100%; min-width: 48px; }
		.header { display: flex; justify-content: space-between; align-items: baseline; }
		.label {
			font-size: var(--text-body-size);
			line-height: var(--text-body-leading);
			font-weight: var(--font-weight-medium);
			color: var(--color-text-primary);
		}
		.value {
			font-size: var(--text-body-size);
			line-height: var(--text-body-leading);
			font-weight: var(--font-weight-normal);
			color: var(--color-text-secondary);
		}
		.label.disabled, .value.disabled { color: var(--color-text-disabled); }
		.visually-hidden {
			position: absolute;
			width: 1px;
			height: 1px;
			padding: 0;
			margin: -1px;
			overflow: hidden;
			clip: rect(0, 0, 0, 0);
			white-space: nowrap;
			border-width: 0;
		}
		.track-container { position: relative; width: 100%; }
		.track {
			width: 100%;
			height: 8px;
			background-color: var(--color-background-muted);
			border-radius: var(--radius-full);
			overflow: hidden;
		}
		.track.disabled { opacity: 0.5; }

		.fill { height: 100%; border-radius: var(--radius-full); }
		.determinate {
			width: 100%;
			transform: translateX(calc(var(--_progress-bar-fill, 0%) - 100%));
			will-change: transform;
			transition: transform var(--duration-medium) var(--ease-standard);
		}
		.determinate:dir(rtl) { transform: translateX(calc(100% - var(--_progress-bar-fill, 0%))); }
		.indeterminate {
			width: 40%;
			animation: astryx-progress-slide 1.5s ease-in-out infinite;
		}
		:global([dir='rtl']) .indeterminate { animation-name: astryx-progress-slide-rtl; }
		@media (prefers-reduced-motion: reduce) {
			.determinate { transition-duration: 0s; }
			.indeterminate,
			:global([dir='rtl']) .indeterminate {
				width: 100%;
				animation: astryx-progress-pulse 2000ms var(--ease-standard) infinite alternate;
			}
		}
		@media (forced-colors: active) {
			.fill { outline: 1px solid CanvasText; outline-offset: -1px; }
			.fill[data-variant='disabled'] { outline-color: GrayText; }
			.determinate,
			.determinate:dir(rtl) {
				width: var(--_progress-bar-fill, 0%);
				transform: none;
				will-change: auto;
				transition-property: width;
			}
		}

		.fill[data-variant='accent'] { background-color: var(--color-accent); }
		.fill[data-variant='success'] { background-color: var(--color-text-success); }
		.fill[data-variant='warning'] { background-color: var(--color-text-warning); }
		.fill[data-variant='error'] { background-color: var(--color-text-error); }
		.fill:is([data-variant='neutral'], [data-variant='disabled']) { background-color: var(--color-text-secondary); }

		.mark {
			position: absolute;
			top: 50%;
			width: var(--_progressbar-mark-width, 2px);
			height: var(--_progressbar-mark-height, 8px);
			transform: translate(-50%, -50%);
			background-color: var(--color-text-primary);
		}
		:global([dir='rtl']) .mark { transform: translate(50%, -50%); }
		.mark:focus-visible {
			outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color);
			outline-offset: 2px;
		}
		.mark[data-placement='track'][data-variant='disabled'] { background-color: var(--color-text-secondary); }
		.mark[data-placement='fill'] { background-color: var(--color-background-surface); }
		.mark[data-placement='fill'][data-variant='accent'] { background-color: var(--color-on-accent); }
	}
	@keyframes astryx-progress-slide {
		0% { transform: translateX(-100%); }
		100% { transform: translateX(250%); }
	}
	@keyframes astryx-progress-slide-rtl {
		0% { transform: translateX(100%); }
		100% { transform: translateX(-250%); }
	}
	@keyframes astryx-progress-pulse {
		from { opacity: 1; }
		to { opacity: 0.84; }
	}
</style>
