<!--
  Port of Astryx `Divider` (packages/core/src/Divider/Divider.tsx), MIT, Meta Platforms, Inc.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		orientation?: 'horizontal' | 'vertical';
		/** Text or content shown in the middle of the line. */
		label?: string | Snippet;
		variant?: 'subtle' | 'strong';
		/** Extend past the parent container's padding. */
		isFullBleed?: boolean;
	}

	let {
		orientation = 'horizontal',
		label,
		variant = 'subtle',
		isFullBleed = false,
		class: className,
		'aria-label': ariaLabel,
		'aria-labelledby': ariaLabelledBy,
		...rest
	}: Props = $props();

	const labelId = $props.id();
	const horizontal = $derived(orientation === 'horizontal');
	const hasLabel = $derived(label != null && label !== '');
	const labelledBy = $derived(ariaLabelledBy ?? (hasLabel && ariaLabel == null ? labelId : undefined));
</script>

<div
	{...rest}
	role="separator"
	aria-orientation={orientation}
	aria-label={ariaLabel}
	aria-labelledby={labelledBy}
	class={['astryx-divider', 'divider', className]}
	class:vertical={!horizontal}
	class:full-bleed={isFullBleed}
	data-variant={variant}
	data-orientation={orientation}
>
	<div class="line {variant}"></div>
	{#if hasLabel}
		<div id={labelId} class="label">
			{#if typeof label === 'function'}{@render label()}{:else}{label}{/if}
		</div>
		<div class="line {variant}"></div>
	{/if}
</div>

<style>
	@layer astryx-base {
		.divider { display: flex; align-items: center; width: 100%; }
		.divider.vertical { display: inline-flex; flex-direction: column; width: auto; height: 100%; }
		.line { height: var(--border-width); flex: 1 1 auto; }
		.vertical .line { height: auto; width: var(--border-width); }
		.subtle { background-color: var(--color-border); }
		.strong { background-color: var(--color-border-emphasized); }
		.label {
			flex-shrink: 0;
			padding-inline: var(--spacing-3);
			font-size: var(--text-supporting-size);
			line-height: var(--text-supporting-leading);
			color: var(--color-text-secondary);
		}
		.vertical .label { padding-inline: 0; padding-block: var(--spacing-3); }
		.full-bleed {
			margin-inline-start: calc(-1 * var(--container-padding-inline-start, 0px));
			margin-inline-end: calc(-1 * var(--container-padding-inline-end, 0px));
			width: calc(100% + var(--container-padding-inline-start, 0px) + var(--container-padding-inline-end, 0px));
		}
		.vertical.full-bleed {
			margin-inline: 0;
			width: auto;
			margin-block-start: calc(-1 * var(--container-padding-block-start, 0px));
			margin-block-end: calc(-1 * var(--container-padding-block-end, 0px));
			height: calc(100% + var(--container-padding-block-start, 0px) + var(--container-padding-block-end, 0px));
		}
	}
</style>
