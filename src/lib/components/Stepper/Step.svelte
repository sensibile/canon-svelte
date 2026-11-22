<!--
  Port of Astryx `Step` (packages/core/src/Stepper/Step.tsx), MIT, Meta Platforms, Inc.
  One step of a Stepper, at zero-based index `step`. Its progress (completed, in progress, not
  started) comes from the Stepper's `activeStep`; `status` recolors it and shows a status glyph.
  The indicator is a number, a check or current-step glyph ("auto"), always a number, none, or a
  custom snippet. Connectors fill toward the active step; a single advance animates the fill.
  Children render below the label (hidden while the stepper is collapsed).
  Port change: `indicator` and `endContent` take snippets for custom content.
-->
<script lang="ts" module>
	export type StepIndicatorPreset = 'auto' | 'number' | 'none';
	export type StepDensity = 'compact' | 'balanced' | 'spacious';
</script>

<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import type { HTMLLiAttributes } from 'svelte/elements';
	import Icon from '../Icon/Icon.svelte';
	import VisuallyHidden from '../VisuallyHidden/VisuallyHidden.svelte';
	import { getStepperInternalContext, type StepStatus } from './context.js';

	interface Props extends HTMLLiAttributes {
		step: number;
		label: string;
		description?: string;
		children?: Snippet;
		status?: StepStatus;
		isDisabled?: boolean;
		isOptional?: boolean;
		endContent?: Snippet;
		indicator?: StepIndicatorPreset | Snippet;
		density?: StepDensity;
	}

	let {
		step,
		label,
		description,
		children,
		status,
		isDisabled = false,
		isOptional = false,
		endContent,
		indicator: indicatorProp,
		density: densityProp,
		class: className,
		...rest
	}: Props = $props();

	const ctx = getStepperInternalContext();
	const uid = $props.id();
	const descriptionID = `${uid}-description`;

	$effect(() => {
		const index = step;
		void isDisabled;
		return untrack(() => ctx.registerStep(index, { getIsDisabled: () => isDisabled }));
	});

	const FILL_SPAN_TIME = 'var(--duration-medium)';
	const OT_ARRIVAL_SHARE_H = 0.5;
	const OT_ARRIVAL_SHARE_V = 0.3;
	const OT_RAIL_SHARE_OF_LEAVING = 0.25;
	function fillTimeSlice(time: string, factor: number): string {
		if (factor <= 0) return '0s';
		if (factor === 1) return time;
		return `calc(${time} * ${Number(factor.toFixed(4))})`;
	}

	const density = $derived(densityProp ?? ctx.density);
	const customIndicator = $derived(typeof indicatorProp === 'function' ? (indicatorProp as Snippet) : null);
	const indicator = $derived<StepIndicatorPreset>(
		customIndicator ? 'auto' : ((indicatorProp as StepIndicatorPreset | undefined) ?? 'auto')
	);
	const progress = $derived<'completed' | 'in-progress' | 'not-started'>(
		step === ctx.activeStep ? 'in-progress' : step < ctx.activeStep ? 'completed' : 'not-started'
	);
	const isVertical = $derived(ctx.orientation === 'vertical');
	const isActive = $derived(progress === 'in-progress');
	const isCompact = $derived(ctx.isCompact);
	const isOnTrack = $derived(ctx.indicatorPosition === 'on-track');
	const hasButton = $derived(ctx.onStepClick != null && !isCompact);
	const isClickable = $derived(hasButton && !isDisabled);
	function handleClick() {
		if (isClickable) ctx.onStepClick?.(step);
	}

	// Connector timing: only the span the active step just advanced across animates.
	const isSingleAdvance = $derived(ctx.activeStep === ctx.previousActiveStep + 1);
	function fillTiming(spanIndex: number, offset: number, share: number): string {
		if (!isSingleAdvance || spanIndex !== ctx.previousActiveStep) return '--_fill-duration: 0s; --_fill-delay: 0s';
		return `--_fill-duration: ${fillTimeSlice(FILL_SPAN_TIME, share)}; --_fill-delay: ${fillTimeSlice(FILL_SPAN_TIME, offset)}`;
	}

	const statusGlyph = $derived<'success' | 'warning' | 'error' | null>(
		indicator === 'auto' &&
			customIndicator == null &&
			!isActive &&
			(status === 'success' || status === 'warning' || status === 'error')
			? status
			: null
	);
	const showNumber = $derived(
		customIndicator == null &&
			statusGlyph == null &&
			(indicator === 'number' || (indicator === 'auto' && progress === 'not-started'))
	);
	const isReached = $derived(progress === 'completed' || progress === 'in-progress');
	const numberTone = $derived(
		isDisabled
			? 'disabled'
			: isReached && status != null
				? status
				: progress === 'not-started'
					? 'not-started'
					: 'reached'
	);
	const iconTone = $derived(
		isDisabled
			? 'disabled'
			: customIndicator != null
				? (status ?? (progress === 'not-started' ? 'not-started' : 'reached'))
				: (statusGlyph ?? (progress === 'not-started' ? 'not-started' : 'reached'))
	);

	const statusText = $derived(
		status === 'error'
			? 'error'
			: status === 'warning'
				? 'warning'
				: status === 'success' || progress === 'completed'
					? 'completed'
					: null
	);
	const stepAriaLabel = $derived(
		statusText != null ? `Go to step ${step + 1}: ${label}, ${statusText}` : `Go to step ${step + 1}: ${label}`
	);
	const hasIndicator = $derived(indicator !== 'none');
	const labelTone = $derived(
		isDisabled ? 'disabled' : progress === 'not-started' ? 'not-started' : isActive ? 'active' : undefined
	);

	// Separated layout padding, and on-track spacing.
	const separatedInline = $derived(density === 'spacious' ? 'var(--spacing-3)' : 'var(--spacing-2)');
	const densitySpace = $derived(
		density === 'compact' ? 'var(--spacing-1)' : density === 'spacious' ? 'var(--spacing-3)' : 'var(--spacing-2)'
	);
	const separatedVars = $derived(
		`--_pad-block: ${densitySpace}; --_pad-inline: ${separatedInline}; --_gutter: ${hasIndicator ? 'var(--spacing-6)' : '0px'}`
	);

	// On-track connector fill states and timing.
	const beforeFilled = $derived(step <= ctx.activeStep);
	const afterFilled = $derived(step < ctx.activeStep);
	const arrivalShare = $derived(isVertical ? OT_ARRIVAL_SHARE_V : OT_ARRIVAL_SHARE_H);
	const leavingShare = $derived(1 - arrivalShare);
	const hasContentSeg = $derived(isVertical && children != null);
	const railShare = $derived(leavingShare * (hasContentSeg ? OT_RAIL_SHARE_OF_LEAVING : 1));
	const contentShare = $derived(leavingShare - railShare);

	/** Moves the node into `target` (the Stepper's summary slot). */
	function portal(node: HTMLElement, target: HTMLElement) {
		target.appendChild(node);
		return {
			destroy() {
				node.remove();
			}
		};
	}
