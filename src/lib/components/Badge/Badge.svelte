<!--
  Port of Astryx `Badge` (packages/core/src/Badge/Badge.tsx), MIT, Meta Platforms, Inc.
-->
<script lang="ts" module>
	export type BadgeVariant =
		| 'neutral'
		| 'info'
		| 'success'
		| 'warning'
		| 'error'
		| 'blue'
		| 'cyan'
		| 'gray'
		| 'green'
		| 'orange'
		| 'pink'
		| 'purple'
		| 'red'
		| 'teal'
		| 'yellow';
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import Icon, { type IconComponent } from '../Icon/Icon.svelte';
	import type { IconName } from '../Icon/defaultIcons.js';

	interface Props extends HTMLAttributes<HTMLSpanElement> {
		variant?: BadgeVariant;
		label: string | number | Snippet;
		/** Leading icon: a built-in glyph name or an icon component. */
		icon?: IconName | IconComponent;
	}

	let { variant = 'neutral', label, icon, class: className, ...rest }: Props = $props();

	const title = $derived(
		typeof label === 'number' ? String(label) : typeof label === 'string' && label ? label : undefined
	);
	const hasLabel = $derived(label != null && label !== '');
</script>

<span
	class={['astryx-badge', 'badge', className]}
	class:grows={hasLabel}
	data-variant={variant}
	{title}
	{...rest}
>
	{#if icon}<Icon {icon} size="xsm" />{/if}
	<span class="label" dir="auto">
		{#if typeof label === 'function'}{@render label()}{:else}{label}{/if}
	</span>
</span>

<style>
	@layer astryx-base {
		.badge {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			gap: var(--spacing-1);
			height: var(--spacing-5);
			padding-block: 0;
			padding-inline: var(--spacing-2);
			border-radius: var(--radius-full);
			font-family: inherit;
			font-size: var(--text-supporting-size);
			line-height: var(--text-supporting-leading);
			font-weight: var(--font-weight-medium);
			white-space: nowrap;
			width: fit-content;
			max-width: 100%;
			min-width: 0;
		}
		.grows { min-height: 1lh; }
		.label { overflow: hidden; text-overflow: ellipsis; min-width: 0; unicode-bidi: isolate; }

		.badge[data-variant='neutral'] {
			background-color: var(--_button-on-fill, var(--color-neutral));
			color: var(--_button-fill, var(--color-text-primary));
		}
		.badge[data-variant='info'] { background-color: var(--color-info); color: var(--color-on-info); }
		.badge[data-variant='success'] { background-color: var(--color-success); color: var(--color-on-success); }
		.badge[data-variant='warning'] { background-color: var(--color-warning); color: var(--color-on-warning); }
		.badge[data-variant='error'] { background-color: var(--color-error); color: var(--color-on-error); }
		.badge[data-variant='blue'] { background-color: var(--color-background-blue); color: var(--color-text-blue); }
		.badge[data-variant='cyan'] { background-color: var(--color-background-cyan); color: var(--color-text-cyan); }
		.badge[data-variant='gray'] { background-color: var(--color-background-gray); color: var(--color-text-gray); }
		.badge[data-variant='green'] { background-color: var(--color-background-green); color: var(--color-text-green); }
		.badge[data-variant='orange'] { background-color: var(--color-background-orange); color: var(--color-text-orange); }
		.badge[data-variant='pink'] { background-color: var(--color-background-pink); color: var(--color-text-pink); }
		.badge[data-variant='purple'] { background-color: var(--color-background-purple); color: var(--color-text-purple); }
		.badge[data-variant='red'] { background-color: var(--color-background-red); color: var(--color-text-red); }
		.badge[data-variant='teal'] { background-color: var(--color-background-teal); color: var(--color-text-teal); }
		.badge[data-variant='yellow'] { background-color: var(--color-background-yellow); color: var(--color-text-yellow); }

		@media (forced-colors: active) {
			.badge:is([data-variant='info'], [data-variant='success'], [data-variant='warning'], [data-variant='error']) {
				outline: 1px solid CanvasText;
				outline-offset: -1px;
			}
		}
	}
</style>
