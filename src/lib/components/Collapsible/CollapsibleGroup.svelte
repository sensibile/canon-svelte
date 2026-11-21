<!--
  Port of Astryx `CollapsibleGroup` (packages/core/src/Collapsible/CollapsibleGroup.tsx), MIT, Meta Platforms, Inc.
  Coordinates child Collapsibles by `value`: "single" keeps at most one open (an accordion),
  "multiple" any number. Only renders a wrapper when `hasDividers` is set.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import { setCollapsibleGroupContext, type CollapsibleChevronPosition, type CollapsibleGroupDensity } from './context.js';

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'onchange'> {
		type?: 'single' | 'multiple';
		defaultValue?: string | string[];
		value?: string | string[];
		/** Receives a string for "single" ('' when all closed), an array for "multiple". */
		onChange?: (value: string | string[]) => void;
		hasDividers?: boolean;
		density?: CollapsibleGroupDensity;
		chevronPosition?: CollapsibleChevronPosition;
		children: Snippet;
	}

	let {
		type = 'single',
		defaultValue,
		value: controlledValue,
		onChange,
		hasDividers = false,
		density,
		chevronPosition,
		children,
		class: className,
		...rest
	}: Props = $props();

	const toArray = (v: string | string[] | undefined) => (v == null ? [] : Array.isArray(v) ? v : [v]);
	let internal = $state(toArray(initialDefault()));
	function initialDefault() {
		return defaultValue;
	}
	const openValues = $derived(controlledValue !== undefined ? toArray(controlledValue) : internal);
	const resolvedDensity = $derived(density ?? (hasDividers ? 'balanced' : null));

	setCollapsibleGroupContext({
		isOpen: (v) => openValues.includes(v),
		toggle(v) {
			const isOpen = openValues.includes(v);
			const next =
				type === 'single' ? (isOpen ? [] : [v]) : isOpen ? openValues.filter((x) => x !== v) : [...openValues, v];
			if (controlledValue === undefined) internal = next;
			onChange?.(type === 'single' ? (next[0] ?? '') : next);
		},
		get hasDividers() {
			return hasDividers;
		},
		get density() {
			return resolvedDensity;
		},
		get chevronPosition() {
			return chevronPosition ?? null;
		}
	});
</script>

{#if hasDividers}
	<div {...rest} class={['astryx-collapsible-group', 'group', className]} data-density={resolvedDensity}>
		{@render children()}
	</div>
{:else}
	{@render children()}
{/if}

<style>
	@layer astryx-base {
		.group { display: flex; flex-direction: column; }
	}
</style>
