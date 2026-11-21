// Port of Astryx Collapsible/CollapsibleGroupContext.tsx, MIT, Meta Platforms, Inc.
import { getContext, setContext } from 'svelte';

export type CollapsibleGroupDensity = 'compact' | 'balanced' | 'spacious';
export type CollapsibleChevronPosition = 'start' | 'end';

export interface CollapsibleGroupContext {
	isOpen(value: string): boolean;
	toggle(value: string): void;
	readonly hasDividers: boolean;
	readonly density: CollapsibleGroupDensity | null;
	readonly chevronPosition: CollapsibleChevronPosition | null;
}
const KEY = Symbol('astryx-collapsible-group');
export const setCollapsibleGroupContext = (ctx: CollapsibleGroupContext | null) => setContext(KEY, ctx);
export const getCollapsibleGroupContext = () => getContext<CollapsibleGroupContext | null | undefined>(KEY) ?? null;
