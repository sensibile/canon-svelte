import { getContext, setContext } from 'svelte';

export interface MetadataListLabelConfig {
	position?: 'start' | 'top';
	width?: number | string;
}
export interface MetadataListContext {
	readonly labelPosition: 'start' | 'top';
	readonly orientation: 'vertical' | 'horizontal';
}
const KEY = Symbol('astryx-metadata-list');
export const setMetadataListContext = (ctx: MetadataListContext) => setContext(KEY, ctx);
// Scoped to one level: a nested list sets its own context.
export const getMetadataListContext = () => getContext<MetadataListContext | undefined>(KEY);
