<!--
  Port of Astryx `Pagination` (packages/core/src/Pagination/Pagination.tsx), MIT, Meta Platforms, Inc.
  Previous/next controls around a page indicator. `variant` picks the indicator: numbered "pages"
  (with ellipses), a "count" of items, a "compact" "Page x of y", "dots" (a radio group where
  focus selects), an "input" to type a page, or "none". Know the total from `totalPages` or
  `totalItems` / `pageSize`; with neither, `hasMore` says whether there is a next page.
  With `getPageHref` the controls are links; a plain click still calls `onChange`.
  `changeAction` runs after `onChange`; the new page shows until it settles.
  Page changes are announced to screen readers.
  Not yet ported: `as` (custom link components), the input's tooltip status placement (entry
  errors show detached), and the input's reject-on-out-of-range entry (out-of-range pages clamp).
-->
<script lang="ts" module>
	export type PaginationVariant = 'pages' | 'count' | 'compact' | 'dots' | 'input' | 'none';
	export type PaginationSize = 'sm' | 'md';
	export { generatePageRange } from './pageRange.js';
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import Button from '../Button/Button.svelte';
	import NumberInput from '../NumberInput/NumberInput.svelte';
	import Selector from '../Selector/Selector.svelte';
	import Text from '../Text/Text.svelte';
	import VisuallyHidden from '../VisuallyHidden/VisuallyHidden.svelte';
	import { generatePageRange } from './pageRange.js';

	interface Props extends Omit<HTMLAttributes<HTMLElement>, 'onchange'> {
		page: number;
		onChange: (page: number) => void;
		changeAction?: (page: number) => void | Promise<void>;
		getPageHref?: (page: number, pageSize?: number) => string;
		totalItems?: number;
		totalPages?: number;
		hasMore?: boolean;
		pageSize?: number;
		pageSizeOptions?: number[];
		onPageSizeChange?: (pageSize: number) => void;
		variant?: PaginationVariant;
		/** Label before the page input (variant "input"). */
		pageLabel?: string;
		hasFirstLast?: boolean;
		/** Pages moved by previous/next. */
		step?: number;
		siblingCount?: number;
		size?: PaginationSize;
		isDisabled?: boolean;
		label?: string;
		'data-testid'?: string;
	}

	let {
		page,
		onChange,
		changeAction,
		getPageHref,
		totalItems,
		totalPages: totalPagesProp,
		hasMore,
		pageSize: pageSizeProp,
		pageSizeOptions,
		onPageSizeChange,
		variant = 'pages',
		pageLabel = 'Page',
		hasFirstLast: hasFirstLastProp,
		step: stepProp = 1,
		siblingCount = 1,
		size = 'md',
		isDisabled = false,
		label = 'Pagination',
		'data-testid': testId,
		class: className,
		...rest
	}: Props = $props();

	const PAGE_SIZE_SELECTOR_WIDTH = 80;
	const fmt = (n: number) => n.toLocaleString();
	const pagesWord = (n: number) => (n === 1 ? 'page' : 'pages');

	const pageSize = $derived(
		pageSizeProp != null && Number.isFinite(pageSizeProp) ? Math.max(1, Math.floor(pageSizeProp)) : 10
	);
	const hasPageSizeOptions = $derived(pageSizeOptions != null && pageSizeOptions.length > 0);
	const hrefPageSize = $derived(pageSizeProp !== undefined || hasPageSizeOptions ? pageSize : undefined);
	const step = $derived(Number.isInteger(stepProp) && stepProp >= 1 ? stepProp : 1);
	const previousLabel = $derived(step > 1 ? `Go back ${fmt(step)} ${pagesWord(step)}` : 'Go to previous page');
	const nextLabel = $derived(step > 1 ? `Go forward ${fmt(step)} ${pagesWord(step)}` : 'Go to next page');

	// While a changeAction runs, the requested page shows (React's useOptimistic).
	let optimisticPage = $state<number | null>(null);
	let pendingActions = 0;
	const currentPage = $derived(optimisticPage ?? page);

	// After a link click, the other links keep counting from the page clicked on until the click is over,
	// so a quick second click doesn't skip ahead.
	let clickedFromPage = $state<number | null>(null);
	const linkPage = $derived(clickedFromPage ?? currentPage);
	let clickOverTimer: ReturnType<typeof setTimeout> | undefined;
	const countFromCurrentPage = () => (clickedFromPage = null);
	$effect(() => () => clearTimeout(clickOverTimer));

	let isPageEntryRejected = $state(false);
	let announcement = $state('');

	const computedTotalPages = $derived(
		totalPagesProp ?? (totalItems != null ? Math.ceil(totalItems / pageSize) : undefined)
	);
	const hasPrevious = $derived(currentPage > 1);
	const hasNext = $derived(computedTotalPages != null ? currentPage < computedTotalPages : (hasMore ?? false));
	const isEmpty = $derived(
		(totalItems != null && totalItems <= 0) || (computedTotalPages != null && computedTotalPages <= 0)
	);

	function handlePageChange(newPage: number) {
		if (isDisabled) return;
		onChange(newPage);
		announcement =
			computedTotalPages != null ? `Page ${fmt(newPage)} of ${fmt(computedTotalPages)}` : `Page ${fmt(newPage)}`;
		if (!changeAction) return;
		optimisticPage = newPage;
		pendingActions += 1;
		Promise.resolve()
			.then(() => changeAction(newPage))
			.finally(() => {
				pendingActions -= 1;
				if (pendingActions === 0) optimisticPage = null;
			});
	}

	const clampPage = (target: number) => {
		const lower = Math.max(target, 1);
		return computedTotalPages != null ? Math.min(lower, computedTotalPages) : lower;
	};

	/** Whether a click on this link navigates the current browsing context. */
	function navigatesHere(e: MouseEvent): boolean {
		const link = e.currentTarget as HTMLElement;
		const target = link.getAttribute('target');
		const modified = e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;
		return !link.matches('a:not([href])') && !modified && (!target || target.toLowerCase() === '_self');
	}

	function controlProps(target: number, isAvailable: boolean) {
		const href = isAvailable && !isDisabled ? getPageHref?.(target, hrefPageSize) : undefined;
		return {
			href,
			onclick: (e: MouseEvent) => {
				if (href != null) {
					if (!navigatesHere(e)) return;
					clickedFromPage = linkPage;
					clearTimeout(clickOverTimer);
					clickOverTimer = setTimeout(countFromCurrentPage, 0);
				}
				handlePageChange(target);
			}
		};
	}

	function handlePageSizeChange(value: string | null) {
		if (value == null) return;
		onPageSizeChange?.(Number(value));
		handlePageChange(1);
	}
	function handleInputCommit(next: number | null) {
		if (isDisabled || next == null || next === currentPage) return;
		handlePageChange(next);
	}

	const rangeStart = $derived((currentPage - 1) * pageSize + 1);
	const rangeEnd = $derived(
		totalItems != null ? Math.min(currentPage * pageSize, totalItems) : currentPage * pageSize
	);
	const isSm = $derived(size === 'sm');
	const hasFirstLast = $derived(
		variant === 'input' ? (hasFirstLastProp ?? true) : variant === 'compact' && hasFirstLastProp === true
	);
	const showFirstLast = $derived(hasFirstLast && computedTotalPages != null);
	const pageRange = $derived(
		variant === 'pages' && computedTotalPages != null
			? generatePageRange(currentPage, computedTotalPages, siblingCount)
			: []
	);

	// A control that swaps between a link and a button (it gains or loses its href) keeps focus.
	let nav: HTMLElement | undefined = $state();
	let focusedKey: string | null = null;
	$effect.pre(() => {
		void currentPage;
		void isDisabled;
		void linkPage;
		const active = document.activeElement as HTMLElement | null;
		focusedKey = nav && active && nav.contains(active) ? (active.dataset.pgKey ?? null) : null;
	});
	$effect(() => {
		void currentPage;
		void isDisabled;
		void linkPage;
		const key = focusedKey;
		focusedKey = null;
		if (!key || !nav) return;
		const active = document.activeElement;
		if (active && active !== document.body) return;
		nav.querySelector<HTMLElement>(`[data-pg-key="${key}"]`)?.focus({ preventScroll: true });
	});

	// Dots: a radio group with a roving tab stop where moving focus selects the page.
	let dotsList: HTMLDivElement | undefined = $state();
	function dotButtons(): HTMLButtonElement[] {
		return dotsList ? Array.from(dotsList.querySelectorAll<HTMLButtonElement>('button[data-page]')) : [];
	}
	function onDotsKeydown(e: KeyboardEvent) {
		const items = dotButtons();
		const index = items.indexOf(document.activeElement as HTMLButtonElement);
		if (index < 0 || items.length === 0) return;
		const rtl = dotsList ? getComputedStyle(dotsList).direction === 'rtl' : false;
		let next: number | null = null;
		if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = index + (e.key === 'ArrowRight' && rtl ? -1 : 1);
		else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = index + (e.key === 'ArrowLeft' && rtl ? 1 : -1);
		else if (e.key === 'Home') next = 0;
		else if (e.key === 'End') next = items.length - 1;
		if (next == null) return;
		e.preventDefault();
		items[(next + items.length) % items.length].focus();
	}
	function onDotsFocusIn(e: FocusEvent) {
		if (isDisabled) return;
		const focused = (e.target as HTMLElement | null)?.closest<HTMLElement>('button[data-page]');
		if (!focused) return;
		const nextPage = Number(focused.dataset.page);
		if (Number.isFinite(nextPage) && nextPage !== currentPage) handlePageChange(nextPage);
	}
