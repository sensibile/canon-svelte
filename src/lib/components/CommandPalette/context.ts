// Port of Astryx `CommandPaletteContext` (packages/core/src/CommandPalette/CommandPaletteContext.ts), MIT, Meta Platforms, Inc.
import { getContext, setContext } from 'svelte';
import type { SearchableItem } from '../Typeahead/types.js';

export interface CommandPaletteSelectable {
	value: string;
	label?: string;
	disabled?: boolean;
}

/** Read by the palette's parts; the fields are live (getters), so read them where they're used. */
export interface CommandPaletteContextValue {
	readonly search: string;
	setSearch: (search: string) => void;
	readonly value: string;
	setValue: (value: string) => void;
	readonly listId: string;
	readonly highlightedIndex: number;
	setHighlightedIndex: (index: number) => void;
	getItemId: (index: number) => string;
	readonly selectableItems: CommandPaletteSelectable[];
	readonly searchResults: SearchableItem[];
	selectItem: (value: string) => void;
	onKeyDown: (e: KeyboardEvent) => void;
	onClose: () => void;
	readonly isOpen: boolean;
	readonly isBusy: boolean;
}

const KEY = Symbol('astryx-command-palette');

export function setCommandPaletteContext(ctx: CommandPaletteContextValue) {
	setContext(KEY, ctx);
}
/** The enclosing CommandPalette's state, or null outside one. */
export function getCommandPaletteContext(): CommandPaletteContextValue | null {
	return getContext<CommandPaletteContextValue | undefined>(KEY) ?? null;
}
