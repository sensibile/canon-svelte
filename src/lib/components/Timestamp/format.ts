// Port of Astryx Timestamp formatting (packages/core/src/Timestamp/formatRelativeTime.ts,
// formatInstant.ts, tooltipEntries.ts), MIT, Meta Platforms, Inc. Gregorian calendar only.

export type TimestampFormat =
	| 'relative'
	| 'relative_short'
	| 'auto'
	| 'date'
	| 'date_long'
	| 'date_weekday'
	| 'date_time'
	| 'time'
	| 'system_date'
	| 'system_date_time'
	| 'system_time'
	| 'unix_seconds';

export type InstantFormat = Exclude<TimestampFormat, 'relative' | 'relative_short' | 'auto'> | 'full';

export interface TimestampTooltipEntry {
	/** IANA zone, or "local" / omitted for the viewer's zone. */
	timezoneID?: string;
	format?: InstantFormat;
	label?: string;
	isCopyable?: boolean;
}

export interface TimestampTooltipLine {
	label?: string;
	zoneName: string;
	value: string;
	isCopyable: boolean;
}

const MINUTE = 60;
const HOUR = 3600;
const DAY = 86400;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;
const FUTURE_SKEW_TOLERANCE = 30;

const relativeFormatters = new Map<string, Intl.RelativeTimeFormat>();
function relativeFormatter(locale: string, style: 'long' | 'narrow', numeric: 'auto' | 'always') {
	const key = `${locale}|${style}|${numeric}`;
	let f = relativeFormatters.get(key);
	if (!f) {
		f = new Intl.RelativeTimeFormat(locale, { numeric, style });
		relativeFormatters.set(key, f);
	}
	return f;
}

export function formatRelativeTime(date: Date, now: Date, locale: string, style: 'long' | 'narrow'): string {
	const diffSeconds = Math.round((now.getTime() - date.getTime()) / 1000);
	const absDiff = Math.abs(diffSeconds);
	if (absDiff < 10 || (diffSeconds < 0 && absDiff <= FUTURE_SKEW_TOLERANCE)) {
		return relativeFormatter(locale, style, 'auto').format(0, 'second');
	}
	let count: number;
	let unit: Intl.RelativeTimeFormatUnit;
	if (absDiff < MINUTE) [count, unit] = [absDiff, 'second'];
	else if (absDiff < HOUR) [count, unit] = [Math.floor(absDiff / MINUTE), 'minute'];
	else if (absDiff < DAY) [count, unit] = [Math.floor(absDiff / HOUR), 'hour'];
	else if (absDiff < MONTH) [count, unit] = [Math.floor(absDiff / DAY), 'day'];
	else if (absDiff < YEAR) [count, unit] = [Math.floor(absDiff / MONTH), 'month'];
	else [count, unit] = [Math.floor(absDiff / YEAR), 'year'];
	const value = diffSeconds < 0 ? count : -count;
	const numeric = style === 'long' && unit === 'day' && value === -1 ? 'auto' : 'always';
	return relativeFormatter(locale, style, numeric).format(value, unit);
}

const FULL_OPTIONS: Intl.DateTimeFormatOptions = {
	year: 'numeric',
	month: 'long',
	day: 'numeric',
	hour: 'numeric',
	minute: '2-digit',
	second: '2-digit',
	timeZoneName: 'short'
};
const TIME_OPTIONS: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
const DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric', ...TIME_OPTIONS };
const DATE_OPTIONS: Record<'date' | 'date_long' | 'date_weekday', Intl.DateTimeFormatOptions> = {
	date: { year: 'numeric', month: 'short', day: 'numeric' },
	date_long: { year: 'numeric', month: 'long', day: 'numeric' },
	date_weekday: { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }
};

const pad = (n: number) => String(n).padStart(2, '0');

function wallClock(date: Date, timeZone?: string) {
	if (!timeZone) {
		return {
			year: date.getFullYear(),
			month: date.getMonth() + 1,
			day: date.getDate(),
			hour: date.getHours(),
			minute: date.getMinutes(),
			second: date.getSeconds()
		};
	}
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone,
		hourCycle: 'h23',
		year: 'numeric',
		month: 'numeric',
		day: 'numeric',
		hour: 'numeric',
		minute: 'numeric',
		second: 'numeric'
	}).formatToParts(date);
	const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value ?? 0);
	return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour'), minute: get('minute'), second: get('second') };
}

