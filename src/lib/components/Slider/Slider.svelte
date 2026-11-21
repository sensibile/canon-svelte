<!--
  Port of Astryx `Slider` (packages/core/src/Slider/Slider.tsx), MIT, Meta Platforms, Inc.
  A single value (`value: number`) or a range (`value: [number, number]`). Drag the thumbs or
  click the track; arrow keys step, Page keys step by ten, Home/End jump to the bounds.
  `onChange` fires while moving, `onChangeEnd` when a drag or key press finishes.
  The value shows in a tooltip on hover, focus and drag, as text beside the track, or not at all.
  Not yet ported: the touch controller (touch drags like a mouse here) and widened touch hit areas.
-->
<script lang="ts" module>
	export type SliderValue = number | [number, number];
	export interface SliderMark {
		value: number;
		label?: string;
	}
</script>

<script lang="ts" generics="V extends SliderValue">
	import type { HTMLAttributes } from 'svelte/elements';
	import Field from '../Field/Field.svelte';
	import type { FieldStatusInput } from '../Field/types.js';
	import Tooltip from '../Tooltip/Tooltip.svelte';
	import VisuallyHidden from '../VisuallyHidden/VisuallyHidden.svelte';
	import type { SizeValue } from '../../types.js';

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'onchange'> {
		label: string;
		value: V;
		onChange?: (value: V) => void;
		onChangeEnd?: (value: V) => void;
		isLabelHidden?: boolean;
		description?: string;
		isDisabled?: boolean;
		disabledMessage?: string;
		isOptional?: boolean;
		isRequired?: boolean;
		status?: FieldStatusInput;
		width?: SizeValue;
		labelTooltip?: string;
		min?: number;
		max?: number;
		step?: number;
		orientation?: 'horizontal' | 'vertical';
		formatValue?: (value: number) => string;
		valueDisplay?: 'tooltip' | 'text' | 'none';
		marks?: SliderMark[];
		htmlName?: string;
		/** The id of a form outside this one that the hidden inputs belong to. */
		form?: string;
		/** Range only: the smallest gap between the thumbs, in steps. */
		minStepsBetweenThumbs?: number;
		containerClass?: string;
	}

	let {
		label,
		value = $bindable(),
		onChange,
		onChangeEnd,
		isLabelHidden = false,
		description,
		isDisabled = false,
		disabledMessage,
		isOptional = false,
		isRequired = false,
		status,
		width,
		labelTooltip,
		min = 0,
		max = 100,
		step = 1,
		orientation = 'horizontal',
		formatValue,
		valueDisplay = 'tooltip',
		marks,
		htmlName,
		form,
		minStepsBetweenThumbs = 0,
		containerClass,
		class: className,
		id: idProp,
		'aria-labelledby': labelledByProp,
		'aria-describedby': describedByProp,
		...rest
	}: Props = $props();

	const THUMB_SIZE = 20;
	const MARK_LABEL_OFFSET = THUMB_SIZE / 2 + 4;
	const uid = $props.id();
	const id = $derived(idProp ?? `${uid}-slider`);
	const labelID = `${uid}-label`;
	const descriptionID = `${uid}-desc`;
	const statusMessageID = `${uid}-status`;
	const requiredID = `${uid}-required`;
	const disabledMessageID = `${uid}-disabled-reason`;

	const isRange = $derived(Array.isArray(value));
	const isHorizontal = $derived(orientation === 'horizontal');
	const showsDisabledMessage = $derived(isDisabled && !!disabledMessage);
	const conveysRequired = $derived(isRequired && !isOptional);
	const describedBy = $derived(
		[
			description ? descriptionID : null,
			status?.message ? statusMessageID : null,
			conveysRequired ? requiredID : null,
			showsDisabledMessage ? disabledMessageID : null
		]
			.filter(Boolean)
			.join(' ') || undefined
	);

	const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
	function decimalPrecision(n: number): number {
		if (Math.abs(n) < 1) {
			const parts = n.toExponential().split('e-');
			if (parts.length === 2) return (parts[0].split('.')[1]?.length ?? 0) + parseInt(parts[1], 10);
		}
		return String(n).split('.')[1]?.length ?? 0;
	}
	function snapToStep(v: number): number {
		if (step <= 0) return v;
		const snapped = min + Math.round((v - min) / step) * step;
		return Number(snapped.toFixed(Math.min(Math.max(decimalPrecision(min), decimalPrecision(step)), 20)));
	}
	const percentOf = (v: number) => (max === min ? 0 : ((v - min) / (max - min)) * 100);
	function insetPosition(percent: number): string {
		const px = THUMB_SIZE / 2 - (percent / 100) * THUMB_SIZE;
		const r = (n: number) => Number(n.toFixed(3));
		return `calc(${r(percent)}% ${px < 0 ? '-' : '+'} ${Math.abs(r(px))}px)`;
	}

	const values: number[] = $derived(
		(Array.isArray(value) ? value : [value ?? min]).map((v) => clamp(v as number, min, max))
	);

	let track: HTMLDivElement | undefined = $state();
	let draggingThumb = $state<number | null>(null);
	let dragPointer: number | null = null;
	let coincidentPress: number | null = null;
	let coincidentOrigin = false;
	const anchors: (HTMLElement | undefined)[] = $state([]);

	function emit(next: number[]) {
		const out = (isRange ? [next[0], next[1]] : next[0]) as V;
		value = out;
		onChange?.(out);
	}
	function emitEnd(next: number[] = values) {
		onChangeEnd?.((isRange ? [next[0], next[1]] : next[0]) as V);
	}

	/** The values after moving one thumb, respecting bounds and the minimum gap. */
	function constrained(index: number, raw: number, snap = true, from: readonly number[] = values): number[] {
		const v = clamp(snap ? snapToStep(raw) : raw, min, max);
		if (!isRange) return [v];
		const next = [...from];
		next[index] = v;
		const gap = minStepsBetweenThumbs * step;
		if (index === 0) next[0] = Math.min(next[0], next[1] - gap);
		else next[1] = Math.max(next[1], next[0] + gap);
		return [clamp(next[0], min, max), clamp(next[1], min, max)];
	}
	function update(index: number, raw: number, snap = true, from: readonly number[] = values) {
		if (isDisabled) return;
		emit(constrained(index, raw, snap, from));
	}

	function valueFromPosition(x: number, y: number): number {
		if (!track) return min;
		const rect = track.getBoundingClientRect();
		const fraction = (offset: number, size: number) => {
			const travel = size - THUMB_SIZE;
			return travel > 0 ? (offset - THUMB_SIZE / 2) / travel : size > 0 ? offset / size : 0;
		};
		const rtl = getComputedStyle(track).direction === 'rtl';
		let p = isHorizontal
			? fraction(rtl ? rect.right - x : x - rect.left, rect.width)
			: 1 - fraction(y - rect.top, rect.height);
		p = clamp(p, 0, 1);
		return clamp(snapToStep(min + p * (max - min)), min, max);
	}
	const closestThumb = (v: number) =>
		!isRange ? 0 : Math.abs(v - values[0]) <= Math.abs(v - values[1]) ? 0 : 1;
	const thumbs = () => [...(track?.querySelectorAll<HTMLElement>('[role="slider"]') ?? [])];

	function onPointerDown(e: PointerEvent & { currentTarget: HTMLDivElement }) {
		if (isDisabled || e.button !== 0 || e.ctrlKey) return;
		e.preventDefault();
		if (draggingThumb !== null) return;
		dragPointer = e.pointerId;
		const pressed = (e.target as Element).closest<HTMLElement>('[role="slider"]');
		const markEl = (e.target as HTMLElement).closest<HTMLElement>('[data-mark-value]');
		const newVal = markEl ? Number(markEl.dataset.markValue) : valueFromPosition(e.clientX, e.clientY);
		const pressedIndex = pressed ? thumbs().indexOf(pressed) : -1;
		const isCoincident = isRange && values[0] === values[1];
		let index = pressedIndex >= 0 ? pressedIndex : closestThumb(newVal);
		// Two thumbs on one spot: the first move decides which one is dragged.
		const parks = isCoincident && (pressedIndex >= 0 || newVal === values[0]);
		if (parks && pressedIndex < 0) index = 1;
		coincidentPress = parks ? valueFromPosition(e.clientX, e.clientY) : null;
		coincidentOrigin = parks;
		if (isCoincident && !parks) index = newVal > values[0] ? 1 : 0;
		draggingThumb = index;
		// Pressing a thumb doesn't move it; pressing the track jumps the nearest thumb there.
		if (pressedIndex < 0) update(index, parks ? values[index] : newVal);
		thumbs()[index]?.focus();
		e.currentTarget.setPointerCapture?.(e.pointerId);
	}
	function onPointerMove(e: PointerEvent) {
		if (draggingThumb === null || e.pointerId !== dragPointer || isDisabled) return;
		const newVal = valueFromPosition(e.clientX, e.clientY);
		const handTo = (index: number) => {
			if (index === draggingThumb) return;
			draggingThumb = index;
			thumbs()[index]?.focus();
		};
		if (coincidentPress !== null) {
			if (newVal === coincidentPress) return;
			const pressValue = coincidentPress;
			coincidentPress = null;
			handTo(newVal > pressValue ? 1 : 0);
		} else if (coincidentOrigin) {
			const dragging = draggingThumb;
			const other = dragging === 0 ? 1 : 0;
			if ((dragging === 0 && newVal > values[1]) || (dragging === 1 && newVal < values[0])) {
				const from = [...values];
				from[dragging] = values[other];
				handTo(other);
				update(other, newVal, true, from);
				return;
			}
		}
		update(draggingThumb, newVal);
	}
	function endDrag(pointerId: number) {
		if (draggingThumb === null || pointerId !== dragPointer) return;
		draggingThumb = null;
		dragPointer = null;
		coincidentPress = null;
		coincidentOrigin = false;
		emitEnd();
	}

	function onThumbKeydown(index: number, e: KeyboardEvent) {
		if (isDisabled) return;
		const current = values[index];
		const rtl = track != null && getComputedStyle(track).direction === 'rtl';
		const towardMax = isHorizontal && rtl ? 'ArrowLeft' : 'ArrowRight';
		const towardMin = towardMax === 'ArrowLeft' ? 'ArrowRight' : 'ArrowLeft';
		let next: number;
		switch (e.key) {
			case towardMax:
			case 'ArrowUp':
				next = current + step;
				break;
			case towardMin:
			case 'ArrowDown':
				next = current - step;
				break;
			case 'PageUp':
				next = current + step * 10;
				break;
			case 'PageDown':
				next = current - step * 10;
				break;
			case 'Home':
				next = min;
				break;
			case 'End':
				next = max;
				break;
			default:
				return;
		}
		e.preventDefault();
		const toBound = e.key === 'Home' || e.key === 'End';
		const result = constrained(index, next, !toBound);
		emit(result);
		emitEnd(result);
	}

	const display = (v: number) => (formatValue ? formatValue(v) : String(v));
	const fillStart = $derived(isRange ? percentOf(values[0]) / 100 : 0);
	const fillEnd = $derived(percentOf(values[isRange ? 1 : 0]) / 100);
	const hasMarkLabels = $derived(isHorizontal && (marks?.some((m) => Boolean(m.label)) ?? false));
