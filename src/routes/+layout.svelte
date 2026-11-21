<script lang="ts">
	import '#lib/styles/astryx.css';
	import '#lib/themes/neutral.css';
	import '#lib/themes/butter.css';
	import '#lib/themes/chocolate.css';
	import '#lib/themes/matcha.css';
	import '#lib/themes/stone.css';
	import '#lib/themes/gothic.css';
	import '#lib/themes/y2k.css';
	import { Theme, type ThemeMode } from '#lib';

	let { children } = $props();
	let mode = $state<ThemeMode>('system');
	let theme = $state('neutral');
	const themes = ['neutral', 'butter', 'chocolate', 'matcha', 'stone', 'gothic', 'y2k'];
</script>

<Theme {theme} {mode}>
	<div class="shell">
		<header>
			<nav>
				<strong>canon-svelte</strong>
				<a href="/">Tokens</a>
				<a href="/components">Components</a>
			</nav>
			<div class="controls">
			<label>
				Theme
				<select bind:value={theme}>
					{#each themes as t (t)}<option value={t}>{t}</option>{/each}
				</select>
			</label>
			<label>
				Mode
				<select bind:value={mode}>
					<option value="system">System</option>
					<option value="light">Light</option>
					<option value="dark">Dark</option>
				</select>
			</label>
			</div>
		</header>
		<main>{@render children()}</main>
	</div>
</Theme>

<style>
	:global(body) {
		background: var(--color-background-body);
	}
	.shell {
		max-width: 960px;
		margin: 0 auto;
		padding: var(--spacing-6) var(--spacing-4);
	}
	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--spacing-8);
	}
	nav {
		display: flex;
		gap: var(--spacing-4);
		align-items: baseline;
	}
	nav a {
		color: var(--color-text-secondary);
		text-decoration: none;
	}
	nav a:hover {
		color: var(--color-text-primary);
	}
	.controls {
		display: flex;
		gap: var(--spacing-4);
	}
	select {
		margin-left: var(--spacing-2);
		padding: var(--spacing-1) var(--spacing-2);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-inner);
		background: var(--color-background-surface);
	}
</style>
