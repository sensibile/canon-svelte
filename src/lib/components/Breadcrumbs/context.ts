import { getContext, setContext } from 'svelte';

export type BreadcrumbsVariant = 'default' | 'supporting';

export interface BreadcrumbContextValue {
	readonly variant: BreadcrumbsVariant;
	/** The separator text; '/' mirrors in right-to-left layouts. */
	readonly separator: string;
}

const KEY = Symbol('astryx-breadcrumbs');

export function setBreadcrumbContext(value: BreadcrumbContextValue) {
	setContext(KEY, value);
}

export function getBreadcrumbContext(): BreadcrumbContextValue {
	return getContext<BreadcrumbContextValue | undefined>(KEY) ?? { variant: 'default', separator: '/' };
}
