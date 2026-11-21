// The English text of PowerSearch, from Astryx's catalog (packages/core/src/i18n/generated-english/
// PowerSearch/*), MIT, Meta Platforms, Inc. Port change: inline English in place of the translator.

const numberFormat = new Intl.NumberFormat('en');
const plural = (count: number, one: string, other: string) =>
	`${numberFormat.format(count)} ${count === 1 ? one : other}`;

/** English for the built-in operator keys. */
export const OPERATOR_LABELS: Readonly<Record<string, string>> = {
	'@astryx.powersearch.operator.after': 'is after',
	'@astryx.powersearch.operator.before': 'is before',
	'@astryx.powersearch.operator.between': 'is between',
	'@astryx.powersearch.operator.contains': 'contains',
	'@astryx.powersearch.operator.endsWith': 'ends with',
	'@astryx.powersearch.operator.equals': 'is',
	'@astryx.powersearch.operator.greaterThan': 'is greater than',
	'@astryx.powersearch.operator.greaterThanOrEqual': 'is greater than or equal to',
	'@astryx.powersearch.operator.is': 'is',
	'@astryx.powersearch.operator.isAnyOf': 'is any of',
	'@astryx.powersearch.operator.isFalse': 'is false',
	'@astryx.powersearch.operator.isNoneOf': 'is none of',
	'@astryx.powersearch.operator.isNot': 'is not',
	'@astryx.powersearch.operator.isTrue': 'is true',
	'@astryx.powersearch.operator.lessThan': 'is less than',
	'@astryx.powersearch.operator.lessThanOrEqual': 'is less than or equal to',
	'@astryx.powersearch.operator.notContains': 'does not contain',
	'@astryx.powersearch.operator.notEndsWith': 'does not end with',
	'@astryx.powersearch.operator.notEquals': 'is not',
	'@astryx.powersearch.operator.notStartsWith': 'does not start with',
	'@astryx.powersearch.operator.startsWith': 'starts with'
};

export const strings = {
	label: 'Search',
	placeholder: 'Search…',
	allFiltersRemoved: 'All filters removed',
	editableFiltersRemoved: 'Editable filters removed',
	resultCount: (count: number) => plural(count, 'result', 'results'),
	editor: {
		addFilter: '+ Add filter',
		apply: 'Apply',
		cancel: 'Cancel',
		delete: 'Delete',
		field: 'Field',
		group: 'Group',
		groupOperator: 'Group operator',
		operator: 'Operator',
		removeFilter: 'Remove filter'
	},
	token: {
		fieldOperator: (field: string, operator: string) => `${field}: ${operator}`,
		labelValue: (label: string, value: string) => `${label} ${value}`
	},
	valueEditor: {
		addValuesPlaceholder: 'Add values…',
		date: 'Date',
		dateRange: 'date range',
		enterNumberPlaceholder: 'Enter number…',
		enterValuePlaceholder: 'Enter value…',
		entities: 'Entities',
		relativeDate: 'Relative date',
		searchPlaceholder: 'Search…',
		selectValuesPlaceholder: 'Select values…',
		time: 'Time',
		value: 'Value',
		values: 'Values',
		itemsCount: (count: number) => plural(count, 'item', 'items'),
		entitiesCount: (count: number) => plural(count, 'entity', 'entities'),
		filtersCount: (count: number) => plural(count, 'filter', 'filters')
	},
	relative: {
		day: { ago: (n: number) => `${plural(n, 'day', 'days')} ago`, fromNow: (n: number) => `${plural(n, 'day', 'days')} from now` },
		week: { ago: (n: number) => `${plural(n, 'week', 'weeks')} ago`, fromNow: (n: number) => `${plural(n, 'week', 'weeks')} from now` },
		month: { ago: (n: number) => `${plural(n, 'month', 'months')} ago`, fromNow: (n: number) => `${plural(n, 'month', 'months')} from now` }
	}
};
