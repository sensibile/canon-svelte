<!--
  Port of Astryx `Stepper` (packages/core/src/Stepper/Stepper.tsx), MIT, Meta Platforms, Inc.
  An ordered list of Step children showing progress through `activeStep` (zero-based). With
  `onStepClick` the steps are buttons (non-linear navigation). Indicators sit beside the labels
  ("separated") or on the connecting track ("on-track"). A horizontal stepper whose steps would be
  narrower than `horizontalOptions.minimumStepWidth` collapses to bars with a summary of the
  active step below, with previous/next controls when steps are clickable.
-->
<script lang="ts" module>
	export type StepperCollapsedVariant = 'withLabelAndControls' | 'withLabel' | 'hiddenLabel';
	export interface StepperHorizontalOptions {
		minimumStepWidth: number;
		collapsedVariant: StepperCollapsedVariant;
	}
</script>

<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import type { HTMLOlAttributes } from 'svelte/elements';
	import IconButton from '../IconButton/IconButton.svelte';
	import {
		setStepperContext,
		type StepperDensity,
		type StepperIndicatorPosition,
		type StepperOrientation,
		type StepperRegistrationOptions
	} from './context.js';

	interface Props extends HTMLOlAttributes {
		activeStep: number;
		children: Snippet;
		orientation?: StepperOrientation;
		onStepClick?: (index: number) => void;
		label?: string;
		density?: StepperDensity;
		indicatorPosition?: StepperIndicatorPosition;
		horizontalOptions?: Partial<StepperHorizontalOptions>;
	}

	let {
		activeStep,
		children,
		orientation = 'horizontal',
		onStepClick,
		label = 'Progress',
		density = 'balanced',
		indicatorPosition = 'separated',
		horizontalOptions,
		class: className,
		style,
		...rest
	}: Props = $props();

	const DEFAULT_MIN_STEP_WIDTH = 112;
	const minimumStepWidth = $derived(horizontalOptions?.minimumStepWidth ?? DEFAULT_MIN_STEP_WIDTH);
	const collapsedVariant = $derived(horizontalOptions?.collapsedVariant ?? 'withLabelAndControls');

	// Registered steps: how many Steps use each index, and whether each is disabled.
	const stepCounts = new Map<number, number>();
	const disabledGetters = new Map<number, Set<() => boolean>>();
	let stepCount = $state(0);
	let registrationRevision = $state(0);
	function registerStep(index: number, options?: StepperRegistrationOptions) {
		const prev = stepCounts.get(index) ?? 0;
		stepCounts.set(index, prev + 1);
		if (prev + 1 > 1) {
			console.warn(
				`[Stepper] Duplicate step index ${index}: two <Step> elements share the same \`step\` value. ` +
					'This breaks `aria-current="step"` and causes both to show as active simultaneously.'
			);
		}
		const getIsDisabled = options?.getIsDisabled;
		if (getIsDisabled) {
			const getters = disabledGetters.get(index) ?? new Set();
			getters.add(getIsDisabled);
			disabledGetters.set(index, getters);
		}
		stepCount += 1;
		registrationRevision += 1;
		return () => {
			const cur = stepCounts.get(index) ?? 1;
			if (cur <= 1) stepCounts.delete(index);
			else stepCounts.set(index, cur - 1);
			if (getIsDisabled) {
				const getters = disabledGetters.get(index);
				getters?.delete(getIsDisabled);
				if (getters?.size === 0) disabledGetters.delete(index);
			}
			stepCount -= 1;
			registrationRevision += 1;
		};
	}

	// The step active before the latest change, so a single advance can animate its connector.
	const initialStep = untrack(() => activeStep);
	let seen = { current: initialStep, previous: initialStep };
	const previousActiveStep = $derived.by(() => {
		const a = activeStep;
		if (a !== seen.current) seen = { current: a, previous: seen.current };
		return seen.previous;
	});

	const isHorizontal = $derived(orientation === 'horizontal');
	let rootWidth = $state(0);
	const isCompact = $derived(
		isHorizontal && rootWidth > 0 && stepCount > 0 && rootWidth / stepCount < minimumStepWidth
	);
	let summarySlot = $state<HTMLElement | null>(null);

	setStepperContext({
		get activeStep() {
			return activeStep;
		},
		get previousActiveStep() {
			return previousActiveStep;
		},
		get orientation() {
			return orientation;
		},
		get isNonLinear() {
			return onStepClick != null;
		},
		get onStepClick() {
			return onStepClick ?? null;
		},
		get density() {
			return density;
		},
		get indicatorPosition() {
			return indicatorPosition;
		},
		registerStep,
		get stepCount() {
			return stepCount;
		},
		get isCompact() {
			return isCompact;
		},
		get summarySlot() {
			return summarySlot;
		}
	});

	const showsControls = $derived(collapsedVariant === 'withLabelAndControls' && onStepClick != null);
	const showsSummary = $derived(isCompact && collapsedVariant !== 'hiddenLabel');

	/** The nearest enabled registered step before (-1) or after (1) the active step. */
	function adjacentEnabledStep(delta: -1 | 1): number | null {
		void registrationRevision;
		let target: number | null = null;
		for (const index of stepCounts.keys()) {
			if ([...(disabledGetters.get(index) ?? [])].some((getIsDisabled) => getIsDisabled())) continue;
			if (
				delta === -1
					? index < activeStep && (target == null || index > target)
					: index > activeStep && (target == null || index < target)
			) {
				target = index;
			}
		}
		return target;
	}
	function stepBy(delta: -1 | 1) {
		const target = adjacentEnabledStep(delta);
		if (target != null) onStepClick?.(target);
	}
