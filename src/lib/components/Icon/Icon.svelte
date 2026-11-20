<!--
  Port of Astryx `Icon` (packages/core/src/Icon/Icon.tsx), MIT, Meta Platforms, Inc.
  `icon` takes a built-in glyph name or any Svelte component that renders an <svg>
  (e.g. from lucide-svelte or phosphor-svelte). Theme icon sets come later.
-->
<script lang="ts" module>
	import type { Component } from 'svelte';

	export type IconSize = 'xsm' | 'sm' | 'md' | 'lg';
	export type IconColor =
		| 'primary'
		| 'secondary'
		| 'tertiary'
		| 'disabled'
		| 'accent'
		| 'info'
		| 'success'
		| 'error'
		| 'warning'
		| 'inherit'
		| 'blue'
		| 'red'
		| 'green'
		| 'gray'
		| 'cyan'
		| 'teal'
		| 'yellow'
		| 'orange'
		| 'pink'
		| 'purple';
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	export type IconComponent = Component<any>;
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { defaultIcons, type IconGlyph, type IconName } from './defaultIcons.js';
	import { getIconDefaultSize } from './context.js';

	interface Props extends Omit<HTMLAttributes<HTMLSpanElement>, 'color'> {
		icon: IconName | IconComponent;
		color?: IconColor;
		size?: IconSize;
		/** Accessible name. Without it the icon is decorative (aria-hidden). */
		label?: string;
	}

	let { icon, color = 'inherit', size, label, class: className, ...rest }: Props = $props();

	const contextSize = getIconDefaultSize();
	const resolvedSize = $derived(size ?? contextSize ?? 'md');
	const glyph = $derived(
		typeof icon === 'string' ? (defaultIcons as Record<string, IconGlyph>)[icon] : undefined
	);
	const IconComp = $derived(typeof icon === 'string' ? undefined : icon);
	const hasLabel = $derived(label != null && label !== '');
</script>

{#if glyph || IconComp}
	<span
		{...rest}
		role={hasLabel ? 'img' : undefined}
		aria-label={hasLabel ? label : undefined}
		aria-hidden={hasLabel ? undefined : 'true'}
		class={['astryx-icon', 'icon', className]}
		data-size={resolvedSize}
		data-color={color}
	>
		{#if glyph}
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				width="1em"
				height="1em"
				aria-hidden="true"
				fill={glyph.style === 'solid' ? 'currentColor' : 'none'}
				stroke={glyph.style === 'solid' ? undefined : 'currentColor'}
				stroke-width={glyph.style === 'solid' ? undefined : (glyph.strokeWidth ?? 1.5)}
				stroke-linecap={glyph.style === 'solid' ? undefined : 'round'}
				stroke-linejoin={glyph.style === 'solid' ? undefined : 'round'}
			>
				<!-- eslint-disable-next-line svelte/no-at-html-tags -- static, vetted glyph markup -->
				{@html glyph.body}
			</svg>
		{:else if IconComp}
			<IconComp width="1em" height="1em" aria-hidden="true" />
		{/if}
	</span>
{/if}

<style>
	@layer astryx-base {
		.icon {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			flex-shrink: 0;
		}
		.icon :global(svg) { width: 100%; height: 100%; }
		.icon[data-size='xsm'] { --_s: 0.75rem; }
		.icon[data-size='sm'] { --_s: 1rem; }
		.icon[data-size='md'] { --_s: 1.25rem; }
		.icon[data-size='lg'] { --_s: 1.5rem; }
		.icon {
			width: var(--_icon-width, var(--_s));
			height: var(--_icon-height, var(--_s));
			font-size: min(var(--_icon-width, var(--_s)), var(--_icon-height, var(--_s)));
		}

		.icon[data-color='primary'] { color: var(--color-icon-primary); }
		.icon[data-color='secondary'],
		.icon[data-color='tertiary'] { color: var(--color-icon-secondary); }
		.icon[data-color='disabled'] { color: var(--color-icon-disabled); }
		.icon[data-color='accent'] { color: var(--color-accent); }
		.icon[data-color='info'] { color: var(--color-icon-info); }
		.icon[data-color='success'] { color: var(--color-icon-success); }
		.icon[data-color='error'] { color: var(--color-icon-error); }
		.icon[data-color='warning'] { color: var(--color-icon-warning); }
		.icon[data-color='inherit'] { color: inherit; }
		.icon[data-color='blue'] { color: var(--color-icon-blue); }
		.icon[data-color='red'] { color: var(--color-icon-red); }
		.icon[data-color='green'] { color: var(--color-icon-green); }
		.icon[data-color='gray'] { color: var(--color-icon-gray); }
		.icon[data-color='cyan'] { color: var(--color-icon-cyan); }
		.icon[data-color='teal'] { color: var(--color-icon-teal); }
		.icon[data-color='yellow'] { color: var(--color-icon-yellow); }
		.icon[data-color='orange'] { color: var(--color-icon-orange); }
		.icon[data-color='pink'] { color: var(--color-icon-pink); }
		.icon[data-color='purple'] { color: var(--color-icon-purple); }
	}
</style>
