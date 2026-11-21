import { getContext, setContext } from 'svelte';

interface DialogContext {
	titleId: string;
}
const KEY = Symbol('astryx-dialog');

export function setDialogContext(ctx: DialogContext) {
	setContext(KEY, ctx);
}
export function getDialogContext(): DialogContext | undefined {
	return getContext<DialogContext | undefined>(KEY);
}
