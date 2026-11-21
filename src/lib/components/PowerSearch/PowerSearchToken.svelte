<!--
  Port of Astryx `PowerSearchToken` (packages/core/src/PowerSearch/PowerSearchToken.tsx), MIT,
  Meta Platforms, Inc. The default filter token, "Field: operator" and the value in bold, for use
  in a custom token override (`components[type].Token`).
-->
<script lang="ts">
	import Token from '../Token/Token.svelte';
	import { formatFilterValue, formatTokenLabel } from './formatValue.js';
	import { resolveOperatorLabel } from './resolveOperatorLabel.js';
	import type { PowerSearchTokenProps } from './types.js';

	let {
		filter,
		field,
		operator,
		maxLength,
		onClick,
		onRemove,
		isDisabled,
		timezoneID,
		locale = 'en-US'
	}: PowerSearchTokenProps & { locale?: string } = $props();

	const operatorLabel = $derived(resolveOperatorLabel(operator));
	const valueText = $derived(
		formatFilterValue(
			operator.value,
			filter.value,
			Math.max(maxLength - field.label.length - operatorLabel.length, 10),
			locale,
			timezoneID
		)
	);
</script>

{#snippet value()}<span class="value">{valueText}</span>{/snippet}

<Token
	label={formatTokenLabel(field.label, operatorLabel)}
	endContent={valueText ? value : undefined}
	onclick={onClick
		? (e) => {
				e.stopPropagation();
				onClick();
			}
		: undefined}
	onRemove={onRemove ? () => onRemove() : undefined}
	{isDisabled}
/>

<style>
	@layer astryx-base {
		.value { font-weight: var(--font-weight-bold); }
	}
</style>
