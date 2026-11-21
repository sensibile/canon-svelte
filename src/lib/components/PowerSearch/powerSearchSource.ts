// Port of Astryx usePowerSearchSource (packages/core/src/PowerSearch/usePowerSearchSource.ts), MIT,
// Meta Platforms, Inc. Port changes: a plain function in place of the memoized hook; the group
// ordering of Astryx's groupItems is inlined, without group headings; typed values are read from
// the trimmed query (marked "Port change").

import type { SearchSource } from '../Typeahead/types.js';
import { resolveOperatorLabel } from './resolveOperatorLabel.js';
import type { InternalConfig } from './internalConfig.js';
import type { PowerSearchItem, PowerSearchOperator, FilterValue } from './types.js';

/**
 * The field's search source: every field for an empty query; for typed text, the fields and
 * "field operator" pairs it matches, rows that carry a typed value ("Status is Active"), and a
 * free-text row for the config's content search field.
 */
export function createPowerSearchSource(
	config: InternalConfig,
	maxTypedResults: number
): SearchSource<PowerSearchItem> {
	const allItems = buildFieldItems(config);
	const opLabel = (op: PowerSearchOperator): string => resolveOperatorLabel(op);
	return {
		search(query: string): PowerSearchItem[] {
			const lower = query.toLowerCase().trim();
			// Port change: typed values are sliced from the trimmed query, which `lower` matches.
			const trimmedQuery = query.trim();
			if (lower === '') {
				return allItems;
			}
			const results: PowerSearchItem[] = [];
			const seen = new Set<string>();
			for (const field of config.getVisibleFields()) {
				if (field.typeaheadMinQueryLength != null && lower.length < field.typeaheadMinQueryLength) {
					continue;
				}
				const fieldMatches =
					field.label.toLowerCase().includes(lower) ||
					field.typeaheadAliases?.some((alias) => alias.toLowerCase().includes(lower));
				if (fieldMatches) {
					const defaultOp = config.getDefaultOperator(field.key);
					const fieldId = field.key;
					if (!seen.has(fieldId)) {
						seen.add(fieldId);
						results.push({
							id: fieldId,
							label: field.label,
							auxiliaryData: {
								fieldKey: field.key,
								operatorKey: defaultOp?.key
							}
						});
					}
				}
				for (const op of field.operators) {
					const combinedLabel = `${field.label} ${opLabel(op)}`.toLowerCase();
					if (combinedLabel.includes(lower)) {
						const id = `${field.key}:${op.key}`;
						if (!seen.has(id)) {
							seen.add(id);
							results.push({
								id,
								label: `${field.label} ${opLabel(op)}`,
								auxiliaryData: {
									fieldKey: field.key,
									operatorKey: op.key
								}
							});
						}
					}
				}
			}
			for (const field of config.getVisibleFields()) {
				if (field.isValueMatchAllowed === false) {
					continue;
				}
				const fieldLabel = field.label.toLowerCase();
				let hasExactOperatorMatch = false;
				for (const op of field.operators) {
					const prefix = `${fieldLabel} ${opLabel(op).toLowerCase()} `;
					if (lower.startsWith(prefix) && lower.length > prefix.length) {
						const rawValue = trimmedQuery.slice(prefix.length);
						const matches = resolveValueMatches(op, rawValue);
						if (matches.length > 0) {
							hasExactOperatorMatch = true;
						}
						for (const match of matches) {
							const id = `${field.key}:${op.key}:value:${match.displayValue}`;
							if (!seen.has(id)) {
								seen.add(id);
								results.push({
									id,
									label: `${field.label} ${opLabel(op)} ${match.quoted ? `"${match.displayValue}"` : match.displayValue}`,
									auxiliaryData: {
										fieldKey: field.key,
										operatorKey: op.key,
										filterValue: match.filterValue
									}
								});
							}
						}
					}
				}
				const fieldPrefix = `${fieldLabel} `;
				if (!hasExactOperatorMatch && lower.startsWith(fieldPrefix) && lower.length > fieldPrefix.length) {
					const remainder = lower.slice(fieldPrefix.length);
					const isOperatorPrefix = field.operators.some((op) => opLabel(op).toLowerCase().startsWith(remainder));
					if (!isOperatorPrefix) {
						const rawValue = trimmedQuery.slice(fieldPrefix.length);
						for (const op of field.operators) {
							const matches = resolveValueMatches(op, rawValue);
							for (const match of matches) {
								const id = `${field.key}:${op.key}:value:${match.displayValue}`;
								if (!seen.has(id)) {
									seen.add(id);
									results.push({
										id,
										label: `${field.label} ${opLabel(op)} ${match.quoted ? `"${match.displayValue}"` : match.displayValue}`,
										auxiliaryData: {
											fieldKey: field.key,
											operatorKey: op.key,
											filterValue: match.filterValue
										}
									});
								}
							}
						}
					}
				}
			}
			const contentFieldKey = config.config.contentSearchFieldKey;
			const hasExactMatch = config
				.getVisibleFields()
				.some(
					(f) =>
						f.label.toLowerCase() === lower ||
						f.operators.some((op) => `${f.label} ${opLabel(op)}`.toLowerCase() === lower)
				);
			if (contentFieldKey && !hasExactMatch) {
				const contentField = config.getField(contentFieldKey);
				const contentOp = config.getDefaultOperator(contentFieldKey);
				if (contentField && contentOp) {
					results.unshift({
						id: `__content_search__:${query}`,
						label: `"${query}"`,
						auxiliaryData: {
							fieldKey: contentFieldKey,
							operatorKey: contentOp.key,
							filterValue: { type: 'string', value: query }
						}
					});
				}
			}
			return results.slice(0, maxTypedResults);
		},
		bootstrap(): PowerSearchItem[] {
			return allItems;
		}
	};
}
interface ValueMatch {
	displayValue: string;
	filterValue: FilterValue;
	quoted: boolean;
}
function resolveValueMatches(op: PowerSearchOperator, rawValue: string): ValueMatch[] {
	const opType = op.value.type;
	if (opType === 'string') {
		return [
			{
				displayValue: rawValue,
				filterValue: { type: 'string', value: rawValue },
				quoted: true
			}
		];
	}
	if (opType === 'string_list') {
		return [
			{
				displayValue: rawValue,
				filterValue: { type: 'string_list', value: [rawValue] },
				quoted: true
			}
		];
	}
	if (opType === 'enum') {
		const lower = rawValue.toLowerCase();
		return op.value.values
			.filter((item) => item.label.toLowerCase().includes(lower))
			.map((item) => ({
				displayValue: item.label,
				filterValue: { type: 'enum' as const, value: item.value },
				quoted: false
			}));
	}
	if (opType === 'enum_list') {
		const lower = rawValue.toLowerCase();
		return op.value.values
			.filter((item) => item.label.toLowerCase().includes(lower))
			.map((item) => ({
				displayValue: item.label,
				filterValue: { type: 'enum_list' as const, value: [item.value] },
				quoted: false
			}));
	}
	return [];
}
function buildFieldItems(config: InternalConfig): PowerSearchItem[] {
	const items: PowerSearchItem[] = [];
	for (const field of config.getVisibleFields()) {
		const defaultOp = config.getDefaultOperator(field.key);
		items.push({
			id: field.key,
			label: field.label,
			auxiliaryData: {
				fieldKey: field.key,
				operatorKey: defaultOp?.key,
				group: field.group
			}
		});
	}
	// Ungrouped fields first, then each group in first-seen order (Astryx groupItems).
	const groupOrder: string[] = [];
	const groups = new Map<string, PowerSearchItem[]>();
	const ungrouped: PowerSearchItem[] = [];
	for (const item of items) {
		const group = item.auxiliaryData?.group;
		if (group == null) {
			ungrouped.push(item);
			continue;
		}
		if (!groups.has(group)) {
			groupOrder.push(group);
			groups.set(group, []);
		}
		groups.get(group)?.push(item);
	}
	return [...ungrouped, ...groupOrder.flatMap((g) => groups.get(g) ?? [])];
}
