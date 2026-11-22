<!--
  Port of Astryx `CommandPalette` (packages/core/src/CommandPalette/CommandPalette.tsx), MIT,
  Meta Platforms, Inc. A modal search-and-pick dialog: a combobox input over a listbox of results
  from `searchSource` (bootstrap entries for an empty query), grouped by `auxiliaryData.group`, and a
  footer of keyboard hints. Arrow keys and Page Up/Down move the highlight, Enter or a click picks
  the item (it becomes `value`) and closes; Escape or a backdrop press closes. While a search runs,
  the current results are filtered by label and a spinner shows; the result count is announced.
  Port change: closing it by setting `isOpen` to false also resets the query.
  Not yet ported: `isInline`, the delayed "Loading" announcement, and React transitions (a newer
  query simply supersedes an older one).
-->
<script lang="ts" generics="T extends SearchableItem = SearchableItem">
	import { untrack, type Snippet } from 'svelte';
	import type { HTMLDialogAttributes } from 'svelte/elements';
	import Dialog from '../Dialog/Dialog.svelte';
	import VisuallyHidden from '../VisuallyHidden/VisuallyHidden.svelte';
	import CommandPaletteInput from './CommandPaletteInput.svelte';
	import CommandPaletteList from './CommandPaletteList.svelte';
	import CommandPaletteItem from './CommandPaletteItem.svelte';
	import CommandPaletteGroup from './CommandPaletteGroup.svelte';
	import CommandPaletteEmpty from './CommandPaletteEmpty.svelte';
	import CommandPaletteFooter from './CommandPaletteFooter.svelte';
	import { setCommandPaletteContext, type CommandPaletteSelectable } from './context.js';
	import type { SearchableItem, SearchSource } from '../Typeahead/types.js';
	import type { SizeValue } from '../../types.js';

	interface Props extends Omit<HTMLDialogAttributes, 'open' | 'onchange'> {
		isOpen: boolean;
		onOpenChange: (isOpen: boolean) => void;
		searchSource: SearchSource<T>;
		/** Replaces the default CommandPaletteInput. */
		input?: Snippet;
		/** Replaces the default CommandPaletteFooter. */
		footer?: Snippet;
		/** Renders an item's content; the default is its label. */
		renderItem?: Snippet<[T, boolean]>;
		/** Shown when a search finds nothing. Defaults to "No results". */
		emptySearchText?: string | Snippet;
		/** Shown when there are no bootstrap entries. Defaults to "Type to search". */
		emptyBootstrapText?: string | Snippet;
		/** The picked item's id. */
		value?: string;
		onValueChange?: (value: string) => void;
		/** The dialog's accessible name; defaults to "Command palette". */
		label?: string;
		width?: SizeValue;
		maxHeight?: SizeValue;
	}

	let {
		isOpen,
		onOpenChange,
		searchSource,
		input,
		footer,
		renderItem,
		emptySearchText = 'No results',
		emptyBootstrapText = 'Type to search',
		value: controlledValue,
		onValueChange,
		label = 'Command palette',
		width = 640,
		maxHeight = 480,
		class: className,
		...rest
	}: Props = $props();

	const uid = $props.id();
	const listId = `${uid}-list`;

	let typedSearch = $state('');
	let search = $state('');
	let results: T[] = $state([]);
	let isBusy = $state(false);
	let highlightedIndex = $state(-1);
	let internalValue = $state('');
	let announcement = $state('');
	let version = 0;

	const value = $derived(controlledValue ?? internalValue);
	function setValue(next: string) {
		if (controlledValue === undefined) internalValue = next;
		onValueChange?.(next);
	}

	function getGroup(item: SearchableItem): string | undefined {
		const aux = item.auxiliaryData as Record<string, unknown> | undefined;
		return typeof aux?.group === 'string' ? aux.group : undefined;
	}
	/** The results in display order: grouped ones by first appearance of their group, then the rest. */
	const sections = $derived.by(() => {
		const order: string[] = [];
		const groups = new Map<string, T[]>();
		const ungrouped: T[] = [];
		for (const item of results) {
			const group = getGroup(item);
			if (group == null) {
				ungrouped.push(item);
				continue;
			}
			if (!groups.has(group)) {
				order.push(group);
				groups.set(group, []);
			}
			groups.get(group)!.push(item);
		}
		return { grouped: order.map((heading) => ({ heading, items: groups.get(heading)! })), ungrouped };
	});
	const ordered = $derived([...sections.grouped.flatMap((g) => g.items), ...sections.ungrouped]);
	const selectableItems: CommandPaletteSelectable[] = $derived(ordered.map((item) => ({ value: item.id, label: item.label })));
	const getItemId = (index: number) => `${listId}-item-${index}`;

	/** Clear the query, results and pending searches, as on close. */
	function resetState() {
		version++;
		typedSearch = '';
		search = '';
		results = [];
		isBusy = false;
		highlightedIndex = -1;
		if (controlledValue === undefined) internalValue = '';
		searchSource.cancel?.();
		announcement = '';
	}
	function handleClose() {
		resetState();
		onOpenChange(false);
	}

	function selectItem(itemValue: string) {
		setValue(itemValue);
	}

	async function runSearch(query: string) {
		searchSource.cancel?.();
		const v = ++version;
		highlightedIndex = -1;
		isBusy = true;
		const isBootstrap = query === '';
		// While the search runs, narrow the current results by label.
		if (!isBootstrap && results.length > 0) {
			const lower = query.toLowerCase().trim();
			results = results.filter((item) => item.label.toLowerCase().includes(lower));
		}
		let items: T[] = [];
		try {
			items = await Promise.resolve(isBootstrap ? searchSource.bootstrap() : searchSource.search(query));
		} catch {
			/* a failed search shows no results */
		}
		if (v !== version) return;
		search = query;
		results = items;
		isBusy = false;
		if (isBootstrap) announcement = '';
		else if (items.length > 0) announcement = `${items.length} ${items.length === 1 ? 'result' : 'results'}`;
		if (isBootstrap && value) {
			const index = ordered.findIndex((item) => item.id === value);
			if (index >= 0) highlightedIndex = index;
		}
	}

	// Bootstrap on open; a new source while open re-runs the current query.
	let openSource: SearchSource<T> | null = null;
	$effect(() => {
		const source = searchSource;
		if (!isOpen) {
			// Port change: an owner-driven close resets the palette too.
			if (openSource !== null) untrack(resetState);
			openSource = null;
			return;
		}
		const isNewSourceWhileOpen = openSource !== null && openSource !== source;
		openSource = source;
		// Run untracked, so the query and results it reads don't re-run this effect.
		untrack(() => void runSearch(isNewSourceWhileOpen ? typedSearch : ''));
		return () => source.cancel?.();
	});

	function setHighlight(index: number, scroll = false) {
		highlightedIndex = index;
		if (scroll && index >= 0) {
			queueMicrotask(() => document.getElementById(getItemId(index))?.scrollIntoView?.({ block: 'nearest' }));
		}
	}

	function onKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape' || e.key === 'Home' || e.key === 'End' || e.key === ' ') return;
		if (e.key === 'Enter') {
			e.preventDefault();
			const item = selectableItems[highlightedIndex];
			if (item && !item.disabled) {
				selectItem(item.value);
				handleClose();
			}
			return;
		}
		const enabled = selectableItems.map((item, i) => (item.disabled ? -1 : i)).filter((i) => i >= 0);
		switch (e.key) {
			case 'ArrowDown': {
				e.preventDefault();
				const pos = Math.min(enabled.indexOf(highlightedIndex) + 1, enabled.length - 1);
				setHighlight(enabled[pos] ?? highlightedIndex, true);
				break;
			}
			case 'ArrowUp': {
				e.preventDefault();
				const pos = Math.max(enabled.indexOf(highlightedIndex) - 1, 0);
				setHighlight(enabled[pos] ?? highlightedIndex, true);
				break;
			}
			case 'PageUp':
				e.preventDefault();
				if (enabled.length > 0) setHighlight(enabled[0], true);
				break;
			case 'PageDown':
				e.preventDefault();
				if (enabled.length > 0) setHighlight(enabled[enabled.length - 1], true);
				break;
			case 'Tab':
				highlightedIndex = -1;
				break;
		}
	}

	function onListMouseOver(e: MouseEvent) {
		const option = (e.target as HTMLElement).closest?.('[role="option"]');
		if (!option || option.getAttribute('aria-disabled') === 'true') return;
		const itemValue = option.getAttribute('data-value');
		const index = itemValue == null ? -1 : selectableItems.findIndex((item) => item.value === itemValue);
		if (index >= 0) highlightedIndex = index;
	}

	setCommandPaletteContext({
		get search() {
			return typedSearch;
		},
		setSearch(query: string) {
			typedSearch = query;
			void runSearch(query);
		},
		get value() {
			return value;
		},
		setValue,
		listId,
		get highlightedIndex() {
			return highlightedIndex;
		},
		setHighlightedIndex: (index: number) => (highlightedIndex = index),
		getItemId,
		get selectableItems() {
			return selectableItems;
		},
		get searchResults() {
			return results;
		},
		selectItem,
		onKeyDown,
		onClose: handleClose,
		get isOpen() {
			return isOpen;
		},
		get isBusy() {
			return isBusy;
		}
	});

	const hasQuery = $derived(typedSearch !== '');
	const showEmptyBootstrap = $derived(!hasQuery && results.length === 0);
	const showEmptySearch = $derived(hasQuery && search !== '' && results.length === 0);
	let emptyElement: HTMLDivElement | undefined = $state();
	// Announce the "no results" text once a search settles on it.
	$effect(() => {
		if (showEmptySearch && !isBusy && emptyElement) {
			void search;
			announcement = emptyElement.textContent?.trim() ?? '';
		}
	});