</script>

<Field
	class={containerClass}
	{label}
	{isLabelHidden}
	{description}
	inputID={id}
	{labelID}
	isGroupLabel
	descriptionID={description ? descriptionID : undefined}
	{isOptional}
	{isRequired}
	{isDisabled}
	status={status
		? { type: status.type, message: status.message, messageID: status.message ? statusMessageID : undefined }
		: undefined}
	{labelTooltip}
	statusVariant="detached"
	{width}
>
	<div
		class="astryx-slider slider-row"
		class:mark-labels={hasMarkLabels}
		data-orientation={orientation}
		data-disabled={isDisabled ? 'disabled' : undefined}
		style:--_mark-label-offset="{MARK_LABEL_OFFSET}px"
	>
		{#if htmlName != null && !isDisabled}
			{#each values as v, i (i)}<input type="hidden" name={htmlName} {form} value={String(v)} />{/each}
		{/if}
		<Tooltip content={disabledMessage ?? ''} isEnabled={showsDisabledMessage} focusTrigger="always">
			<div
				{...isRange ? rest : {}}
				bind:this={track}
				class={['astryx-slider-control', 'track-container', className]}
				class:disabled={isDisabled}
				data-orientation={orientation}
				role={isRange ? 'group' : undefined}
				aria-labelledby={isRange ? [labelID, labelledByProp].filter(Boolean).join(' ') : undefined}
				aria-describedby={isRange ? describedByProp : undefined}
				onpointerdown={onPointerDown}
				onpointermove={onPointerMove}
				onpointerup={(e) => endDrag(e.pointerId)}
				onpointercancel={(e) => endDrag(e.pointerId)}
				onlostpointercapture={(e) => endDrag(e.pointerId)}
			>
				<div class="travel-box">
					<div class="astryx-slider-track track" aria-hidden="true"></div>
					<div class="fill-clip" aria-hidden="true">
						<div class="fill-mover" class:range={isRange} style:--_slider-fill-start={fillStart}>
							<div
								class="fill"
								class:range={isRange}
								style:--_slider-fill-start={fillStart}
								style:--_slider-fill-end={fillEnd}
							></div>
						</div>
					</div>
					{#if marks}
						<div class="marks" aria-hidden="true">
							{#each marks as mark (mark.value)}
								{@const pos = insetPosition(percentOf(mark.value))}
								{@const filled = isRange
									? mark.value >= values[0] && mark.value <= values[1]
									: mark.value <= values[0]}
								<div
									class="mark"
									class:filled
									data-mark-value={mark.value}
									style:inset-inline-start={isHorizontal ? pos : undefined}
									style:bottom={isHorizontal ? undefined : pos}
								></div>
								{#if mark.label}
									<span
										class="mark-label"
										data-mark-value={mark.value}
										style:inset-inline-start={isHorizontal ? pos : undefined}
										style:bottom={isHorizontal ? undefined : pos}>{mark.label}</span
									>
								{/if}
							{/each}
						</div>
					{/if}
					{#each values as v, i (i)}
						{@const progress = percentOf(v) / 100}
						{@const gap = minStepsBetweenThumbs * step}
						{#snippet thumb()}
							<div
								{...!isRange ? rest : {}}
								id={!isRange ? id : undefined}
								role="slider"
								tabindex={0}
								class="astryx-slider-thumb thumb"
								class:pressed={!isDisabled && draggingThumb === i}
								class:thumb-disabled={isDisabled}
								data-orientation={orientation}
								style:--_slider-progress={progress}
								aria-valuemin={isRange && i === 1 ? clamp(values[0] + gap, min, max) : min}
								aria-valuemax={isRange && i === 0 ? clamp(values[1] - gap, min, max) : max}
								aria-valuenow={v}
								aria-valuetext={formatValue ? formatValue(v) : undefined}
								aria-orientation={orientation}
								aria-disabled={isDisabled || undefined}
								aria-invalid={status?.type === 'error' ? true : undefined}
								aria-label={isRange ? (i === 0 ? 'Minimum value' : 'Maximum value') : undefined}
								aria-labelledby={!isRange ? [labelID, labelledByProp].filter(Boolean).join(' ') : undefined}
								aria-describedby={[!isRange ? describedByProp : undefined, describedBy].filter(Boolean).join(' ') ||
									undefined}
								onkeydown={(e) => onThumbKeydown(i, e)}
							></div>
						{/snippet}
						{#if valueDisplay === 'tooltip' && !showsDisabledMessage}
							<span
								bind:this={anchors[i]}
								class="value-anchor"
								aria-hidden="true"
								style:--_slider-progress={progress}
							></span>
							<Tooltip
								content={display(v)}
								placement={isHorizontal ? 'above' : 'start'}
								delay={0}
								focusTrigger="always"
								hasHoverIndication={false}
								anchor={anchors[i] ?? null}
								isOpen={draggingThumb === null ? undefined : draggingThumb === i}
							>
								{@render thumb()}
							</Tooltip>
						{:else}
							{@render thumb()}
						{/if}
					{/each}
				</div>
			</div>
		</Tooltip>
		{#if valueDisplay === 'text'}
			<span class="text-value">
				{isRange ? `${display(values[0])} – ${display(values[1])}` : display(values[0])}
			</span>
		{/if}
	</div>
	{#if conveysRequired}<VisuallyHidden id={requiredID}>Required</VisuallyHidden>{/if}
	{#if showsDisabledMessage}<VisuallyHidden id={disabledMessageID}>{disabledMessage}</VisuallyHidden>{/if}
</Field>

<style>
	@layer astryx-base {
		.slider-row {
			--_thumb: 20px;
			display: flex;
			align-items: center;
			gap: var(--spacing-2);
		}
		.slider-row.mark-labels {
			padding-block-end: calc(var(--_mark-label-offset) - var(--_thumb) / 2 + var(--text-supporting-size) * var(--text-supporting-leading));
		}
		@media (pointer: coarse) {
			.slider-row.mark-labels {
				padding-block-end: calc(var(--_mark-label-offset) - 12px + var(--text-supporting-size) * var(--text-supporting-leading));
			}
		}
		.track-container {
			position: relative;
			display: flex;
			align-items: center;
			flex-grow: 1;
			touch-action: none;
			-webkit-user-select: none;
			user-select: none;
			isolation: isolate;
			cursor: pointer;
		}
		.track-container[data-orientation='horizontal'] { height: var(--_thumb); width: 100%; }
		.track-container[data-orientation='vertical'] {
			width: var(--_thumb);
			height: 160px;
			flex-direction: column;
			justify-content: center;
		}
		@media (pointer: coarse) {
			.track-container[data-orientation='horizontal'] { min-block-size: 24px; }
			.track-container[data-orientation='vertical'] { min-inline-size: 24px; }
		}
		.track-container.disabled { opacity: 0.5; cursor: default; }
		.travel-box { position: absolute; inset: 0; container-type: size; }

		.track,
		.fill-clip {
			position: absolute;
			border-radius: var(--radius-full);
		}
		.track { background-color: var(--color-track); }
		.fill-clip { overflow: hidden; pointer-events: none; }
		[data-orientation='horizontal'] .track,
		[data-orientation='horizontal'] .fill-clip {
			inset-inline: 0;
			height: 4px;
			top: 50%;
			transform: translateY(-50%);
		}
		[data-orientation='vertical'] .track,
		[data-orientation='vertical'] .fill-clip {
			top: 0;
			bottom: 0;
			width: 4px;
			inset-inline-start: calc(50% - 2px);
		}
		.fill-mover { position: absolute; inset: 0; overflow: hidden; }
		.fill { position: absolute; inset: 0; background-color: var(--color-accent); }
		[data-orientation='horizontal'] .fill { border-start-end-radius: var(--radius-full); border-end-end-radius: var(--radius-full); }
		[data-orientation='vertical'] .fill { border-start-start-radius: var(--radius-full); border-start-end-radius: var(--radius-full); }
		[data-orientation='horizontal'] .fill-mover.range {
			border-start-start-radius: var(--radius-full);
			border-end-start-radius: var(--radius-full);
			translate: calc(var(--_thumb) / 2 + var(--_slider-fill-start) * (100cqi - var(--_thumb))) 0;
		}
		[data-orientation='horizontal'] .fill-mover.range:dir(rtl) {
			translate: calc(var(--_thumb) / -2 - var(--_slider-fill-start) * (100cqi - var(--_thumb))) 0;
		}
		[data-orientation='vertical'] .fill-mover.range {
			border-end-start-radius: var(--radius-full);
			border-end-end-radius: var(--radius-full);
			translate: 0 calc(var(--_thumb) / -2 - var(--_slider-fill-start) * (100cqb - var(--_thumb)));
		}
		[data-orientation='horizontal'] .fill:not(.range) {
			translate: calc(var(--_thumb) / 2 + var(--_slider-fill-end) * (100cqi - var(--_thumb)) - 100cqi) 0;
		}
		[data-orientation='horizontal'] .fill:not(.range):dir(rtl) {
			translate: calc(100cqi - var(--_thumb) / 2 - var(--_slider-fill-end) * (100cqi - var(--_thumb))) 0;
		}
		[data-orientation='vertical'] .fill:not(.range) {
			translate: 0 calc(100cqb - var(--_thumb) / 2 - var(--_slider-fill-end) * (100cqb - var(--_thumb)));
		}
		[data-orientation='horizontal'] .fill.range {
			translate: calc((var(--_slider-fill-end) - var(--_slider-fill-start)) * (100cqi - var(--_thumb)) - 100cqi) 0;
		}
		[data-orientation='horizontal'] .fill.range:dir(rtl) {
			translate: calc(100cqi - (var(--_slider-fill-end) - var(--_slider-fill-start)) * (100cqi - var(--_thumb))) 0;
		}
		[data-orientation='vertical'] .fill.range {
			translate: 0 calc(100cqb - (var(--_slider-fill-end) - var(--_slider-fill-start)) * (100cqb - var(--_thumb)));
		}

		.thumb {
			position: absolute;
			width: var(--_thumb);
			height: var(--_thumb);
			border-radius: var(--radius-full);
			background-color: var(--color-accent);
			transition: background-color var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard);
			outline: none;
			cursor: grab;
			z-index: 1;
		}
		@media (prefers-reduced-motion: reduce) {
			.thumb { transition-duration: 0s; }
		}
		.thumb[data-orientation='horizontal'] {
			top: calc(50% - var(--_thumb) / 2);
			inset-inline-start: 0;
			translate: calc(var(--_slider-progress) * (100cqi - var(--_thumb))) 0;
		}
		.thumb[data-orientation='horizontal']:dir(rtl) {
			translate: calc(var(--_slider-progress) * (var(--_thumb) - 100cqi)) 0;
		}
		.thumb[data-orientation='vertical'] {
			bottom: 0;
			inset-inline-start: calc(50% - var(--_thumb) / 2);
			translate: 0 calc(var(--_slider-progress) * (var(--_thumb) - 100cqb));
		}
		@media (hover: hover) {
			.thumb:not(.thumb-disabled):hover {
				background-color: color-mix(in srgb, var(--color-accent), var(--color-tint-hover) 15%);
			}
		}
		.pressed { background-image: linear-gradient(var(--color-overlay-pressed), var(--color-overlay-pressed)); }
		.thumb:focus-visible {
			outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color);
			outline-offset: var(--focus-outline-offset);
		}
		.thumb-disabled { background-color: var(--color-background-muted); cursor: default; }

		.value-anchor {
			position: absolute;
			width: var(--_thumb);
			height: var(--_thumb);
			pointer-events: none;
		}
		[data-orientation='horizontal'] .value-anchor {
			top: calc(50% - var(--_thumb) / 2);
			inset-inline-start: calc(var(--_slider-progress) * (100cqi - var(--_thumb)));
		}
		[data-orientation='vertical'] .value-anchor {
			inset-inline-start: calc(50% - var(--_thumb) / 2);
			bottom: calc(var(--_slider-progress) * (100cqb - var(--_thumb)));
		}

		.marks { position: absolute; }
		[data-orientation='horizontal'] .marks { inset-inline: 0; top: 50%; }
		[data-orientation='vertical'] .marks { top: 0; bottom: 0; inset-inline-start: 50%; }
		.mark { position: absolute; background-color: var(--color-track); border-radius: var(--radius-full); }
		.mark.filled { background-color: var(--color-accent); }
		[data-orientation='horizontal'] .mark { width: 2px; height: 8px; transform: translate(-50%, -50%); }
		:global([dir='rtl']) [data-orientation='horizontal'] .mark { transform: translate(50%, -50%); }
		[data-orientation='vertical'] .mark { height: 2px; width: 8px; transform: translate(-50%, 50%); }
		.mark-label {
			position: absolute;
			font-family: var(--font-family-body);
			font-size: var(--text-supporting-size);
			line-height: var(--text-supporting-leading);
			color: var(--color-text-secondary);
			white-space: nowrap;
		}
		[data-orientation='horizontal'] .mark-label { transform: translateX(-50%); top: var(--_mark-label-offset); }
		:global([dir='rtl']) [data-orientation='horizontal'] .mark-label { transform: translateX(50%); }
		[data-orientation='vertical'] .mark-label { transform: translateY(50%); inset-inline-start: calc(var(--_thumb) / 2 + 4px); }

		.text-value {
			font-family: var(--font-family-body);
			font-size: var(--text-label-size);
			line-height: var(--text-label-leading);
			color: var(--color-text-primary);
			white-space: nowrap;
			flex-shrink: 0;
		}
	}
</style>
