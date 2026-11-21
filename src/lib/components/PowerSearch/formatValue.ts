// Port of Astryx formatFilterValue and formatTokenValue (packages/core/src/PowerSearch/
// formatFilterValue.ts, formatTokenValue.ts), MIT, Meta Platforms, Inc.
// Port changes: inline English in place of the translator (so the token-text helpers take no `t`),
// and `formatTokenValueText` always takes the token's own literals, as PowerSearch calls it.
import type { EnumItem, FilterValue, OperatorValue } from './types.js';
import { formatCalendarInstant, type CalendarSystem } from '../../internal/date/calendarSystem.js';
import { truncateCharacters } from '../../internal/characters.js';
import { resolveDateZone } from './powerSearchDateZone.js';
import { strings } from './strings.js';

function getEnumLabel(values: ReadonlyArray<EnumItem>, value: string): string {
	return values.find((v) => v.value === value)?.label ?? value;
}

/** A number in the locale's digits, decimal mark and grouping. */
export function formatSharedNumber(
	value: number,
	locale: string,
	options?: Pick<Intl.NumberFormatOptions, 'useGrouping' | 'maximumFractionDigits'>
): string {
	return new Intl.NumberFormat(locale, options).format(value);
}

function formatNumber(value: number, locale: string, units?: string): string {
	const formatted = formatSharedNumber(value, locale);
	return units ? `${formatted} ${units}` : formatted;
}

/**
 * The one reading of a `date_absolute` value: its day in the zone `resolveDateZone` names, or with
 * `isDateOnly: false`, its date and time.
 */
export function formatDateAbsolute(
	unixSeconds: number,
	locale: string,
	timezoneID: string | undefined,
	isDateOnly = true,
	calendar: CalendarSystem = 'gregory'
): string {
	const options: Intl.DateTimeFormatOptions = isDateOnly
		? { year: 'numeric', month: 'short', day: 'numeric' }
		: { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' };
	return formatCalendarInstant(calendar, new Date(unixSeconds * 1000), options, locale, resolveDateZone(timezoneID, isDateOnly));
}

function isDateOnlyOperator(operatorValue: OperatorValue): boolean {
	return operatorValue.type !== 'date_absolute' || operatorValue.isDateOnly !== false;
}

/** The display text of a filter value, as the field's accessible token text reads it. */
export function formatFilterValue(
	operatorValue: OperatorValue,
	filterValue: FilterValue,
	maxLength: number,
	locale: string,
	timezoneID?: string,
	calendar: CalendarSystem = 'gregory'
): string {
	const truncate = (s: string) => truncateCharacters(s, maxLength);
	const listText = (labels: ReadonlyArray<string>, summary: (n: number) => string) => {
		if (labels.length === 0) return '';
		if (labels.length === 1) return truncate(labels[0]);
		const joined = labels.join(', ');
		return joined.length <= maxLength ? joined : summary(labels.length);
	};
	switch (filterValue.type) {
		case 'empty':
			return '';
		case 'string':
			return truncate(filterValue.value);
		case 'integer':
		case 'float':
			return formatNumber(
				filterValue.value,
				locale,
				(operatorValue.type === 'integer' || operatorValue.type === 'float') && operatorValue.type === filterValue.type
					? operatorValue.units
					: undefined
			);
		case 'enum':
			return truncate(operatorValue.type === 'enum' ? getEnumLabel(operatorValue.values, filterValue.value) : filterValue.value);
		case 'string_list':
			return listText(filterValue.value, strings.valueEditor.itemsCount);
		case 'enum_list': {
			const items = filterValue.value;
			if (operatorValue.type === 'enum_list') {
				return listText(
					items.map((v) => getEnumLabel(operatorValue.values, v)),
					strings.valueEditor.itemsCount
				);
			}
			if (items.length === 0) return '';
			return items.length === 1 ? truncate(items[0]) : strings.valueEditor.itemsCount(items.length);
		}
		case 'entity_list':
			return listText(
				filterValue.value.map((e) => e.label),
				strings.valueEditor.entitiesCount
			);
		case 'time':
			return filterValue.value;
		case 'date_absolute':
			return truncate(formatDateAbsolute(filterValue.unixSeconds, locale, timezoneID, isDateOnlyOperator(operatorValue), calendar));
		case 'date_relative':
			return filterValue.value;
		case 'date_range':
			return strings.valueEditor.dateRange;
		case 'custom':
			return operatorValue.type === 'custom' ? truncate(operatorValue.getString(filterValue.value)) : filterValue.value;
		case 'nested':
			return strings.valueEditor.filtersCount(filterValue.value.length);
		default:
			return '';
	}
}

/** A filter token's label: its field and operator, or its field alone with no operator text. */
export function formatTokenLabel(fieldLabel: string, operatorLabel: string): string {
	return operatorLabel === '' ? fieldLabel : strings.token.fieldOperator(fieldLabel, operatorLabel);
}

/** A filter token's full text: its label and its value. */
export function formatTokenText(label: string, value: string): string {
	return strings.token.labelValue(label, value);
}

function truncateString(value: string, limit: number): string {
	return truncateCharacters(value, limit + 3, '...');
}

function formatListText(labels: ReadonlyArray<string>, maxLength: number): string | null {
	if (labels.length === 0) return null;
	if (labels.length === 1) return truncateString(labels[0], maxLength);
	const totalLength = labels.reduce((sum, s) => sum + s.length, 0);
	if (totalLength > maxLength) return `${labels.length} items`;
	return labels.join(', ');
}

/**
 * The text a filter token shows for a value, or null for an empty value. `maxLength` is the
 * token's width budget.
 */
export function formatTokenValueText(
	operatorValue: OperatorValue,
	filterValue: FilterValue,
	maxLength: number,
	locale: string,
	calendar: CalendarSystem,
	timezoneID?: string
): string | null {
	switch (filterValue.type) {
		case 'empty':
			return null;
		case 'string':
			return truncateString(filterValue.value, maxLength);
		case 'integer':
		case 'float':
			return String(filterValue.value);
		case 'enum':
			return truncateString(
				operatorValue.type === 'enum' ? getEnumLabel(operatorValue.values, filterValue.value) : filterValue.value,
				maxLength
			);
		case 'string_list':
			return formatListText(filterValue.value, maxLength);
		case 'enum_list': {
			const items = filterValue.value;
			if (items.length === 0) return null;
			if (operatorValue.type === 'enum_list') {
				return formatListText(
					items.map((v) => getEnumLabel(operatorValue.values, v)),
					maxLength
				);
			}
			return items.length === 1 ? truncateString(items[0], maxLength) : `${items.length} items`;
		}
		case 'entity_list':
			return formatListText(
				filterValue.value.map((e) => e.label),
				maxLength
			);
		case 'time':
			return filterValue.value;
		case 'date_absolute':
			return truncateString(
				formatDateAbsolute(filterValue.unixSeconds, locale, timezoneID, isDateOnlyOperator(operatorValue), calendar),
				maxLength
			);
		case 'date_relative':
			return truncateString(filterValue.value, maxLength);
		case 'date_range':
			return 'date range';
		case 'custom':
			return operatorValue.type === 'custom'
				? truncateString(operatorValue.getString(filterValue.value), maxLength)
				: filterValue.value;
		case 'nested': {
			const count = filterValue.value.length;
			return count === 1 ? '1 filter' : `${count} filters`;
		}
		default:
			return null;
	}
}