</script>

{#snippet indicatorNode()}
	{#if indicator !== 'none'}
		{#if showNumber}
			<div aria-hidden="true" class="number" data-tone={numberTone}>{step + 1}</div>
		{:else}
			<div aria-hidden="true" class="indicator-icon" data-tone={iconTone}>
				{#if customIndicator}
					{@render customIndicator()}
				{:else if statusGlyph}
					<Icon icon={statusGlyph} size="sm" color={isDisabled ? 'disabled' : statusGlyph} />
				{:else if progress === 'completed'}
					<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
						<circle cx="8" cy="8" r="8" fill="currentColor" />
						<path
							d="M4.75 8.25 7 10.5l4.25-4.5"
							stroke="var(--color-background-surface)"
							stroke-width="1.75"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
				{:else}
					<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
						<circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="2" />
						<circle cx="8" cy="8" r="4" fill="currentColor" />
					</svg>
				{/if}
			</div>
		{/if}
	{/if}
{/snippet}

{#snippet statusTextNode()}
	{#if statusText}<VisuallyHidden>{statusText}</VisuallyHidden>{/if}
{/snippet}

{#snippet labelTail()}
	<span class="label" data-tone={labelTone}>{label}</span>
	{@render statusTextNode()}
	{#if isOptional}
		<span class="optional">•</span>
		<span class="optional">Optional</span>
	{/if}
	{@render endContent?.()}
{/snippet}

{#snippet iconLabel()}
	<div class="icon-label">
		{#if !isCompact || !isOnTrack}{@render indicatorNode()}{/if}
		{@render labelTail()}
	</div>
{/snippet}

{#snippet descriptionNode()}
	{#if description}
		<div id={descriptionID} class="description-row" class:with-indicator={hasIndicator}>
			<span class="description">{description}</span>
		</div>
	{/if}
{/snippet}

{#snippet compactName()}
	{#if isCompact}
		<VisuallyHidden>{label}</VisuallyHidden>
		{@render statusTextNode()}
		{#if isDisabled}<VisuallyHidden>unavailable</VisuallyHidden>{/if}
	{/if}
{/snippet}

{#snippet summary()}
	{#if isCompact && isActive && ctx.summarySlot}
		<div class="summary-root" use:portal={ctx.summarySlot}>
			{@render iconLabel()}
			{#if description}<span class="description">{description}</span>{/if}
		</div>
	{/if}
{/snippet}

{#snippet stepButton(cls: string, styleText: string, inner: Snippet)}
	{#if hasButton}
		<button
			type="button"
			class={`interactive ${cls}`}
			style={styleText}
			onclick={handleClick}
			aria-label={stepAriaLabel}
			aria-describedby={description ? descriptionID : undefined}
			aria-disabled={isDisabled || undefined}
		>
			{@render inner()}
		</button>
	{:else}
		<div class={cls} style={styleText}>{@render inner()}</div>
	{/if}
{/snippet}

{#snippet separatedInner()}
	{@render iconLabel()}
	{@render descriptionNode()}
{/snippet}

{#snippet separatedContent()}
	{#if children}
		<div class="content separated-content" hidden={isCompact || undefined}>{@render children()}</div>
	{/if}
{/snippet}

{#snippet otLabelLine()}
	<div class={isVertical ? 'ot-label-row-start' : 'ot-label-row-center'}>{@render labelTail()}</div>
{/snippet}

{#snippet otDescription()}
	{#if description}<span id={descriptionID} class="description">{description}</span>{/if}
{/snippet}

{#snippet otVerticalInner()}
	<div class="ot-indicator-col">
		<div
			aria-hidden="true"
			class="connector v seg-v seg-lead-v hide-if-first"
			class:gap-lead={hasIndicator}
			class:filled={beforeFilled}
			style={fillTiming(step - 1, leavingShare, arrivalShare)}
		></div>
		{@render indicatorNode()}
		<div
			aria-hidden="true"
			class="connector v seg-v seg-flex-v hide-if-last"
			class:gap-rail={hasIndicator}
			class:filled={afterFilled}
			style={fillTiming(step, 0, railShare)}
		></div>
	</div>
	<div class="ot-body-v">
		{@render otLabelLine()}
		{@render otDescription()}
	</div>
{/snippet}

{#snippet otHorizontalInner()}
	<div class="ot-track-h">
		<div
			aria-hidden="true"
			class="connector h seg-h hide-if-first"
			class:gap-lead={hasIndicator}
			class:filled={beforeFilled}
			style={fillTiming(step - 1, leavingShare, arrivalShare)}
		></div>
		{@render indicatorNode()}
		<div
			aria-hidden="true"
			class="connector h seg-h hide-if-last"
			class:gap-rail={hasIndicator}
			class:filled={afterFilled}
			style={fillTiming(step, 0, railShare)}
		></div>
	</div>
	{#if !isCompact}
		<div class="ot-label-wrap-h">
			{@render otLabelLine()}
			{@render otDescription()}
		</div>
	{/if}
{/snippet}

<li
	class={['astryx-step', className].filter(Boolean).join(' ')}
	data-progress={progress}
	data-status={status}
	data-selected={isActive ? '' : undefined}
	data-layout={isOnTrack ? (isVertical ? 'ot-v' : 'ot-h') : isVertical ? 'v' : 'h'}
	style:--_d={densitySpace}
	{...rest}
	aria-current={isActive ? 'step' : undefined}
>
	{#if isOnTrack && isVertical}
		{@render stepButton('ot-row', '', otVerticalInner)}
		{#if children}
			<div class="ot-content-wrap-v">
				<div
					aria-hidden="true"
					class="connector v ot-content-seg-v hide-if-last"
					class:filled={afterFilled}
					style={fillTiming(step, railShare, contentShare)}
				></div>
				<div class="content ot-content-v">{@render children()}</div>
			</div>
		{/if}
	{:else if isOnTrack}
		{@render stepButton('ot-col', '', otHorizontalInner)}
		{@render compactName()}
		{#if children}<div class="content" hidden={isCompact || undefined}>{@render children()}</div>{/if}
		{@render summary()}
	{:else if isVertical}
		<div
			aria-hidden="true"
			class="connector v bar-v"
			class:filled={isReached}
			style={fillTiming(step - 1, 0, 1)}
		></div>
		<div class="v-body" style={separatedVars}>
			{@render stepButton('separated', '', separatedInner)}
			{@render separatedContent()}
		</div>
	{:else}
		<div
			aria-hidden="true"
			class="connector h bar-h"
			class:filled={isReached}
			style={fillTiming(step - 1, 0, 1)}
		></div>
		<div class="h-body" style={separatedVars}>
			{#if isCompact}
				{@render compactName()}
			{:else}
				{@render stepButton('separated', '', separatedInner)}
			{/if}
			{@render separatedContent()}
		</div>
		{@render summary()}
	{/if}
</li>

<style>
	@layer astryx-base {
		.astryx-step {
			--_bar: var(--spacing-1);
			--_ind: var(--spacing-4);
			--_cgap: max(0px, min(var(--step-connector-gap, 0px), var(--spacing-2)));
			margin: 0;
		}
		.astryx-step[data-layout='v'] {
			display: flex;
			flex-direction: row;
			align-items: stretch;
			position: relative;
			gap: var(--spacing-0-5);
		}
		.astryx-step[data-layout='h'] {
			display: flex;
			flex-direction: column;
			align-items: stretch;
			flex: 1;
			min-width: 0;
		}
		.astryx-step[data-layout='ot-v'] {
			display: flex;
			flex-direction: column;
			position: relative;
		}
		.astryx-step[data-layout='ot-h'] {
			display: flex;
			flex-direction: column;
			flex: 1;
			min-width: 0;
		}
		.v-body {
			display: flex;
			flex-direction: column;
			flex: 1;
			min-width: 0;
		}
		.h-body { display: contents; }
		.bar-v {
			width: var(--_bar);
			border-radius: var(--radius-full);
			flex-shrink: 0;
			align-self: stretch;
		}
		.bar-h {
			width: 100%;
			height: var(--_bar);
			border-radius: var(--radius-full);
			flex-shrink: 0;
			margin-block-end: var(--spacing-0-5);
		}

		/* Connector: a muted track with an accent fill that scales in. */
		.connector {
			position: relative;
			background-color: var(--color-border);
		}
		.connector::before {
			content: '';
			position: absolute;
			inset: 0;
			border-radius: inherit;
			background-color: var(--color-accent);
			transition: transform var(--_fill-duration, var(--duration-medium)) linear var(--_fill-delay, 0s);
		}
		.connector.v::before { transform-origin: center top; transform: scaleY(0); }
		.connector.v.filled::before { transform: scaleY(1); }
		.connector.h::before { transform-origin: left center; transform: scaleX(0); }
		.connector.h:dir(rtl)::before { transform-origin: right center; }
		.connector.h.filled::before { transform: scaleX(1); }
		@media (prefers-reduced-motion: reduce) {
			.connector::before { transition-duration: 0s; transition-delay: 0s; }
		}

		.icon-label {
			display: flex;
			flex-direction: row;
			align-items: center;
			gap: var(--spacing-2);
			min-width: 0;
		}
		.indicator-icon {
			display: flex;
			align-items: center;
			justify-content: center;
			width: var(--_ind);
			height: var(--_ind);
			flex-shrink: 0;
			color: var(--color-accent);
		}
		.indicator-icon[data-tone='not-started'] { color: var(--color-icon-secondary); }
		.indicator-icon[data-tone='disabled'] { color: var(--color-icon-disabled); opacity: 0.5; }
		.indicator-icon[data-tone='success'] { color: var(--color-icon-success); }
		.indicator-icon[data-tone='warning'] { color: var(--color-icon-warning); }
		.indicator-icon[data-tone='error'] { color: var(--color-icon-error); }
		.number {
			display: grid;
			place-items: center;
			width: var(--_ind);
			height: var(--_ind);
			border-radius: var(--radius-full);
			font-size: var(--font-size-xs);
			font-weight: var(--font-weight-semibold);
			flex-shrink: 0;
			text-align: center;
			background-color: var(--color-accent);
			color: var(--color-background-surface);
		}
		@media (forced-colors: active) {
			.number { outline: 1px solid CanvasText; outline-offset: -1px; }
		}
		.number[data-tone='not-started'] { background-color: var(--color-background-muted); color: var(--color-text-secondary); }
		.number[data-tone='disabled'] { background-color: var(--color-background-muted); color: var(--color-text-disabled); opacity: 0.5; }
		.number[data-tone='accent'] { background-color: var(--color-accent); color: var(--color-on-accent); }
		.number[data-tone='success'] { background-color: var(--color-success); color: var(--color-on-success); }
		.number[data-tone='warning'] { background-color: var(--color-warning); color: var(--color-on-warning); }
		.number[data-tone='error'] { background-color: var(--color-error); color: var(--color-on-error); }

		.label {
			font-size: var(--text-body-size);
			line-height: var(--text-body-leading);
			font-weight: var(--font-weight-normal);
			color: var(--color-text-primary);
			min-width: 0;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}
		.label[data-tone='active'] { font-weight: var(--font-weight-semibold); }
		.label[data-tone='not-started'] { color: var(--color-text-secondary); }
		.label[data-tone='disabled'] { color: var(--color-text-disabled); }
		.optional {
			font-size: var(--text-body-size);
			line-height: var(--text-body-leading);
			color: var(--color-text-secondary);
		}
		.description-row { padding-inline-start: var(--spacing-0); }
		.description-row.with-indicator { padding-inline-start: var(--spacing-6); }
		.description {
			display: block;
			font-size: var(--text-supporting-size);
			line-height: var(--spacing-4);
			color: var(--color-text-secondary);
		}
		.content { padding-block-start: var(--spacing-2); }
		.separated-content {
			padding-inline-start: calc(var(--_pad-inline) + var(--_gutter));
			padding-inline-end: var(--_pad-inline);
		}
		.separated {
			padding-block: var(--_pad-block);
			padding-inline: var(--_pad-inline);
		}

		/* Clickable steps. */
		.interactive {
			box-sizing: border-box;
			font: inherit;
			color: inherit;
			border: 0;
			margin: 0;
			text-align: start;
			cursor: pointer;
			border-radius: var(--radius-element);
			background-color: transparent;
			transition: background-color var(--duration-fast-min) var(--ease-standard);
		}
		.interactive.separated {
			align-items: stretch;
			display: flex;
			flex-direction: column;
			width: 100%;
		}
		.interactive[aria-disabled='true'] { cursor: default; }
		@media (hover: hover) {
			.interactive:not([aria-disabled='true']):hover { background-color: var(--color-overlay-hover); }
		}
		.interactive:not([aria-disabled='true']):active { background-color: var(--color-overlay-pressed); }
		.interactive:focus-visible {
			outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color);
			outline-offset: var(--focus-outline-offset);
		}
		@media (prefers-reduced-motion: reduce) {
			.interactive { transition-duration: 0s; }
		}

		/* On-track layouts. */
		.ot-row {
			display: flex;
			flex-direction: row;
			align-items: stretch;
			gap: var(--spacing-2);
			width: 100%;
			padding: var(--_d);
		}
		.ot-col {
			display: flex;
			flex-direction: column;
			align-items: stretch;
			width: 100%;
			padding-block: var(--_d);
		}
		.ot-indicator-col {
			display: flex;
			flex-direction: column;
			align-items: center;
			width: var(--_ind);
			flex-shrink: 0;
			align-self: stretch;
			margin-block: calc(-1 * var(--_d));
		}
		.seg-v {
			width: var(--_bar);
			flex-shrink: 0;
			border-radius: 0;
		}
		.seg-lead-v { height: var(--_d); }
		.seg-flex-v {
			flex: 1 1 0%;
			min-height: var(--spacing-2);
		}
		.seg-v.gap-lead { clip-path: inset(0 0 var(--_cgap) 0); }
		.seg-v.gap-rail { clip-path: inset(var(--_cgap) 0 0 0); }
		.ot-track-h {
			display: flex;
			flex-direction: row;
			align-items: center;
			width: 100%;
		}
		.seg-h {
			height: var(--_bar);
			flex: 1;
			min-width: var(--spacing-2);
			border-radius: 0;
		}
		.seg-h.gap-lead { clip-path: inset(0 var(--_cgap) 0 0); }
		.seg-h.gap-rail { clip-path: inset(0 0 0 var(--_cgap)); }
		.seg-h.gap-lead:dir(rtl) { clip-path: inset(0 0 0 var(--_cgap)); }
		.seg-h.gap-rail:dir(rtl) { clip-path: inset(0 var(--_cgap) 0 0); }
		.astryx-step:first-child .hide-if-first { visibility: hidden; }
		.astryx-step:last-child .hide-if-last { visibility: hidden; }
		.ot-body-v {
			display: flex;
			flex-direction: column;
			justify-content: flex-start;
			flex: 1;
			gap: var(--spacing-0-5);
			min-width: 0;
		}
		.ot-label-wrap-h {
			display: flex;
			flex-direction: column;
			align-items: stretch;
			gap: var(--spacing-0-5);
			text-align: center;
			margin-block-start: var(--_d);
		}
		.ot-label-row-start {
			display: flex;
			flex-direction: row;
			align-items: center;
			gap: var(--spacing-2);
		}
		.ot-label-row-center {
			display: flex;
			flex-direction: row;
			align-items: center;
			justify-content: center;
			flex-wrap: wrap;
			gap: var(--spacing-1);
		}
		.ot-content-wrap-v { position: relative; }
		.ot-content-seg-v {
			position: absolute;
			inset-block: 0;
			inset-inline-start: calc(var(--_d) + (var(--_ind) - var(--_bar)) / 2);
			width: var(--_bar);
		}
		.ot-content-v {
			padding-inline-start: calc(var(--_d) + var(--spacing-6));
			padding-inline-end: var(--_d);
		}

		.summary-root {
			align-items: center;
			display: flex;
			flex-direction: column;
			gap: var(--spacing-0-5);
			min-width: 0;
		}
	}
</style>
