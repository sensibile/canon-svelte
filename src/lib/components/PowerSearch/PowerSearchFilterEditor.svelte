<!--
  Port of Astryx `PowerSearchFilterEditor` (packages/core/src/PowerSearch/PowerSearchFilterEditor.tsx),
  MIT, Meta Platforms, Inc. The default filter editor, for use in a custom editor override
  (`components[type].Editor`).
-->
<script lang="ts">
	import PowerSearchEditPopover from './PowerSearchEditPopover.svelte';
	import { createInternalConfig } from './internalConfig.js';
	import type { PowerSearchEditorProps } from './types.js';

	let {
		config: configProp,
		filter,
		mode,
		onSave,
		onCancel,
		saveButtonLabel,
		isReadOnly,
		timezoneID,
		locale
	}: PowerSearchEditorProps & { locale?: string } = $props();

	const config = $derived(createInternalConfig(configProp));
</script>

{#key filter.field}
	<PowerSearchEditPopover {config} {filter} {mode} {onSave} {onCancel} {saveButtonLabel} {isReadOnly} {timezoneID} {locale} />
{/key}
