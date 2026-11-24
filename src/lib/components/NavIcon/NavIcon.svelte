<!--
  Port of Astryx `NavIcon` (packages/core/src/NavIcon/NavIcon.tsx), MIT, Meta Platforms, Inc.
  A round accent badge for a product or workspace icon, used in SideNavHeading and TopNavHeading.
  Port change: `icon` takes a built-in icon name or an icon component; pass custom content as children.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import Icon, { type IconComponent } from '../Icon/Icon.svelte';
	import type { IconName } from '../Icon/defaultIcons.js';

	interface Props extends HTMLAttributes<HTMLSpanElement> {
		icon?: IconName | IconComponent;
		/** Custom content in place of `icon`. */
		children?: Snippet;
	}

	let { icon, children, class: className, ...rest }: Props = $props();
</script>

<span {...rest} class={['astryx-nav-icon', 'nav-icon', className]}>
	{#if children}
		{@render children()}
	{:else if icon}
		<Icon {icon} size="sm" />
	{/if}
</span>

<style>
	@layer astryx-base {
		.nav-icon {
			display: flex;
			align-items: center;
			justify-content: center;
			border-radius: 50%;
			background-color: var(--color-accent);
			color: var(--color-on-accent);
			flex-shrink: 0;
			width: var(--size-element-md);
			height: var(--size-element-md);
		}
	}
</style>
