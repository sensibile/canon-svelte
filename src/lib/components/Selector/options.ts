// Port of Astryx Selector option helpers (packages/core/src/Selector/types.ts, optionShape.ts,
// selectableOptionEntries.ts and the filter/highlight helpers in Selector.tsx), MIT, Meta Platforms, Inc.
import type { IconComponent } from '../Icon/Icon.svelte';
import type { IconName } from '../Icon/defaultIcons.js';

export interface SelectorOptionData {
	value: string;
	/** Shown text; defaults to `value`. */
	label?: string;
	description?: string;
	disabled?: boolean;
	icon?: IconName | IconComponent;
}
export interface SelectorDivider {
	type: 'divider';
}
export interface SelectorSection {
	type: 'section';
	title?: string;
	options: (string | SelectorOptionData)[];
}
export type SelectorOptionType = string | SelectorOptionData | SelectorDivider | SelectorSection;
export type IndicatorPosition = 'start' | 'end';

export function isOptionData(option: SelectorOptionType): option is SelectorOptionData | string {
	return typeof option === 'string' || !('type' in option);
}
export function isDivider(option: SelectorOptionType): option is SelectorDivider {
	return typeof option === 'object' && 'type' in option && option.type === 'divider';
}
export function isSection(option: SelectorOptionType): option is SelectorSection {
	return typeof option === 'object' && 'type' in option && option.type === 'section';
}
export function normalizeOption(option: string | SelectorOptionData): SelectorOptionData {
	if (typeof option === 'string') return { value: option, label: option };
	return { ...option, label: option.label ?? option.value };
}

/** Every selectable option, flattened out of sections, in display order. */
export function getSelectableOptions(options: SelectorOptionType[]): SelectorOptionData[] {
	const result: SelectorOptionData[] = [];
	for (const option of options) {
		if (isOptionData(option)) result.push(normalizeOption(option));
		else if (isSection(option)) for (const opt of option.options) result.push(normalizeOption(opt));
	}
	return result;
}

export function optionMatchesQuery(option: SelectorOptionData, query: string): boolean {
	if (!query) return true;
	return (option.label ?? option.value).toLowerCase().includes(query.toLowerCase());
}

export type OptionRow =
	| { kind: 'option'; item: SelectorOptionData; index: number }
	| { kind: 'divider'; key: string }
	| { kind: 'section'; key: string; title?: string; rows: { item: SelectorOptionData; index: number }[] };

/**
 * The rows to render for `options` filtered by `query`. `index` is the position in the flat list
 * of matching options, which keyboard navigation and option ids use. Dividers are dropped while
 * searching, and so are sections with no matches.
 */
export function buildOptionRows(options: SelectorOptionType[], query: string): OptionRow[] {
	const rows: OptionRow[] = [];
	let index = 0;
	options.forEach((option, i) => {
		if (isDivider(option)) {
			if (!query) rows.push({ kind: 'divider', key: `divider-${i}` });
		} else if (isSection(option)) {
			const sectionRows: { item: SelectorOptionData; index: number }[] = [];
			for (const opt of option.options) {
				const item = normalizeOption(opt);
				if (optionMatchesQuery(item, query)) sectionRows.push({ item, index: index++ });
			}
			if (sectionRows.length > 0) rows.push({ kind: 'section', key: `section-${i}`, title: option.title, rows: sectionRows });
		} else {
			const item = normalizeOption(option);
			if (optionMatchesQuery(item, query)) rows.push({ kind: 'option', item, index: index++ });
		}
	});
	return rows;
}

/** The first (or last) enabled index, or -1. */
export function enabledEdgeIndex(items: readonly { disabled?: boolean }[], fromEnd: boolean): number {
	if (fromEnd) {
		for (let i = items.length - 1; i >= 0; i--) if (!items[i].disabled) return i;
	} else {
		for (let i = 0; i < items.length; i++) if (!items[i].disabled) return i;
	}
	return -1;
}

/** Steps from `index` to the next enabled item in `dir`, stopping at the ends. */
export function stepEnabled(items: readonly { disabled?: boolean }[], index: number, dir: 1 | -1): number {
	for (let i = index + dir; i >= 0 && i < items.length; i += dir) if (!items[i].disabled) return i;
	return index;
}

/**
 * Where a highlight at `index` in `previous` should land in `next`: the same option if it's still
 * there and enabled, else the nearest surviving option after it, then before it.
 */
export function followHighlight(
	previous: readonly { value: string; disabled?: boolean }[],
	next: readonly { value: string; disabled?: boolean }[],
	index: number
): number {
	const enabledIndexOf = (value: string | undefined) =>
		value == null ? -1 : next.findIndex((item) => item.value === value && item.disabled !== true);
	const stayed = enabledIndexOf(previous[index]?.value);
	if (stayed >= 0) return stayed;
	for (let after = index + 1; after < previous.length; after++) {
		const found = enabledIndexOf(previous[after]?.value);
		if (found >= 0) return found;
	}
	for (let before = Math.min(index, previous.length) - 1; before >= 0; before--) {
		const found = enabledIndexOf(previous[before]?.value);
		if (found >= 0) return found;
	}
	return -1;
}

/** True for key presses that are shortcuts rather than typed characters. */
export function isShortcutChord(e: KeyboardEvent): boolean {
	return e.ctrlKey || e.metaKey || e.altKey;
}

/** A label-prefix typeahead, as used by closed selects and listboxes. */
export function createTypeahead(timeoutMs = 500) {
	let buffer = '';
	let timer: ReturnType<typeof setTimeout> | undefined;
	return {
		/** Returns the index to move to, or -1. `current` is where the search starts. */
		match(key: string, labels: string[], isDisabled: (i: number) => boolean, current: number): number {
			clearTimeout(timer);
			timer = setTimeout(() => (buffer = ''), timeoutMs);
			const lower = key.toLowerCase();
			// Repeating one character cycles through the options that start with it.
			const cycling = buffer.length > 0 && [...buffer].every((c) => c === lower);
			buffer += lower;
			const needle = cycling ? lower : buffer;
			const start = cycling || buffer.length === 1 ? current + 1 : Math.max(current, 0);
			for (let k = 0; k < labels.length; k++) {
				const i = (((start + k) % labels.length) + labels.length) % labels.length;
				if (!isDisabled(i) && labels[i].toLowerCase().startsWith(needle)) return i;
			}
			return -1;
		},
		get isActive() {
			return buffer !== '';
		},
		reset() {
			clearTimeout(timer);
			buffer = '';
		}
	};
}
