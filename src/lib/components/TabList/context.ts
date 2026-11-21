import { getContext, setContext } from 'svelte';

export type TabListSize = 'sm' | 'md' | 'lg';

export interface TabListContext {
	readonly value: string;
	readonly size: TabListSize;
	readonly layout: 'hug' | 'fill';
	readonly pattern: 'tabs' | 'nav';
	select: (value: string) => void;
}
const KEY = Symbol('astryx-tab-list');

export function setTabListContext(ctx: TabListContext) {
	setContext(KEY, ctx);
}
export function getTabListContext(): TabListContext {
	const ctx = getContext<TabListContext | undefined>(KEY);
	if (!ctx) throw new Error('Tab must be used inside a TabList');
	return ctx;
}
