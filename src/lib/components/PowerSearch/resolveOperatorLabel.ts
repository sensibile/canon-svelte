// Port of Astryx resolveOperatorLabel (packages/core/src/PowerSearch/resolveOperatorLabel.ts), MIT,
// Meta Platforms, Inc. Port change: an `i18nKey` reads from the inline English operator labels; an
// unknown key shows as itself.
import { OPERATOR_LABELS } from './strings.js';
import type { PowerSearchOperator } from './types.js';

/** An operator's display text: its `label`, else the English for its `i18nKey`. */
export function resolveOperatorLabel(operator: PowerSearchOperator): string {
	if ('label' in operator && operator.label !== undefined) return operator.label;
	return OPERATOR_LABELS[operator.i18nKey] ?? operator.i18nKey;
}
