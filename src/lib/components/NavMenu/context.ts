// Port of Astryx NavMenu contexts (packages/core/src/NavMenu/NavMenuContext.tsx), MIT, Meta Platforms, Inc.
import { getContext, setContext } from 'svelte';

export type NavHeadingMenuSize = 'sm' | 'md' | 'lg';

const CLOSE = Symbol('astryx-nav-heading-close');
const DISMISS = Symbol('astryx-nav-heading-dismiss');
const HOST = Symbol('astryx-nav-heading-menu-host');
const MENU = Symbol('astryx-nav-heading-menu');

export interface NavHeadingCloseContextValue {
	closeMenu: () => void;
}
/** Set by a heading popover that closes after an item is chosen (collapsed rail). */
export function setNavHeadingCloseContext(value: NavHeadingCloseContextValue | null) {
	setContext(CLOSE, value);
}
export function getNavHeadingCloseContext(): NavHeadingCloseContextValue | null {
	return getContext<NavHeadingCloseContextValue | null | undefined>(CLOSE) ?? null;
}

export interface NavHeadingDismissContextValue {
	dismiss: () => void;
}
/** Set by a heading popover so a press-and-release on an item can dismiss it. */
export function setNavHeadingDismissContext(value: NavHeadingDismissContextValue | null) {
	setContext(DISMISS, value);
}
export function getNavHeadingDismissContext(): NavHeadingDismissContextValue | null {
	return getContext<NavHeadingDismissContextValue | null | undefined>(DISMISS) ?? null;
}

/** True inside a heading popover, whose wrapper already carries role="menu". */
export function setNavHeadingMenuHostContext(value: boolean) {
	setContext(HOST, value);
}
export function getNavHeadingMenuHostContext(): boolean {
	return getContext<boolean | undefined>(HOST) ?? false;
}

export interface NavHeadingMenuContextValue {
	readonly size: NavHeadingMenuSize;
	closeMenu: () => void;
}
export function setNavHeadingMenuContext(value: NavHeadingMenuContextValue | null) {
	setContext(MENU, value);
}
export function getNavHeadingMenuContext(): NavHeadingMenuContextValue | null {
	return getContext<NavHeadingMenuContextValue | null | undefined>(MENU) ?? null;
}
