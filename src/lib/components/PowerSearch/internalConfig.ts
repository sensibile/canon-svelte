// Port of Astryx useInternalConfig (packages/core/src/PowerSearch/useInternalConfig.ts), MIT,
// Meta Platforms, Inc. Port change: a plain function in place of the memoized hook.
import type { PowerSearchConfig, PowerSearchField, PowerSearchOperator } from './types.js';

export interface InternalConfig {
	readonly config: PowerSearchConfig;
	getField(key: string): PowerSearchField | undefined;
	getOperator(fieldKey: string, operatorKey: string): PowerSearchOperator | undefined;
	getDefaultOperator(fieldKey: string): PowerSearchOperator | undefined;
	getVisibleFields(): ReadonlyArray<PowerSearchField>;
	getVisibleOperators(fieldKey: string): ReadonlyArray<PowerSearchOperator>;
}

/** A config with lookups by field and operator key. */
export function createInternalConfig(config: PowerSearchConfig): InternalConfig {
	const fieldMap = new Map<string, PowerSearchField>();
	const operatorMap = new Map<string, Map<string, PowerSearchOperator>>();
	for (const field of config.fields) {
		fieldMap.set(field.key, field);
		const opMap = new Map<string, PowerSearchOperator>();
		for (const op of field.operators) opMap.set(op.key, op);
		operatorMap.set(field.key, opMap);
	}
	return {
		config,
		getField: (key) => fieldMap.get(key),
		getOperator: (fieldKey, operatorKey) => operatorMap.get(fieldKey)?.get(operatorKey),
		getDefaultOperator(fieldKey) {
			const field = fieldMap.get(fieldKey);
			if (!field) return undefined;
			if (field.defaultOperator) return operatorMap.get(fieldKey)?.get(field.defaultOperator);
			return field.operators[0];
		},
		getVisibleFields: () => config.fields,
		getVisibleOperators: (fieldKey) => fieldMap.get(fieldKey)?.operators ?? []
	};
}
