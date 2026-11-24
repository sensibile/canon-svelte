// Port of Astryx TopNav contexts (packages/core/src/TopNav/TopNavContext.ts), MIT, Meta Platforms, Inc.
import { getContext, setContext } from 'svelte';
import { readModality } from '../../internal/modality.js';

export type TopNavSlot = 'start' | 'center' | 'end';

const SLOT = Symbol('astryx-top-nav-slot');
const MEGA_CLOSE = Symbol('astryx-top-nav-mega-menu-close');

export function setTopNavSlot(slot: TopNavSlot) {
	setContext(SLOT, slot);
}
/** Which TopNav region the caller renders in. Port of `useTopNavSlot`. */
export function getTopNavSlot(): TopNavSlot {
	return getContext<TopNavSlot | undefined>(SLOT) ?? 'start';
}

export function setTopNavMegaMenuClose(close: (() => void) | null) {
	setContext(MEGA_CLOSE, close);
}
export function getTopNavMegaMenuClose(): (() => void) | null {
	return getContext<(() => void) | null | undefined>(MEGA_CLOSE) ?? null;
}

let lastPointerType = '';
if (typeof document !== 'undefined') {
	document.addEventListener('pointerdown', (e) => (lastPointerType = e.pointerType), true);
}
/** Whether picking an item should close its menu: keyboard, touch and pen picks do; mouse picks keep a hover-opened menu. */
export function pickCloses(): boolean {
	if (readModality() === 'keyboard') return true;
	return lastPointerType === 'touch' || lastPointerType === 'pen';
}
