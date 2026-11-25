// Port of Astryx `wheelOptions` (packages/core/src/DateInput/wheelOptions.ts), MIT, Meta Platforms, Inc.
// The rows of a picker wheel, and how keys and a settled scroll move between the enabled ones.
// Port change: the looping helpers (`restingLoopStep`, `loopedStep`) belong to the touch-physics
// wheel, which is not ported; every wheel here is the native scroll-snap wheel.

export interface WheelOption {
	value: number;
	label: string;
	isDisabled?: boolean;
	/** Where the row falls in key order, when that differs from its position. */
	order?: number;
}

export function canSpinTo(options: ReadonlyArray<WheelOption>, index: number): boolean {
	const option = options[index];
	return option != null && !option.isDisabled;
}

/** The enabled row nearest `index`, breaking a tie toward `towardIndex`. */
export function nearestEnabledIndex(options: ReadonlyArray<WheelOption>, index: number, towardIndex: number): number {
	const isEnabled = (i: number) => i >= 0 && i < options.length && !options[i].isDisabled;
	if (isEnabled(index)) return index;
	for (let distance = 1; distance < options.length; distance++) {
		const below = index - distance;
		const above = index + distance;
		const isBelowEnabled = isEnabled(below);
		const isAboveEnabled = isEnabled(above);
		if (isBelowEnabled && isAboveEnabled) return towardIndex < index ? below : above;
		if (isBelowEnabled) return below;
		if (isAboveEnabled) return above;
	}
	return towardIndex;
}

function inKeyOrder(options: ReadonlyArray<WheelOption>): number[] {
	const indices = options.map((_, index) => index);
	if (options.every((option) => option.order == null)) return indices;
	return indices.sort((a, b) => (options[a].order ?? a) - (options[b].order ?? b));
}

/** The row `delta` enabled steps from `from` in key order, or null when there is none. */
export function steppedIndex(options: ReadonlyArray<WheelOption>, from: number, delta: number): number | null {
	const count = options.length;
	if (count === 0 || delta === 0) return null;
	const rows = inKeyOrder(options);
	const start = Math.max(0, rows.indexOf(from));
	const isEnabled = (position: number) => !options[rows[position]].isDisabled;
	const step = Math.sign(delta);
	const target = Math.min(count - 1, Math.max(0, start + delta));
	for (let position = target; position >= 0 && position < count; position += step) {
		if (isEnabled(position)) return position === start ? null : rows[position];
	}
	for (let position = target; position !== start; position -= step) {
		if (isEnabled(position)) return rows[position];
	}
	return null;
}

export function endIndex(options: ReadonlyArray<WheelOption>, end: 'first' | 'last'): number | null {
	const enabled = inKeyOrder(options).filter((index) => !options[index].isDisabled);
	return (end === 'first' ? enabled[0] : enabled[enabled.length - 1]) ?? null;
}
