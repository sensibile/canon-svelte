<!--
  Port of Astryx `StatusDot` (packages/core/src/StatusDot/StatusDot.tsx), MIT, Meta Platforms, Inc.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import Tooltip from '../Tooltip/Tooltip.svelte';

	interface Props extends HTMLAttributes<HTMLSpanElement> {
		variant: 'success' | 'warning' | 'error' | 'accent' | 'neutral';
		/** Accessible name; the dot itself is purely visual. */
		label: string;
		isPulsing?: boolean;
		tooltip?: string;
		icon?: Snippet;
	}

	let { variant, label, isPulsing = false, tooltip, icon, class: className, ...rest }: Props = $props();
</script>

{#snippet dot()}
	<span
		{...rest}
		role="img"
		aria-label={label}
		class={['astryx-status-dot', 'dot', className]}
		class:pulsing={isPulsing}
		data-variant={variant}
	>
		{#if icon}<span class="icon" aria-hidden="true">{@render icon()}</span>{/if}
	</span>
{/snippet}

{#if tooltip}
	<Tooltip content={tooltip}>{@render dot()}</Tooltip>
{:else}
	{@render dot()}
{/if}

<style>
	@layer astryx-base {
		.dot {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			border-radius: 50%;
			flex-shrink: 0;
			width: 8px;
			height: 8px;
		}
		.pulsing { animation: astryx-status-pulse 2s ease-in-out infinite; }
		@media (prefers-reduced-motion: reduce) {
			.pulsing { animation: none; }
		}
		.icon { display: flex; align-items: center; justify-content: center; line-height: 0; width: 8px; height: 8px; }

		.dot[data-variant='success'] { background-color: var(--color-icon-success); color: var(--color-background-surface); }
		.dot[data-variant='warning'] { background-color: var(--color-icon-warning); color: var(--color-background-surface); }
		.dot[data-variant='error'] { background-color: var(--color-icon-error); color: var(--color-background-surface); }
		.dot[data-variant='accent'] { background-color: var(--color-accent); color: var(--color-on-accent); }
		.dot[data-variant='neutral'] { background-color: var(--color-icon-secondary); color: var(--color-background-surface); }
		@media (forced-colors: active) {
			.dot:is([data-variant='success'], [data-variant='warning'], [data-variant='error']) {
				outline: 1px solid CanvasText;
				outline-offset: -1px;
			}
		}
	}
	@keyframes astryx-status-pulse {
		0% { opacity: 1; }
		50% { opacity: 0.5; }
		100% { opacity: 1; }
	}
</style>
