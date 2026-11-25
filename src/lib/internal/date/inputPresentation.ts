// Port of Astryx `inputPresentation` (packages/core/src/utils/inputPresentation.ts), MIT, Meta Platforms, Inc.
// Which surface a date or time field collects its value on.

export type InputPresentation =
	| 'text-input'
	| 'popover'
	| 'bottom-sheet'
	| 'native'
	| 'adaptive-bottom-sheet'
	| 'adaptive-native';

export type PickerPresentation = Exclude<InputPresentation, 'text-input'>;

export type InputPresentationSurface = 'text-input' | 'desktop' | 'sheet' | 'native';

export type PickerPresentationSurface = Exclude<InputPresentationSurface, 'text-input'>;

/** The deprecated `nativePicker` prop. */
export type LegacyNativePicker = 'touch' | 'always' | 'never';

export const DEFAULT_INPUT_PRESENTATION: PickerPresentation = 'adaptive-native';

/** The pointer that picks a surface: the primary one, so a touchscreen laptop keeps its typed field. */
export const TOUCH_POINTER_QUERY = '(pointer: coarse)';

export function pickerPresentationFromNativePicker(nativePicker: LegacyNativePicker): PickerPresentation {
	switch (nativePicker) {
		case 'touch':
			return 'adaptive-native';
		case 'always':
			return 'native';
		case 'never':
			return 'adaptive-bottom-sheet';
	}
}

export function presentationFromNativePicker(
	nativePicker: LegacyNativePicker,
	component: 'date' | 'time'
): InputPresentation {
	if (component === 'time' && nativePicker === 'never') return 'text-input';
	return pickerPresentationFromNativePicker(nativePicker);
}

export function effectivePickerPresentation(
	presentation: PickerPresentation | undefined,
	nativePicker: LegacyNativePicker | undefined
): PickerPresentation {
	if (presentation !== undefined) return presentation;
	if (nativePicker !== undefined) return pickerPresentationFromNativePicker(nativePicker);
	return DEFAULT_INPUT_PRESENTATION;
}

export function effectiveInputPresentation(
	presentation: InputPresentation | undefined,
	nativePicker: LegacyNativePicker | undefined,
	component: 'date' | 'time'
): InputPresentation {
	if (presentation !== undefined) return presentation;
	if (nativePicker !== undefined) return presentationFromNativePicker(nativePicker, component);
	return DEFAULT_INPUT_PRESENTATION;
}

export function resolvePickerPresentation(
	presentation: PickerPresentation,
	isCoarsePointer: boolean
): PickerPresentationSurface {
	switch (presentation) {
		case 'popover':
			return 'desktop';
		case 'bottom-sheet':
			return 'sheet';
		case 'native':
			return 'native';
		case 'adaptive-bottom-sheet':
			return isCoarsePointer ? 'sheet' : 'desktop';
		case 'adaptive-native':
			return isCoarsePointer ? 'native' : 'desktop';
	}
}

export function resolveInputPresentation(
	presentation: InputPresentation,
	isCoarsePointer: boolean
): InputPresentationSurface {
	return presentation === 'text-input' ? 'text-input' : resolvePickerPresentation(presentation, isCoarsePointer);
}
