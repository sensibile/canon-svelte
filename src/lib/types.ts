// Shared prop types, mirroring Astryx (packages/core/src/utils/types.ts, theme/types.ts). MIT.

export type SpacingStep = 0 | 0.5 | 1 | 1.5 | 2 | 3 | 4 | 5 | 6 | 8 | 10;
export type SizeValue = number | string;
export type Size = 'sm' | 'md' | 'lg';

export type TextType =
	| 'body'
	| 'large'
	| 'label'
	| 'supporting'
	| 'code'
	| 'display-1'
	| 'display-2'
	| 'display-3'
	| 'inherit';
export type TextSize =
	| '4xs'
	| '3xs'
	| '2xs'
	| 'xsm'
	| 'sm'
	| 'base'
	| 'lg'
	| 'xl'
	| '2xl'
	| '3xl'
	| '4xl';
export type TextColor = 'primary' | 'secondary' | 'disabled' | 'placeholder' | 'accent' | 'inherit';
export type TextWeight = 'normal' | 'medium' | 'semibold' | 'bold';
export type TextDisplay = 'inline' | 'block';
export type TextJustify = 'start' | 'center' | 'end';
export type WordBreak = 'break-word' | 'break-all';
export type TextWrap = 'wrap' | 'nowrap' | 'balance' | 'pretty';

/** Space token for a SpacingStep: 1.5 -> var(--spacing-1-5). */
export function spacingVar(step: SpacingStep): string {
	return `var(--spacing-${String(step).replace('.', '-')})`;
}

/** Numbers become px, strings pass through. */
export function cssSize(value: SizeValue | undefined): string | undefined {
	if (value == null) return undefined;
	return typeof value === 'number' ? `${value}px` : value;
}
