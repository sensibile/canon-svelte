<!--
  Port of Astryx `MobileNavToggle` (packages/core/src/MobileNav/MobileNavToggle.tsx), MIT, Meta Platforms, Inc.
  A ghost icon-only menu button that opens a MobileNav.
  Port change: without AppShell it is wired by hand: pass `isOpen`, `onOpenChange` and the
  MobileNav's `id` as `controls`. It always renders (Astryx shows it only on AppShell mobile layouts).
  Not yet ported: custom icon children.
-->
<script lang="ts">
	import Button from '../Button/Button.svelte';

	interface Props {
		isOpen: boolean;
		onOpenChange: (isOpen: boolean) => void;
		/** The MobileNav's id, for aria-controls. */
		controls?: string;
		label?: string;
		onclick?: (e: MouseEvent) => void;
		class?: string;
		'data-testid'?: string;
	}

	let {
		isOpen,
		onOpenChange,
		controls,
		label = 'Open navigation',
		onclick,
		class: className,
		'data-testid': testId = 'mobile-nav-toggle'
	}: Props = $props();
</script>

<Button
	variant="ghost"
	{label}
	icon="menu"
	isIconOnly
	class={className}
	aria-expanded={isOpen}
	aria-controls={controls}
	data-testid={testId}
	onclick={(e) => {
		onOpenChange(!isOpen);
		onclick?.(e);
	}}
/>
