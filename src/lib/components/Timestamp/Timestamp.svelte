<!--
  Port of Astryx `Timestamp` (packages/core/src/Timestamp), MIT, Meta Platforms, Inc.
  Renders a <time> in a relative, absolute or "auto" format; relative times can tick live.
  The details card (full date per zone, with copy buttons on copyable rows) is a HoverCard shown on
  hover and focus; while it is open the time is its popup trigger.
  Not yet ported: non-Gregorian calendars and the locale context (pass `locale` instead).
-->
<script lang="ts">
	import { untrack } from 'svelte';
	import type { HTMLTimeAttributes } from 'svelte/elements';
	import Text from '../Text/Text.svelte';
	import HoverCard from '../HoverCard/HoverCard.svelte';
	import TimestampCopyButton from './TimestampCopyButton.svelte';
	import VisuallyHidden from '../VisuallyHidden/VisuallyHidden.svelte';
	import type { TextColor, TextSize, TextType, TextWeight } from '../../types.js';
	import {
		formatInstant,
		formatRelativeTime,
		formatTooltipLines,
		formatZoneName,
		resolveTimezoneID,
		type TimestampFormat,
		type TimestampTooltipEntry,
		type TimestampTooltipLine
	} from './format.js';

	interface Props extends Omit<HTMLTimeAttributes, 'color'> {
		/**
		 * ISO string, or a Unix timestamp. Like Astryx, numbers below 1e12 are read as seconds and
		 * larger ones as milliseconds, so pass millisecond values before Sept 2001 as an ISO string
		 * or a seconds value.
		 */
		value: string | number;
		format?: TimestampFormat;
		/** IANA zone for absolute formats; defaults to the viewer's zone. */
		timezoneID?: string;
		/** Seconds within which "auto" shows a relative time. Default 7 days. */
		autoThreshold?: number;
		hasTooltip?: boolean;
		tooltipEntries?: ReadonlyArray<TimestampTooltipEntry>;
		isTimezoneShown?: boolean;
		/** Keep a relative time up to date. */
		isLive?: boolean;
		locale?: string;
		type?: TextType;
		size?: TextSize;
		color?: TextColor;
		weight?: TextWeight;
	}

	let {
		value,
		format = 'auto',
		timezoneID: timezoneIDProp,
		autoThreshold = 7 * 86400,
		hasTooltip = true,
		tooltipEntries,
		isTimezoneShown = false,
		isLive = false,
		locale = 'en-US',
		type = 'supporting',
		size,
		color = 'secondary',
		weight,
		class: className,
		style,
		...rest
	}: Props = $props();

	const MINUTE = 60;
	const HOUR = 3600;
	const DAY = 86400;

	const isRelative = (f: TimestampFormat) => f === 'relative' || f === 'relative_short';
	const needsClock = $derived(isRelative(format) || format === 'auto');

	// The clock is read on the client only, so server and hydration render the same UTC fallback.
	let now = $state<Date | null>(null);
	// Read the clock on mount and again whenever a new value arrives, so a new value is never
	// measured against a stale baseline (with or without live updates).
	$effect(() => {
		void value;
		if (needsClock) untrack(() => (now = new Date()));
	});

	const date = $derived(typeof value === 'number' ? new Date(value < 1e12 ? value * 1000 : value) : new Date(value));
	const isValid = $derived(!Number.isNaN(date.getTime()));
	$effect(() => {
		if (!isValid) console.warn(`[Timestamp] could not parse value ${JSON.stringify(value)} as a date. Rendering nothing.`);
	});
	const isClockPending = $derived(needsClock && now === null);
	const diffSeconds = $derived(now === null ? 0 : Math.round((now.getTime() - date.getTime()) / 1000));
	const effectiveFormat: TimestampFormat = $derived(
		isClockPending
			? 'date_time'
			: format === 'auto'
				? Math.abs(diffSeconds) <= autoThreshold
					? 'relative'
					: 'date_time'
				: format
	);
	const timezoneID = $derived(resolveTimezoneID(timezoneIDProp));

	const displayText = $derived.by(() => {
		if (!isValid) return '';
		if (effectiveFormat === 'relative') return formatRelativeTime(date, now ?? date, locale, 'long');
		if (effectiveFormat === 'relative_short') return formatRelativeTime(date, now ?? date, locale, 'narrow');
		return formatInstant(
			date,
			effectiveFormat,
			locale,
			isClockPending ? { timeZone: 'UTC', isTimezoneShown: true } : { timeZone: timezoneID, isTimezoneShown }
		);
	});
	const spokenDate = $derived(isValid ? formatInstant(date, 'full', locale, { timeZoneNameStyle: 'long' }) : '');
	const ariaLabel = $derived(
		isRelative(effectiveFormat) && spokenDate !== '' && rest['aria-label'] == null
			? `${displayText}, ${spokenDate}`
			: rest['aria-label']
	);

	const entries = $derived(tooltipEntries != null && tooltipEntries.length > 0 ? tooltipEntries : undefined);
	const showTooltip = $derived(isValid && hasTooltip && (isRelative(effectiveFormat) || entries !== undefined));
	const lines: TimestampTooltipLine[] = $derived(
		!showTooltip
			? []
			: entries === undefined
				? [{ value: formatInstant(date, 'full', locale), zoneName: formatZoneName(date, locale), isCopyable: true }]
				: formatTooltipLines(date, entries, locale, timezoneID)
	);
	const hasLabelColumn = $derived(lines.some((l) => l.label != null && l.label !== ''));
	const hasActionColumn = $derived(lines.some((l) => l.isCopyable));

	// Hold live refreshes while focus is on the time (or a control it names), so a screen reader
	// isn't re-reading a changing label; catch up as soon as focus leaves.
	const NAMED_FROM_CONTENT =
		'button,summary,a[href],[role=button],[role=link],[role=tab],[role^=menuitem],[role=option],[role=radio],[role=checkbox],[role=switch],[role=treeitem]';
	function focusIsNamedBy(time: HTMLElement, focused: Element | null): boolean {
		return (
			focused === time ||
			(focused != null &&
				focused.contains(time) &&
				focused.matches(NAMED_FROM_CONTENT) &&
				!focused.matches('[aria-label],[aria-labelledby]')) ||
			(focused != null && time.closest('label')?.control === focused)
		);
	}
	let timeEl: HTMLElement | undefined = $state();
	let holdsRefresh = false;
	const isLiveRelative = $derived(isLive && isValid && isRelative(effectiveFormat));
	$effect(() => {
		const doc = timeEl?.ownerDocument;
		if (!isLiveRelative || !doc) return;
		const sync = () => {
			const holds = timeEl != null && focusIsNamedBy(timeEl, doc.activeElement);
			if (holdsRefresh && !holds) now = new Date();
			holdsRefresh = holds;
		};
		sync();
		doc.addEventListener('focusin', sync);
		doc.addEventListener('focusout', sync);
		return () => {
			doc.removeEventListener('focusin', sync);
			doc.removeEventListener('focusout', sync);
			holdsRefresh = false;
		};
	});
	$effect(() => {
		if (!isLiveRelative) return;
		const abs = Math.abs(diffSeconds);
		const interval = abs < MINUTE ? 1000 : abs < HOUR ? 30_000 : abs < DAY ? 60_000 : 300_000;
		const timer = setInterval(() => {
			if (!holdsRefresh) now = new Date();
		}, interval);
		return () => clearInterval(timer);
	});
