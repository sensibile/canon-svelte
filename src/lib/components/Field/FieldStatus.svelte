<!-- Port of Astryx `FieldStatus` (packages/core/src/FieldStatus), MIT, Meta Platforms, Inc. -->
<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import Icon from '../Icon/Icon.svelte';
	import type { FieldStatusPlacement, FieldStatusType } from './types.js';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		type: FieldStatusType;
		message: string;
		variant?: FieldStatusPlacement;
	}

	let { type, message, variant = 'attached', class: className, ...rest }: Props = $props();
</script>

<div
	{...rest}
	class={['astryx-field-status', 'status', variant, className]}
	data-type={type}
	data-variant={variant}
>
	{#if variant === 'detached'}
		<span class="detached-content">
			<span class="detached-icon"><Icon icon={type} size="sm" color="inherit" /></span>
			<span>{message}</span>
		</span>
	{:else}
		{message}
	{/if}
</div>

<style>
	@layer astryx-base {
		.status {
			--_overlap: var(--_field-status-overlap, var(--spacing-1-5));
			font-family: var(--font-family-body);
			font-size: var(--text-supporting-size);
			line-height: var(--text-supporting-leading);
			overflow-wrap: anywhere;
			--_astryx-text-overflow-wrap: anywhere;
			animation: astryx-slide-down var(--duration-fast) var(--ease-entrance);
		}
		@media (prefers-reduced-motion: reduce) {
			.status { animation: none; }
		}
		@media (forced-colors: active) {
			.status { outline: 1px solid CanvasText; outline-offset: -1px; }
		}
		.attached {
			position: relative;
			z-index: -1;
			margin-top: calc(-1 * var(--_overlap));
			padding-block-start: calc(var(--_overlap) + var(--spacing-2));
			padding-block-end: var(--spacing-2);
			padding-inline: var(--spacing-2);
			border-end-start-radius: var(--radius-element);
			border-end-end-radius: var(--radius-element);
			pointer-events: none;
		}
		.detached {
			margin-top: var(--spacing-1);
			padding-block: var(--spacing-2);
			padding-inline: var(--spacing-2);
			border-radius: var(--radius-element);
		}
		.detached-content { display: flex; align-items: flex-start; gap: var(--spacing-1); }
		.detached-icon {
			display: inline-flex;
			align-items: center;
			height: calc(var(--text-supporting-size) * var(--text-supporting-leading));
			flex-shrink: 0;
		}
		.status[data-type='warning'] { background-color: var(--color-warning-muted); color: var(--color-on-warning-muted); }
		.status[data-type='error'] { background-color: var(--color-error-muted); color: var(--color-on-error-muted); }
		.status[data-type='success'] { background-color: var(--color-success-muted); color: var(--color-on-success-muted); }
	}

	@keyframes astryx-slide-down {
		from { opacity: 0; transform: translateY(-4px); }
		to { opacity: 1; transform: none; }
	}
</style>
