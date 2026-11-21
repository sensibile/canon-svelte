// Port of Astryx resolveDateTimeRangePart (packages/core/src/PowerSearch/resolveDateTimeRangePart.ts),
// MIT, Meta Platforms, Inc.
import type { DateTimeRangePart } from './types.js';

const SECONDS_BY_UNIT = {
	second: 1,
	minute: 60,
	hour: 3600,
	day: 86400,
	week: 604800,
	month: 2592000,
	year: 31536000
} as const;

/** The unix seconds a range part names, measured from `nowSeconds`. */
export function resolveDateTimeRangePart(part: DateTimeRangePart, nowSeconds = Date.now() / 1000): number {
	switch (part.type) {
		case 'NOW':
			return Math.floor(nowSeconds);
		case 'ABSOLUTE':
			return part.unixSeconds;
		case 'RELATIVE':
			return Math.floor(nowSeconds - part.backValue * SECONDS_BY_UNIT[part.unit]);
	}
}
