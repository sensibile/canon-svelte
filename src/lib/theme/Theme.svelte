<!--
  Port of Astryx `Theme` (packages/core/src/theme/Theme.tsx), MIT, Meta Platforms, Inc.

  Scopes a theme to its subtree with `data-astryx-theme` and the color mode with
  `data-theme`. The theme's CSS must be imported once, e.g.
  `import 'canon-svelte/themes/neutral.css'`.
  The outermost Theme also mirrors both attributes onto <html>, so browser chrome
  and portaled content (rendered outside this subtree) pick up the same theme.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { getTheme, setThemeContext, type ThemeMode } from './context.js';

	interface Props {
		/** Theme name, matching the imported theme CSS (e.g. "neutral"). */
		theme?: string;
		/** Color mode. "system" follows the reader's OS setting. */
		mode?: ThemeMode;
		children?: Snippet;
	}

	let { theme = 'neutral', mode = 'system', children }: Props = $props();

	const isRoot = getTheme() === undefined;

	setThemeContext({
		get name() {
			return theme;
		},
		get mode() {
			return mode;
		}
	});

	$effect(() => {
		if (!isRoot) return;
		const html = document.documentElement;
		html.setAttribute('data-astryx-theme', theme);
		if (mode === 'system') html.removeAttribute('data-theme');
		else html.setAttribute('data-theme', mode);
		return () => {
			html.removeAttribute('data-astryx-theme');
			html.removeAttribute('data-theme');
		};
	});
</script>

<div
	class="astryx-theme"
	class:light={mode === 'light'}
	class:dark={mode === 'dark'}
	data-astryx-theme={theme}
	data-theme={mode === 'system' ? undefined : mode}
>
	{@render children?.()}
</div>

<style>
	.astryx-theme {
		display: contents;
		color: var(--color-text-primary);
		font-family: var(--font-family-body);
		font-size: var(--text-body-size);
		line-height: var(--text-body-leading);
		color-scheme: light dark;
	}
	.light {
		color-scheme: light;
	}
	.dark {
		color-scheme: dark;
	}
</style>
