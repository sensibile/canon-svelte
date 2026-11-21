// Port of Astryx `createStaticSource` (packages/core/src/Typeahead/createStaticSource.ts), MIT, Meta Platforms, Inc.
import type { SearchableItem, SearchSource } from './types.js';

export interface CreateStaticSourceOptions<T extends SearchableItem = SearchableItem> {
	/** Extra strings an item also matches on. */
	keywords?: (item: T) => string[];
}

/** A search source over a fixed list: case-insensitive substring match on label and keywords. */
export function createStaticSource<T extends SearchableItem>(
	items: T[],
	options?: CreateStaticSourceOptions<T>
): SearchSource<T> {
	const getKeywords = options?.keywords;
	return {
		search(query: string): T[] {
			const lower = query.toLowerCase().trim();
			if (lower === '') return items;
			return items.filter(
				(item) =>
					item.label.toLowerCase().includes(lower) ||
					(getKeywords?.(item).some((kw) => kw.toLowerCase().includes(lower)) ?? false)
			);
		},
		bootstrap(): T[] {
			return items;
		}
	};
}
