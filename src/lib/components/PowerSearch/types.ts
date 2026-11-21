// Port of Astryx PowerSearch types (packages/core/src/PowerSearch/types.ts), MIT, Meta Platforms, Inc.
// Port changes: icons are icon names or components instead of React nodes, render props are
// snippets, and component overrides are Svelte components.

import type { Component, Snippet } from 'svelte';
import type { SearchSource, SearchableItem } from '../Typeahead/types.js';
import type { IconComponent } from '../Icon/Icon.svelte';
import type { IconName } from '../Icon/defaultIcons.js';

export type PowerSearchIcon = IconName | IconComponent;

export interface EmptyOperatorValue {
	readonly type: 'empty';
}
export interface StringOperatorValue {
	readonly type: 'string';
	readonly searchSource?: SearchSource;
	readonly isArbitraryStringAllowed?: boolean;
}
export interface StringListOperatorValue {
	readonly type: 'string_list';
	readonly searchSource?: SearchSource;
	readonly isArbitraryStringAllowed?: boolean;
	readonly tokenization?: OperatorTokenizationConfig;
}
export interface IntegerOperatorValue {
	readonly type: 'integer';
	readonly minValue?: number;
	readonly maxValue?: number;
	readonly units?: string;
}
export interface FloatOperatorValue {
	readonly type: 'float';
	readonly minValue?: number;
	readonly maxValue?: number;
	readonly units?: string;
}
export interface TimeOperatorValue {
	readonly type: 'time';
	readonly minValue?: string;
	readonly maxValue?: string;
}
export interface DateAbsoluteOperatorValue {
	readonly type: 'date_absolute';
	/** `false` makes the value an instant with a time of day. */
	readonly isDateOnly?: boolean;
}
export interface DateRelativeOperatorValue {
	readonly type: 'date_relative';
	readonly isPastAllowed?: boolean;
	readonly isFutureAllowed?: boolean;
}
export interface DateRangeOperatorValue {
	readonly type: 'date_range';
	readonly intervalDatePresets?: ReadonlyArray<DateRangeFilterPreset>;
	readonly relativeDatePresets?: ReadonlyArray<RelativeDateFilterPreset>;
}
export interface EnumItem {
	readonly value: string;
	readonly label: string;
	readonly icon?: PowerSearchIcon;
}
export interface EnumOperatorValue {
	readonly type: 'enum';
	readonly values: ReadonlyArray<EnumItem>;
}
export interface EnumListOperatorValue {
	readonly type: 'enum_list';
	readonly values: ReadonlyArray<EnumItem>;
}
export interface EntityListOperatorValue {
	readonly type: 'entity_list';
	readonly searchSource?: SearchSource;
	readonly isArbitraryStringAllowed?: boolean;
	readonly tokenization?: OperatorTokenizationConfig;
	readonly renderItem?: Snippet<[SearchableItem]>;
}
export interface CustomEditorProps {
	isDisabled?: boolean;
	onChange: (value: string | null) => void;
	placeholder: string;
	value: string | null;
}
export interface CustomOperatorValue {
	readonly type: 'custom';
	readonly Editor: Component<CustomEditorProps>;
	readonly getString: (value: string) => string;
}
export interface NestedOperatorValue {
	readonly type: 'nested';
}

export type OperatorValue =
	| EmptyOperatorValue
	| StringOperatorValue
	| StringListOperatorValue
	| IntegerOperatorValue
	| FloatOperatorValue
	| TimeOperatorValue
	| DateAbsoluteOperatorValue
	| DateRelativeOperatorValue
	| DateRangeOperatorValue
	| EnumOperatorValue
	| EnumListOperatorValue
	| EntityListOperatorValue
	| CustomOperatorValue
	| NestedOperatorValue;

export interface FilterValueEmpty {
	readonly type: 'empty';
}
export interface FilterValueString {
	readonly type: 'string';
	readonly value: string;
}
export interface FilterValueStringList {
	readonly type: 'string_list';
	readonly value: ReadonlyArray<string>;
}
export interface FilterValueInteger {
	readonly type: 'integer';
	readonly value: number;
}
export interface FilterValueFloat {
	readonly type: 'float';
	readonly value: number;
}
export interface FilterValueTime {
	readonly type: 'time';
	readonly value: string;
}
export interface FilterValueDateAbsolute {
	readonly type: 'date_absolute';
	readonly unixSeconds: number;
}
export interface FilterValueDateRelative {
	readonly type: 'date_relative';
	readonly value: string;
}
export interface FilterValueDateRange {
	readonly type: 'date_range';
	readonly value: DateTimeRange;
}
export interface FilterValueEnum {
	readonly type: 'enum';
	readonly value: string;
}
export interface FilterValueEnumList {
	readonly type: 'enum_list';
	readonly value: ReadonlyArray<string>;
}
export interface PowerSearchEntity {
	readonly id: string;
	readonly label: string;
	readonly photo?: string;
}
export interface FilterValueEntityList {
	readonly type: 'entity_list';
	readonly value: ReadonlyArray<PowerSearchEntity>;
}
export interface FilterValueCustom {
	readonly type: 'custom';
	readonly value: string;
}
export interface FilterValueNested {
	readonly type: 'nested';
	readonly value: ReadonlyArray<PowerSearchFilter>;
}

