// Port of Astryx `timeWheelRules` (packages/core/src/TimeInput/timeWheelRules.ts), MIT, Meta Platforms, Inc.
// The rows of the time wheels, with each row disabled when no time it can reach falls inside min and max.
// Port change: only the helpers the per-column sheet wheels use. The coupled-wheel helpers
// (`turnColumn`, `columnsToTurn`, `restingTime`) belong to the touch-physics wheels, not ported.

import { parseISOTime, type ISOTimeString } from '../../internal/date/timeParser.js';

export interface TimeRow {
	value: number;
	label: string;
	isDisabled: boolean;
	order?: number;
}

export interface TimeBounds {
	/** Seconds since midnight, or null for no bound. */
	min: number | null;
	max: number | null;
}

const SECONDS_PER_DAY = 24 * 3600;

function secondsOfISO(time: string | undefined): number | null {
	if (time == null) return null;
	const parsed = parseISOTime(time);
	return parsed == null ? null : parsed.hour * 3600 + parsed.minute * 60 + parsed.second;
}

export function wheelBounds(
	min: ISOTimeString | string | undefined,
	max: ISOTimeString | string | undefined
): TimeBounds {
	return { min: secondsOfISO(min), max: secondsOfISO(max) };
}

export function meridiemOf(hour: number): 0 | 1 {
	return hour < 12 ? 0 : 1;
}

export function hour12From24(hour: number): number {
	const h = hour % 12;
	return h === 0 ? 12 : h;
}

export function hour24From12(hour: number, meridiem: number): number {
	return (hour % 12) + (meridiem === 1 ? 12 : 0);
}

function overlaps(start: number, end: number, bounds: TimeBounds): boolean {
	return (bounds.min == null || end >= bounds.min) && (bounds.max == null || start <= bounds.max);
}

/** Hour rows. A 12-hour wheel's rows read in the half of the day `from` is in. */
export function hourRowsInHalf(from: number, hourFormat: '12h' | '24h', bounds: TimeBounds): TimeRow[] {
	const half = meridiemOf(from);
	const rows =
		hourFormat === '24h' ? Array.from({ length: 24 }, (_, hour) => hour) : Array.from({ length: 12 }, (_, i) => i + 1);
	return rows.map((row) => {
		const hour = hourFormat === '24h' ? row : hour24From12(row, half);
		return {
			value: row,
			label: hourFormat === '24h' ? String(row).padStart(2, '0') : String(row),
			isDisabled: !overlaps(hour * 3600, hour * 3600 + 3599, bounds),
			order: hour
		};
	});
}

export function minuteRows(hour: number, hasSeconds: boolean, bounds: TimeBounds): TimeRow[] {
	return Array.from({ length: 60 }, (_, minute): TimeRow => {
		const start = hour * 3600 + minute * 60;
		return {
			value: minute,
			label: String(minute).padStart(2, '0'),
			isDisabled: !overlaps(start, start + (hasSeconds ? 59 : 0), bounds)
		};
	});
}

export function secondRows(hour: number, minute: number, bounds: TimeBounds): TimeRow[] {
	return Array.from({ length: 60 }, (_, second): TimeRow => {
		const at = hour * 3600 + minute * 60 + second;
		return { value: second, label: String(second).padStart(2, '0'), isDisabled: !overlaps(at, at, bounds) };
	});
}

export function meridiemRows(labels: { am: string; pm: string }, bounds: TimeBounds): TimeRow[] {
	return [
		{ value: 0, label: labels.am, isDisabled: !overlaps(0, 12 * 3600 - 1, bounds) },
		{ value: 1, label: labels.pm, isDisabled: !overlaps(12 * 3600, SECONDS_PER_DAY - 1, bounds) }
	];
}
