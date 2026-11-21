import { getContext, setContext } from 'svelte';
import type { FieldStatusInput } from '../Field/types.js';

export type RadioListSize = 'sm' | 'md';

export interface RadioListContext {
	readonly name: string;
	readonly value: string;
	readonly isDisabled: boolean;
	readonly hasDisabledMessage: boolean;
	readonly disabledReasonID: string | undefined;
	readonly isRequired: boolean;
	readonly size: RadioListSize;
	readonly status: FieldStatusInput | undefined;
	select(value: string): void;
}

const KEY = Symbol('astryx-radio-list');
export const setRadioListContext = (ctx: RadioListContext) => setContext(KEY, ctx);
export const getRadioListContext = () => getContext<RadioListContext | undefined>(KEY);