export type FilterValue =
	| FilterValueEmpty
	| FilterValueString
	| FilterValueStringList
	| FilterValueInteger
	| FilterValueFloat
	| FilterValueTime
	| FilterValueDateAbsolute
	| FilterValueDateRelative
	| FilterValueDateRange
	| FilterValueEnum
	| FilterValueEnumList
	| FilterValueEntityList
	| FilterValueCustom
	| FilterValueNested;

export interface OperatorTokenizationConfig {
	readonly regex?: string;
	readonly sort?: boolean;
}

export type DateTimeRangePart =
	| { readonly type: 'NOW' }
	| { readonly type: 'ABSOLUTE'; readonly unixSeconds: number }
	| {
			readonly type: 'RELATIVE';
			readonly backValue: number;
			readonly unit: 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';
			readonly anchorKey?: string;
	  };
export interface DateTimeRange {
	readonly start: DateTimeRangePart;
	readonly end: DateTimeRangePart;
}
export interface DateRangeFilterPreset {
	readonly label: string;
	readonly value: DateTimeRange;
}
export interface RelativeDateFilterPreset {
	readonly label: string;
	readonly value: string;
}

export interface PowerSearchOperatorBase {
	readonly key: string;
	readonly value: OperatorValue;
}
export interface PowerSearchOperatorWithLabel extends PowerSearchOperatorBase {
	readonly label: string;
	readonly i18nKey?: never;
}
export interface PowerSearchOperatorWithI18nKey extends PowerSearchOperatorBase {
	/** One of the built-in operator keys, such as `@astryx.powersearch.operator.contains`. */
	readonly i18nKey: string;
	readonly label?: never;
}
export type PowerSearchOperator = PowerSearchOperatorWithLabel | PowerSearchOperatorWithI18nKey;

export interface PowerSearchField {
	readonly key: string;
	readonly label: string;
	readonly operators: ReadonlyArray<PowerSearchOperator>;
	readonly icon?: PowerSearchIcon;
	readonly defaultOperator?: string;
	readonly group?: string;
	readonly description?: string;
	readonly typeaheadAliases?: ReadonlyArray<string>;
	readonly typeaheadMinQueryLength?: number;
	readonly isValueMatchAllowed?: boolean;
}

export interface PowerSearchConfig {
	readonly name: string;
	readonly fields: ReadonlyArray<PowerSearchField>;
	/** A field whose default operator takes free text as a "search for …" row. */
	readonly contentSearchFieldKey?: string;
}

export interface PowerSearchFilter {
	readonly field: string;
	readonly operator: string;
	readonly value: FilterValue;
	readonly isReadOnly?: boolean;
}
export interface PartialFilter {
	readonly field: string;
	readonly operator?: string;
	readonly value?: FilterValue;
	readonly isReadOnly?: boolean;
}

export type PowerSearchChangeType = 'add' | 'edit' | 'remove';

export interface PowerSearchAuxData {
	readonly fieldKey: string;
	readonly operatorKey?: string;
	readonly filterValue?: FilterValue;
	readonly filterIndex?: number;
	readonly group?: string;
}
export type PowerSearchItem = SearchableItem<PowerSearchAuxData>;

export interface PowerSearchTokenProps {
	readonly config: PowerSearchConfig;
	readonly filter: PowerSearchFilter;
	readonly field: PowerSearchField;
	readonly operator: PowerSearchOperator;
	readonly maxLength: number;
	readonly onClick?: () => void;
	readonly onRemove?: () => void;
	readonly isDisabled?: boolean;
	readonly timezoneID?: string;
}
export interface PowerSearchEditorProps {
	readonly config: PowerSearchConfig;
	readonly filter: PartialFilter;
	readonly mode: 'create' | 'edit';
	readonly onSave: (filter: PowerSearchFilter | null) => void;
	readonly onCancel: () => void;
	readonly saveButtonLabel?: string;
	readonly isReadOnly?: boolean;
	readonly timezoneID?: string;
}
export interface PowerSearchComponentOverride {
	readonly Token?: Component<PowerSearchTokenProps>;
	readonly Editor?: Component<PowerSearchEditorProps>;
}
export type PowerSearchComponents = Partial<Record<OperatorValue['type'], PowerSearchComponentOverride>>;
