import { getContext, setContext } from 'svelte';
import type { ItemDensity } from '../Item/Item.svelte';

export interface CheckboxListContext {
	/** The checked values, when the list is controlled by a value array. */
	readonly value: string[] | undefined;
	readonly isDisabled: boolean;
	readonly hasDisabledMessage: boolean;
	readonly disabledMessageID: string | undefined;
	readonly isReadOnly: boolean;
	readonly isInvalid: boolean;
	readonly density: ItemDensity;
	readonly hasDividers: boolean;
	toggle(value: string): void;
	/** Items call this after their checked/disabled state renders, so the group's required target stays right. */
	itemChanged(): void;
}

const KEY = Symbol('astryx-checkbox-list');
export const setCheckboxListContext = (ctx: CheckboxListContext) => setContext(KEY, ctx);
export const getCheckboxListContext = () => getContext<CheckboxListContext | undefined>(KEY);