</script>

{#snippet list()}
	{#if isHorizontal}
		<ol
			bind:clientWidth={rootWidth}
			aria-label={label}
			{...rest}
			class="astryx-stepper"
			data-orientation={orientation}
			data-indicator-position={indicatorPosition}
		>
			{@render children()}
		</ol>
	{:else}
		<ol
			aria-label={label}
			{...rest}
			class={['astryx-stepper', className].filter(Boolean).join(' ')}
			{style}
			data-orientation={orientation}
			data-indicator-position={indicatorPosition}
		>
			{@render children()}
		</ol>
	{/if}
{/snippet}

{#snippet control(delta: -1 | 1)}
	{#if showsControls && onStepClick != null}
		{@const name = delta === -1 ? 'Previous step' : 'Next step'}
		<IconButton
			variant="ghost"
			label={name}
			tooltip={name}
			icon={delta === -1 ? 'chevronLeft' : 'chevronRight'}
			class="stepper-control"
			isDisabled={adjacentEnabledStep(delta) == null}
			onclick={() => stepBy(delta)}
		/>
	{/if}
{/snippet}

{#if isHorizontal}
	<div class={['astryx-stepper-frame', className].filter(Boolean).join(' ')} {style}>
		{@render list()}
		{#if showsSummary}
			<div class="summary">
				{@render control(-1)}
				<div bind:this={summarySlot} class="summary-body" aria-hidden="true"></div>
				{@render control(1)}
			</div>
		{/if}
	</div>
{:else}
	{@render list()}
{/if}

<style>
	@layer astryx-base {
		.astryx-stepper {
			--step-connector-gap: inherit;
			display: flex;
			width: 100%;
			list-style-type: none;
			margin: 0;
			padding: 0;
			gap: var(--spacing-1);
		}
		.astryx-stepper[data-orientation='horizontal'] {
			flex-direction: row;
			align-items: flex-start;
		}
		.astryx-stepper[data-orientation='vertical'] { flex-direction: column; }
		.astryx-stepper[data-indicator-position='on-track'] { gap: 0; }
		.astryx-stepper-frame {
			--step-connector-gap: 0px;
			display: flex;
			flex-direction: column;
			gap: 0;
			width: 100%;
		}
		.summary {
			align-items: center;
			display: flex;
			gap: var(--spacing-2);
			justify-content: space-between;
			min-width: 0;
		}
		.summary-body {
			display: flex;
			flex-direction: column;
			flex-grow: 1;
			min-width: 0;
			text-align: center;
		}
		.summary :global(.stepper-control:dir(rtl) svg) { transform: scaleX(-1); }
	}
</style>
