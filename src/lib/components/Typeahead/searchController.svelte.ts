// Internal: the search-and-results state behind Typeahead and Tokenizer. A reduced port of the
// search flow in Astryx's BaseTypeahead (packages/core/src/Typeahead/BaseTypeahead.tsx), MIT,
// Meta Platforms, Inc.: debounced queries, a minimum query length, bootstrap entries for an
// empty query, stale-result guarding, streamed updates, and a result cap.
import type { SearchableItem, SearchSource } from './types.js';

export interface SearchOptions<T extends SearchableItem> {
	source: SearchSource<T>;
	debounceMs: number;
	minQueryLength: number;
	hasEntriesOnFocus: boolean;
	maxMenuItems: number;
	/** Drops items that shouldn't be offered, e.g. ones already chosen. */
	exclude?: (item: T) => boolean;
	announce: (message: string) => void;
}

export function isBelowMinQueryLength(query: string, minQueryLength: number): boolean {
	const length = query.trim().length;
	return length > 0 && length < minQueryLength;
}

export class SearchController<T extends SearchableItem> {
	results = $state<T[]>([]);
	isLoading = $state(false);
	/** True once a search for the current query has answered, so "no results" can show. */
	hasSearched = $state(false);
	isOpen = $state(false);
	highlightedIndex = $state(-1);
	/** A debounced search is waiting to run. */
	isDebouncing = $state(false);

	#gen = 0;
	#timer: ReturnType<typeof setTimeout> | undefined;
	#options: () => SearchOptions<T>;

	constructor(options: () => SearchOptions<T>) {
		this.#options = options;
	}

	get isPending() {
		return this.isDebouncing || this.isLoading;
	}

	#cancelPending() {
		clearTimeout(this.#timer);
		this.#timer = undefined;
		this.isDebouncing = false;
		this.#gen++;
		this.#options().source.cancel?.();
	}

	#apply(list: T[], gen: number, query: string, isFinal: boolean) {
		if (gen !== this.#gen) return;
		const { maxMenuItems, exclude, announce } = this.#options();
		const shown = (exclude ? list.filter((i) => !exclude(i)) : list).slice(0, maxMenuItems);
		const previous = this.results;
		this.results = shown;
		// Keep the highlight on the same item across streamed updates; else start at the top.
		const keptId = previous[this.highlightedIndex]?.id;
		const kept = keptId == null ? -1 : shown.findIndex((i) => i.id === keptId);
		this.highlightedIndex = kept >= 0 ? kept : shown.length > 0 ? 0 : -1;
		if (isFinal) {
			this.isLoading = false;
			this.hasSearched = query !== '' || shown.length > 0;
			if (query !== '') announce(shown.length > 0 ? `${shown.length} ${shown.length === 1 ? 'result' : 'results'}` : '');
		}
		this.isOpen = shown.length > 0 || (isFinal && query !== '');
	}

	async #run(query: string) {
		const { source } = this.#options();
		source.cancel?.();
		const gen = ++this.#gen;
		this.isLoading = true;
		let answer: T[] | Promise<T[]>;
		try {
			answer =
				query === ''
					? source.bootstrap()
					: source.search(query, { update: (items) => this.#apply(items, gen, query, false) });
		} catch {
			answer = [];
		}
		let list: T[] = [];
		try {
			list = await answer;
		} catch {
			list = [];
		}
		this.#apply(list, gen, query, true);
	}

	/** Call on every query edit. */
	queryChanged(query: string) {
		const { debounceMs, minQueryLength, hasEntriesOnFocus, announce } = this.#options();
		clearTimeout(this.#timer);
		this.#timer = undefined;
		this.isDebouncing = false;
		if ((query === '' && !hasEntriesOnFocus) || isBelowMinQueryLength(query, minQueryLength)) {
			this.#cancelPending();
			this.results = [];
			this.highlightedIndex = -1;
			this.hasSearched = false;
			this.isLoading = false;
			this.isOpen = false;
			announce('');
			return;
		}
		if (debounceMs <= 0) {
			void this.#run(query);
			return;
		}
		this.isDebouncing = true;
		this.#timer = setTimeout(() => {
			this.#timer = undefined;
			this.isDebouncing = false;
			void this.#run(query);
		}, debounceMs);
	}

	/** Searches now, skipping the debounce (ArrowDown on a closed list, focus with entries). */
	openFor(query: string) {
		const { minQueryLength, hasEntriesOnFocus } = this.#options();
		if (query === '' ? !hasEntriesOnFocus : isBelowMinQueryLength(query, minQueryLength)) return;
		clearTimeout(this.#timer);
		this.#timer = undefined;
		this.isDebouncing = false;
		void this.#run(query);
	}

	close() {
		this.isOpen = false;
		this.highlightedIndex = -1;
	}

	/** Closes and forgets results, e.g. after a pick. */
	reset() {
		this.#cancelPending();
		this.results = [];
		this.isLoading = false;
		this.hasSearched = false;
		this.close();
	}

	/** Listbox keys while open; returns true when handled. */
	keydown(e: KeyboardEvent, onSelect: (item: T) => void): boolean {
		const n = this.results.length;
		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				if (n > 0) this.highlightedIndex = this.highlightedIndex < n - 1 ? this.highlightedIndex + 1 : 0;
				return true;
			case 'ArrowUp':
				e.preventDefault();
				if (n > 0) this.highlightedIndex = this.highlightedIndex > 0 ? this.highlightedIndex - 1 : n - 1;
				return true;
			case 'Home':
				e.preventDefault();
				if (n > 0) this.highlightedIndex = 0;
				return true;
			case 'End':
				e.preventDefault();
				if (n > 0) this.highlightedIndex = n - 1;
				return true;
			case 'Enter': {
				e.preventDefault();
				const item = this.results[this.highlightedIndex];
				if (item) onSelect(item);
				return true;
			}
			case 'Escape':
				e.preventDefault();
				this.close();
				return true;
			case 'Tab':
				this.close();
				return false;
		}
		return false;
	}

	destroy() {
		this.#cancelPending();
	}
}
