// Port of Astryx SideNav contexts (packages/core/src/SideNav/SideNavCollapseContext.ts), MIT, Meta Platforms, Inc.
import { getContext, setContext } from 'svelte';

export interface SideNavCollapseState {
	readonly isCollapsed: boolean;
	toggle: () => void;
	readonly isCollapsible: boolean;
}

export interface SideNavCollapsibleConfig {
	defaultIsCollapsed?: boolean;
	/** Controlled collapse state; pair with `onCollapsedChange`. */
	isCollapsed?: boolean;
	onCollapsedChange?: (isCollapsed: boolean) => void;
	/** Show the built-in collapse button in the footer (default true). */
	hasButton?: boolean;
	buttonLabel?: string;
}

export interface SideNavControlledCollapsible extends SideNavCollapsibleConfig {
	isCollapsed: boolean;
	onCollapsedChange: (isCollapsed: boolean) => void;
}

const COLLAPSE = Symbol('astryx-side-nav-collapse');
const DEPTH = Symbol('astryx-side-nav-item-depth');

export const EXPANDED_COLLAPSE_STATE: SideNavCollapseState = {
	isCollapsed: false,
	toggle: () => {},
	isCollapsible: false
};

export function setSideNavCollapseContext(value: SideNavCollapseState) {
	setContext(COLLAPSE, value);
}

/** The enclosing SideNav's collapse state. Port of `useSideNavCollapse`; read it inside $derived. */
export function getSideNavCollapse(): SideNavCollapseState {
	return getContext<SideNavCollapseState | undefined>(COLLAPSE) ?? EXPANDED_COLLAPSE_STATE;
}

export function setSideNavItemDepth(depth: () => number) {
	setContext(DEPTH, depth);
}
export function getSideNavItemDepth(): () => number {
	return getContext<(() => number) | undefined>(DEPTH) ?? (() => 0);
}
