// Port of Astryx Typeahead types (packages/core/src/Typeahead/types.ts), MIT, Meta Platforms, Inc.

export interface SearchableItem<TAuxData = unknown> {
	id: string;
	label: string;
	auxiliaryData?: TAuxData;
}

/** Lets a source stream results: call `update` with each longer list as it arrives. */
export interface SearchContext<T extends SearchableItem = SearchableItem> {
	update(items: T[]): void;
}

export interface SearchSource<T extends SearchableItem = SearchableItem> {
	search(query: string, context?: SearchContext<T>): Promise<T[]> | T[];
	/** The entries shown for an empty query when `hasEntriesOnFocus` is set. */
	bootstrap(): Promise<T[]> | T[];
	cancel?(): void;
}
