import { getContext, setContext } from 'svelte';

interface DropdownMenuContext {
	closeMenu: () => void;
}
const KEY = Symbol('astryx-dropdown-menu');

export function setDropdownMenuContext(ctx: DropdownMenuContext) {
	setContext(KEY, ctx);
}
export function getDropdownMenuContext(): DropdownMenuContext | undefined {
	return getContext<DropdownMenuContext | undefined>(KEY);
}