</script>

{#snippet arrow(key: string, icon: 'chevronsLeft' | 'chevronLeft' | 'chevronRight' | 'chevronsRight', text: string, target: number, available: boolean, edge?: 'first' | 'last', extra?: string)}
	<Button
		{...controlProps(target, available)}
		label={text}
		tooltip={isDisabled || !available ? undefined : text}
		variant="ghost"
		size={size}
		{icon}
		isIconOnly
		isDisabled={isDisabled || !available}
		class={['pg-arrow', extra].filter(Boolean).join(' ')}
		data-pg-key={key}
		data-first={edge === 'first' ? '' : undefined}
		data-last={edge === 'last' ? '' : undefined}
	/>
{/snippet}

{#if !isEmpty}
	<nav
		bind:this={nav}
		{...rest}
		class={['astryx-pagination', className].filter(Boolean).join(' ')}
		data-variant={variant}
		data-size={size}
		aria-label={label}
		data-testid={testId}
	>
		{#if hasPageSizeOptions && pageSizeOptions}
			<div class="page-size">
				<Selector
					label="Items per page"
					isLabelHidden
					options={pageSizeOptions.map((opt) => String(opt))}
					value={String(pageSize)}
					onChange={handlePageSizeChange}
					size={size}
					{isDisabled}
					width={PAGE_SIZE_SELECTOR_WIDTH}
				/>
			</div>
		{/if}
		<div
			class="controls"
			onkeydowncapture={countFromCurrentPage}
			onpointerdowncapture={countFromCurrentPage}
		>
			{#if showFirstLast}
				{@render arrow('first', 'chevronsLeft', 'Go to first page', 1, hasPrevious, 'first', variant === 'compact' ? 'compact-first' : undefined)}
			{/if}
			{@render arrow('previous', 'chevronLeft', previousLabel, clampPage(linkPage - step), hasPrevious, showFirstLast ? undefined : 'first')}

			{#if variant === 'pages' && computedTotalPages != null}
				{#each pageRange as item, index (item === '...' ? `ellipsis-${pageRange[index - 1]}-${pageRange[index + 1]}` : item)}
					{#if item === '...'}
						<span class="ellipsis" aria-hidden="true">…</span>
					{:else}
						{@const isActive = item === currentPage}
						<Button
							{...controlProps(item, true)}
							label={`Go to page ${fmt(item)}`}
							variant="ghost"
							size={size}
							{isDisabled}
							aria-current={isActive ? 'page' : undefined}
							class={isActive ? 'pg-page pg-active' : 'pg-page'}
							data-pg-key={`page-${item}`}
							data-selected={isActive ? '' : undefined}
						>
							{item}
						</Button>
					{/if}
				{/each}
			{:else if variant === 'count' && totalItems != null}
				<span class="info">
					<Text type="body" size="sm" color="secondary">
						{fmt(rangeStart)}–{fmt(rangeEnd)} of {fmt(totalItems)}
					</Text>
				</span>
			{:else if variant === 'compact' && computedTotalPages != null}
				<span class="info">
					<Text type="body" size="sm" color="secondary">
						Page {fmt(currentPage)} of {fmt(computedTotalPages)}
					</Text>
				</span>
			{:else if variant === 'dots' && computedTotalPages != null}
				<div
					bind:this={dotsList}
					class="dots"
					role="radiogroup"
					aria-label="Page indicators"
					tabindex="-1"
					onkeydown={onDotsKeydown}
					onfocusin={onDotsFocusIn}
				>
					{#each { length: computedTotalPages } as _, i (i)}
						{@const isActive = i + 1 === currentPage}
						<button
							type="button"
							role="radio"
							class="dot"
							class:active={isActive}
							class:disabled={isDisabled}
							data-page={i + 1}
							aria-label={`Page ${fmt(i + 1)}`}
							aria-checked={isActive}
							aria-disabled={isDisabled || undefined}
							tabindex={isActive ? 0 : -1}
							onmousedown={(e) => e.preventDefault()}
							onclick={(e) => e.currentTarget.focus()}
						></button>
					{/each}
				</div>
			{:else if variant === 'input'}
				<span class="input-group">
					<span class="input-label" aria-hidden="true">{pageLabel}</span>
					<NumberInput
						label="Go to page"
						isLabelHidden
						value={currentPage}
						onChange={handleInputCommit}
						min={1}
						max={computedTotalPages ?? null}
						isIntegerOnly
						size={size}
						onEntryErrorChange={(error) => (isPageEntryRejected = error != null)}
						width={isPageEntryRejected
							? `calc(var(--size-element-${size}) + var(--spacing-10))`
							: `var(--size-element-${size})`}
						isDisabled={isDisabled || computedTotalPages == null}
						data-testid={testId != null ? `${testId}-input` : undefined}
					/>
					{#if computedTotalPages != null}
						<span class="input-total">/ {fmt(computedTotalPages)}</span>
					{/if}
				</span>
			{/if}

			{@render arrow('next', 'chevronRight', nextLabel, clampPage(linkPage + step), hasNext, showFirstLast ? undefined : 'last')}
			{#if showFirstLast}
				{@render arrow('last', 'chevronsRight', 'Go to last page', computedTotalPages ?? currentPage, hasNext, 'last', variant === 'compact' ? 'compact-last' : undefined)}
			{/if}
		</div>
		<VisuallyHidden><span aria-live="polite" aria-atomic="true">{announcement}</span></VisuallyHidden>
	</nav>
{/if}

<style>
	@layer astryx-base {
		.astryx-pagination {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			justify-content: space-between;
			gap: var(--spacing-4);
		}
		.controls {
			display: flex;
			flex-wrap: wrap;
			align-items: center;
			gap: var(--spacing-1);
			min-width: 0;
		}
		.controls :global(.compact-first) { margin-inline-end: calc(-1 * var(--spacing-1)); }
		.controls :global(.compact-last) { margin-inline-start: calc(-1 * var(--spacing-1)); }
		/* Astryx sizes the arrow icons one step up from the Button default at "md". */
		.astryx-pagination[data-size='md'] :global(.pg-arrow .icon-wrapper) { width: 1.25rem; height: 1.25rem; }
		.astryx-pagination[data-size='md'] :global(.pg-arrow .icon) { --_s: 1.25rem; }
		.astryx-pagination:dir(rtl) :global(.pg-arrow svg) { transform: scaleX(-1); }
		.controls :global(.astryx-button.pg-active) {
			background-color: var(--color-neutral);
			font-weight: var(--font-weight-medium);
		}
		.ellipsis {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			min-width: var(--size-element-md);
			min-height: var(--size-element-md);
			color: var(--color-text-secondary);
			font-size: var(--text-label-size);
			line-height: var(--text-label-leading);
			user-select: none;
		}
		[data-size='sm'] .ellipsis {
			min-width: var(--size-element-sm);
			min-height: var(--size-element-sm);
			font-size: var(--text-supporting-size);
			line-height: var(--text-supporting-leading);
		}
		.info {
			display: flex;
			align-items: center;
			white-space: nowrap;
		}
		.dots {
			display: flex;
			align-items: center;
			gap: var(--spacing-1);
		}
		.dots:focus { outline: none; }
		.dot {
			width: var(--spacing-2);
			height: var(--spacing-2);
			border: 0;
			padding: 0;
			border-radius: 50%;
			background-color: var(--color-neutral);
			cursor: pointer;
			transition: background-color var(--duration-fast) var(--ease-standard);
		}
		.dot:focus-visible {
			outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color);
			outline-offset: var(--focus-outline-offset);
		}
		[data-size='sm'] .dot {
			width: var(--spacing-1-5);
			height: var(--spacing-1-5);
		}
		.dot.active { background-color: var(--color-accent); }
		.dot.disabled {
			cursor: default;
			opacity: 0.5;
		}
		.input-group {
			display: inline-flex;
			align-items: center;
			gap: var(--spacing-1);
			white-space: nowrap;
		}
		.input-label,
		.input-total {
			color: var(--color-text-secondary);
			font-size: var(--text-label-size);
			line-height: var(--text-label-leading);
			user-select: none;
		}
		[data-size='sm'] :is(.input-label, .input-total) {
			font-size: var(--text-supporting-size);
			line-height: var(--text-supporting-leading);
		}
		.page-size {
			display: flex;
			align-items: center;
			gap: var(--spacing-2);
		}
	}
</style>
