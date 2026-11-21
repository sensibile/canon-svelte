<!--
  Port of Astryx `Kbd` (packages/core/src/Kbd/Kbd.tsx), MIT, Meta Platforms, Inc.
  `keys` is a "+"-joined shortcut such as "mod+k". `mod` is ⌘ on Apple platforms and Ctrl elsewhere.
  English labels only (Astryx's i18n layer is not ported).
-->
<script lang="ts" module>
	const KEY_DISPLAY = new Map([
		['enter', '↵'],
		['backspace', '⌫'],
		['tab', '⇥'],
		['up', '↑'],
		['down', '↓'],
		['left', '←'],
		['right', '→'],
		['plus', '+']
	]);
	const APPLE_MODIFIER_DISPLAY = new Map([
		['mod', '⌘'],
		['meta', '⌘'],
		['ctrl', '⌃'],
		['alt', '⌥'],
		['shift', '⇧']
	]);
	const MODIFIER_SHORT_TEXT = new Map([
		['mod', 'Ctrl'],
		['ctrl', 'Ctrl'],
		['alt', 'Alt'],
		['shift', 'Shift'],
		['meta', 'Win']
	]);
	const KEY_LABEL = new Map([
		['ctrl', 'Control'],
		['alt', 'Alt'],
		['shift', 'Shift'],
		['enter', 'Enter'],
		['backspace', 'Backspace'],
		['escape', 'Escape'],
		['tab', 'Tab'],
		['up', 'Up arrow'],
		['down', 'Down arrow'],
		['left', 'Left arrow'],
		['right', 'Right arrow'],
		['plus', 'Plus']
	]);
	const ALIASES = new Map([
		['esc', 'escape'],
		['return', 'enter']
	]);

	function display(key: string, isMac: boolean): string {
		const apple = isMac ? APPLE_MODIFIER_DISPLAY.get(key) : undefined;
		if (apple != null) return apple;
		const short = isMac ? undefined : MODIFIER_SHORT_TEXT.get(key);
		if (short != null) return short;
		if (key === 'escape') return 'Esc';
		return KEY_DISPLAY.get(key) ?? key.toUpperCase();
	}
	function label(key: string, isMac: boolean): string {
		if (key === 'mod') return isMac ? 'Command' : 'Control';
		return KEY_LABEL.get(key) ?? key.toUpperCase();
	}
</script>

<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { isApplePlatform } from '../../internal/platform.js';

	interface Props extends HTMLAttributes<HTMLSpanElement> {
		/** Keys joined by "+", e.g. "mod+shift+p". */
		keys: string;
	}

	let { keys, class: className, ...rest }: Props = $props();

	// Server render assumes non-Apple, then corrects after mount (like Astryx's server snapshot).
	let isMac = $state(false);
	$effect(() => {
		isMac = isApplePlatform();
	});

	const parts = $derived(
		keys.split('+').map((k) => {
			const key = k.trim().toLowerCase();
			return ALIASES.get(key) ?? key;
		})
	);
	const accessibleName = $derived(parts.map((k) => label(k, isMac)).join(' + '));
</script>

<span {...rest} role="img" aria-label={accessibleName} class={['astryx-kbd', 'kbd', className]}>
	{#each parts as key, i (i)}
		<kbd aria-hidden="true" class="astryx-kbd-key key">{display(key, isMac)}</kbd>
	{/each}
</span>

<style>
	@layer astryx-base {
		.kbd { display: inline-flex; align-items: center; gap: var(--spacing-1); flex-shrink: 0; }
		.key {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			min-width: var(--spacing-5);
			height: var(--spacing-5);
			min-height: 1lh;
			padding-inline: var(--spacing-1);
			border-radius: var(--radius-inner);
			background-color: var(--color-neutral);
			border-bottom: 2px solid var(--color-border-emphasized);
			color: var(--color-text-primary);
			font-family: var(--font-family-body);
			font-size: var(--text-supporting-size);
			font-weight: var(--font-weight-medium);
			line-height: var(--text-supporting-leading);
			user-select: none;
		}
	}
</style>