</script>

{#snippet time()}
	<!-- Focusable so keyboard users can reach the details tooltip, as in Astryx. -->
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<time
		bind:this={timeEl}
		{...rest}
		datetime={date.toISOString()}
		aria-label={ariaLabel}
		tabindex={showTooltip && rest.tabindex == null ? 0 : rest.tabindex}
		class="time">{displayText}</time
	>
{/snippet}

{#snippet details()}
	<dl class="details" class:labelled={hasLabelColumn} class:actions={hasActionColumn}>
		{#each lines as line, i (i)}
			<div class="row">
				{#if hasLabelColumn}
					<dt class="label">
						{#if line.label}{line.label}{:else}<VisuallyHidden>{line.zoneName}</VisuallyHidden>{/if}
					</dt>
				{:else}
					<dt class="sr-dt"><VisuallyHidden>{line.zoneName}</VisuallyHidden></dt>
				{/if}
				{#if hasActionColumn}
					<dd class="value value-cells">
						<span>{line.value}</span>
						<span class="action">{#if line.isCopyable}<TimestampCopyButton value={line.value} />{/if}</span>
					</dd>
				{:else}
					<dd class="value">{line.value}</dd>
				{/if}
			</div>
		{/each}
	</dl>
{/snippet}

{#if isValid}
	<Text
		{type}
		{size}
		{color}
		{weight}
		class={['astryx-timestamp', className]}
		{style}
		data-format={effectiveFormat}
	>
		{#if showTooltip}
			<HoverCard content={details} focusTrigger="always" label="Timestamp details" hasHoverIndication={false}>
				{@render time()}
			</HoverCard>
		{:else}
			{@render time()}
		{/if}
	</Text>
{/if}

<style>
	@layer astryx-base {
		.time {
			display: inline;
			font: inherit;
			color: inherit;
		}
		.time:focus-visible {
			outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color);
			outline-offset: 2px;
			border-radius: var(--radius-inline, 2px);
		}
		.details {
			display: grid;
			grid-template-columns: 1fr;
			align-items: center;
			column-gap: var(--spacing-4);
			row-gap: var(--spacing-2);
			margin: 0;
			padding: 0;
		}
		.details.labelled { grid-template-columns: auto 1fr; }
		.details.actions { grid-template-columns: 1fr auto; }
		.details.labelled.actions { grid-template-columns: auto 1fr auto; }
		.row { display: contents; }
		.label {
			margin: 0;
			color: var(--color-text-secondary);
			font-size: var(--text-supporting-size);
			line-height: var(--text-supporting-leading);
			white-space: nowrap;
		}
		.sr-dt { display: contents; }
		.value {
			margin: 0;
			color: var(--color-text-primary);
			font-size: var(--text-body-size);
			line-height: var(--text-body-leading);
			white-space: nowrap;
		}
		.value-cells {
			grid-column: span 2;
			display: flex;
			justify-content: space-between;
			align-items: center;
		}
		@supports (grid-template-columns: subgrid) {
			.value-cells { display: grid; grid-template-columns: subgrid; }
		}
		.action { display: flex; justify-content: flex-end; align-items: center; }
	}
</style>