</script>

{#snippet text(content: string | Snippet)}
	{#if typeof content === 'function'}{@render content()}{:else}{content}{/if}
{/snippet}

{#snippet item(entry: T)}
	<CommandPaletteItem value={entry.id}>
		{#if renderItem}{@render renderItem(entry, entry.id === value)}{:else}{entry.label}{/if}
	</CommandPaletteItem>
{/snippet}

<Dialog
	{...rest}
	{isOpen}
	onOpenChange={(open) => (open ? onOpenChange(true) : handleClose())}
	{width}
	{maxHeight}
	purpose="info"
	padding={0}
	aria-label={label}
	class={['astryx-command-palette', className]}
>
	<div class="header">
		{#if input}{@render input()}{:else}<CommandPaletteInput />{/if}
	</div>
	<div class="content">
		<CommandPaletteList onmouseover={onListMouseOver}>
			{#if showEmptyBootstrap}
				<CommandPaletteEmpty bind:element={emptyElement}>{@render text(emptyBootstrapText)}</CommandPaletteEmpty>
			{:else if showEmptySearch}
				<CommandPaletteEmpty bind:element={emptyElement}>{@render text(emptySearchText)}</CommandPaletteEmpty>
			{:else if results.length === 0}
				<CommandPaletteEmpty aria-hidden="true">{' '}</CommandPaletteEmpty>
			{:else}
				{#each sections.grouped as group (group.heading)}
					<CommandPaletteGroup heading={group.heading}>
						{#each group.items as entry (entry.id)}{@render item(entry)}{/each}
					</CommandPaletteGroup>
				{/each}
				{#each sections.ungrouped as entry (entry.id)}{@render item(entry)}{/each}
			{/if}
		</CommandPaletteList>
	</div>
	<div class="footer">
		{#if footer}{@render footer()}{:else}<CommandPaletteFooter />{/if}
	</div>
	<VisuallyHidden aria-live="polite" aria-atomic="true">{announcement}</VisuallyHidden>
</Dialog>

<style>
	@layer astryx-base {
		.header { flex-shrink: 0; border-block-end: var(--border-width) solid var(--color-border); }
		.content { display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; overflow: hidden; }
		.footer { flex-shrink: 0; border-block-start: var(--border-width) solid var(--color-border); }
	}
</style>
