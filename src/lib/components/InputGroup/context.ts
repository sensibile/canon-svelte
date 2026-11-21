import { getContext, setContext } from 'svelte';

export type InputGroupSize = 'sm' | 'md' | 'lg';

export interface InputGroupContext {
	readonly labelID: string;
	readonly describedByIDs: string | undefined;
	readonly isDisabled: boolean;
	readonly size: InputGroupSize;
}

const KEY = Symbol('astryx-input-group');
export const setInputGroupContext = (ctx: InputGroupContext | null) => setContext(KEY, ctx);
/** The enclosing InputGroup, or null (also inside content that opts out, such as overlays). */
export const getInputGroupContext = () => getContext<InputGroupContext | null | undefined>(KEY) ?? null;

/** Marks an element as a member of the enclosing InputGroup row. */
export const INPUT_GROUP_ITEM = 'data-astryx-input-group-item';
