import { getContext, setContext } from 'svelte';

export type StepperOrientation = 'horizontal' | 'vertical';
export type StepperDensity = 'compact' | 'balanced' | 'spacious';
export type StepperIndicatorPosition = 'separated' | 'on-track';
export type StepStatus = 'accent' | 'success' | 'warning' | 'error';

export interface StepperRegistrationOptions {
	getIsDisabled?: () => boolean;
}

/** Read-only Stepper state for custom step content; values are getters. */
export interface StepperContextValue {
	readonly activeStep: number;
	readonly previousActiveStep: number;
	readonly orientation: StepperOrientation;
	readonly isNonLinear: boolean;
	readonly onStepClick: ((index: number) => void) | null;
	readonly density: StepperDensity;
	readonly indicatorPosition: StepperIndicatorPosition;
	registerStep(index: number, options?: StepperRegistrationOptions): () => void;
}

export interface StepperInternalContextValue extends StepperContextValue {
	readonly stepCount: number;
	readonly isCompact: boolean;
	readonly summarySlot: HTMLElement | null;
}

const KEY = Symbol('astryx-stepper');

export function setStepperContext(value: StepperInternalContextValue) {
	setContext(KEY, value);
}

function read(hook: string): StepperInternalContextValue {
	const ctx = getContext<StepperInternalContextValue | undefined>(KEY);
	if (ctx == null) throw new Error(`${hook} must be used within Stepper. Wrap your Step in <Stepper>.`);
	return ctx;
}

export function getStepperInternalContext(): StepperInternalContextValue {
	return read('Step');
}

/** The enclosing Stepper's state, for content inside a Step. */
export function getStepperContext(): StepperContextValue {
	return read('getStepperContext');
}