export function formatZoneName(date: Date, locale: string, timeZone?: string): string {
	return (
		new Intl.DateTimeFormat(locale, { timeZoneName: 'long', ...(timeZone ? { timeZone } : {}) })
			.formatToParts(date)
			.find((p) => p.type === 'timeZoneName')?.value ?? ''
	);
}

export interface FormatInstantOptions {
	timeZone?: string;
	isTimezoneShown?: boolean;
	timeZoneNameStyle?: 'short' | 'long';
}

export function formatInstant(
	date: Date,
	format: InstantFormat,
	locale: string,
	{ timeZone, isTimezoneShown = false, timeZoneNameStyle = 'short' }: FormatInstantOptions = {}
): string {
	const zone = timeZone ? { timeZone } : {};
	const zoneName = isTimezoneShown ? { timeZoneName: 'short' as const } : {};
	const fmt = (options: Intl.DateTimeFormatOptions) =>
		new Intl.DateTimeFormat(locale, { ...options, ...zone }).format(date);
	switch (format) {
		case 'full':
			return fmt({ ...FULL_OPTIONS, timeZoneName: timeZoneNameStyle });
		case 'date':
		case 'date_long':
		case 'date_weekday':
			return fmt(DATE_OPTIONS[format]);
		case 'date_time':
			return fmt({ ...DATE_TIME_OPTIONS, ...zoneName });
		case 'time':
			return fmt({ ...TIME_OPTIONS, ...zoneName });
		case 'system_date': {
			const w = wallClock(date, timeZone);
			return `${w.year}-${pad(w.month)}-${pad(w.day)}`;
		}
		case 'system_date_time': {
			const w = wallClock(date, timeZone);
			return `${w.year}-${pad(w.month)}-${pad(w.day)} ${pad(w.hour)}:${pad(w.minute)}:${pad(w.second)}`;
		}
		case 'system_time': {
			const w = wallClock(date, timeZone);
			return `${pad(w.hour)}:${pad(w.minute)}:${pad(w.second)}`;
		}
		case 'unix_seconds':
			return String(Math.floor(date.getTime() / 1000));
	}
}

/** Unknown zones and "local" resolve to the viewer's zone (undefined). */
export function resolveTimezoneID(timezoneID: string | undefined): string | undefined {
	if (timezoneID === undefined || timezoneID.toLowerCase() === 'local') return undefined;
	try {
		new Intl.DateTimeFormat('en-US', { timeZone: timezoneID });
	} catch {
		console.warn(`[Timestamp] unknown time zone ${JSON.stringify(timezoneID)}. Falling back to the viewer's time zone.`);
		return undefined;
	}
	return timezoneID;
}

const zoneKey = (resolved: string | undefined) => (resolved === undefined ? 'local' : resolved.toLowerCase());

export function formatTooltipLines(
	date: Date,
	entries: ReadonlyArray<TimestampTooltipEntry>,
	locale: string,
	defaultTimezoneID?: string
): TimestampTooltipLine[] {
	const resolved = entries.map((e) => (e.timezoneID === undefined ? defaultTimezoneID : resolveTimezoneID(e.timezoneID)));
	const zones = new Set(resolved.map(zoneKey));
	if (defaultTimezoneID !== undefined) zones.add(zoneKey(defaultTimezoneID));
	const hasMultipleZones = zones.size > 1;
	return entries.map((entry, i) => {
		const format = entry.format ?? 'full';
		const timeZone = resolved[i];
		const showZone =
			format === 'full' || ((format === 'date_time' || format === 'time') && (hasMultipleZones || timeZone !== undefined));
		return {
			...(entry.label === undefined ? {} : { label: entry.label }),
			isCopyable: entry.isCopyable ?? false,
			zoneName: formatZoneName(date, locale, timeZone),
			value: formatInstant(date, format, locale, { timeZone, isTimezoneShown: showZone })
		};
	});
}
