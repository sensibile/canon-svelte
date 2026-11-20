import { getContext, setContext } from 'svelte';
import type { IconSize } from './Icon.svelte';

const KEY = Symbol('astryx-icon-default-size');

/** Let a parent (e.g. Button) pick the size icons inside it use when they don't set one. */
export function setIconDefaultSize(size: () => IconSize | undefined) {
	setContext(KEY, size);
}

/** Returns the parent's getter; call it inside a $derived so the size stays reactive. */
export function getIconDefaultSize(): () => IconSize | undefined {
	return getContext<(() => IconSize | undefined) | undefined>(KEY) ?? (() => undefined);
}
