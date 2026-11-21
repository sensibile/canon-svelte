// Port of Astryx powerSearchDateZone (packages/core/src/PowerSearch/powerSearchDateZone.ts), MIT,
// Meta Platforms, Inc. Adapted imports.
// The one zone every reading of a `date_absolute` or range value uses, and the conversions between
// an instant and the calendar day or wall-clock time shown in that zone.
import type { ISODateString } from '../../internal/date/dateTypes.js';
import type { ISODateTimeString } from '../DateTimeInput/DateTimeInput.svelte';
import {
	getWallClock,
	plainDateFromDate,
	plainDateFromInstant,
	plainDateFromISO,
	plainDateToDate,
	plainDateToInstant,
	plainDateToISO
} from '../../internal/date/plainDate.js';

/**
 * A calendar day is stored as midnight in `timezoneID`; with no zone, the UTC day. A value with a
 * time of day shows in `timezoneID`, else in the viewer's zone (`undefined`).
 */
export function resolveDateZone(timezoneID: string | undefined, isDateOnly: boolean): string | undefined {
	if (timezoneID) return timezoneID;
	return isDateOnly ? 'UTC' : undefined;
}

const pad = (n: number, width = 2) => String(n).padStart(width, '0');

export function unixSecondsToISODate(unixSeconds: number, zone: string | undefined): ISODateString {
	const instant = unixSeconds * 1000;
	return plainDateToISO(zone == null ? plainDateFromDate(new Date(instant)) : plainDateFromInstant(instant, zone));
}

export function isoDateToUnixSeconds(date: ISODateString, zone: string | undefined): number {
	const plain = plainDateFromISO(date);
	const instant = zone == null ? plainDateToDate(plain).getTime() : plainDateToInstant(plain, zone);
	return Math.floor(instant / 1000);
}

export function unixSecondsToISODateTime(unixSeconds: number, zone: string | undefined): ISODateTimeString {
	const w = getWallClock(new Date(unixSeconds * 1000), zone);
	return `${pad(w.year, 4)}-${pad(w.month)}-${pad(w.day)}T${pad(w.hour)}:${pad(w.minute)}` as ISODateTimeString;
}

export function isoDateTimeToUnixSeconds(value: ISODateTimeString, zone: string | undefined): number {
	const [datePart, timePart = '00:00'] = value.split('T');
	const [hour = 0, minute = 0] = timePart.split(':').map(Number);
	const plain = plainDateFromISO(datePart as ISODateString);
	let instant: number;
	if (zone == null) {
		const d = plainDateToDate(plain);
		d.setHours(hour, minute, 0, 0);
		instant = d.getTime();
	} else {
		instant = plainDateToInstant(plain, zone, hour, minute);
	}
	return Math.floor(instant / 1000);
}
