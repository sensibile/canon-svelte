<script lang="ts">
	const colorGroups: Record<string, string[]> = {
		Background: ['body', 'surface', 'card', 'muted', 'popover', 'inverted'].map(
			(n) => `--color-background-${n}`
		),
		Text: ['primary', 'secondary', 'disabled', 'accent', 'error', 'success', 'warning', 'info'].map(
			(n) => `--color-text-${n}`
		),
		Accent: ['--color-accent', '--color-accent-muted', '--color-on-accent'],
		Status: ['error', 'success', 'warning', 'info'].flatMap((n) => [
			`--color-${n}`,
			`--color-${n}-muted`
		]),
		Border: ['', '-emphasized', '-error', '-success', '-warning', '-info'].map(
			(n) => `--color-border${n}`
		)
	};
	const typeStyles = [
		'display-1', 'display-2', 'display-3',
		'heading-1', 'heading-2', 'heading-3', 'heading-4', 'heading-5', 'heading-6',
		'large', 'body', 'label', 'supporting', 'code'
	];
	const spacing = ['0-5', '1', '1-5', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
	const radii = ['inner', 'element', 'container', 'page', 'full'];
	const shadows = ['low', 'med', 'high'];
</script>

<svelte:head><title>canon-svelte · Tokens</title></svelte:head>

<h1>Tokens</h1>
<p class="lead">
	Astryx design tokens and the neutral theme, running in Svelte. Switch the mode above to check dark
	values.
</p>

<section>
	<h2>Color</h2>
	{#each Object.entries(colorGroups) as [group, vars]}
		<h3>{group}</h3>
		<div class="swatches">
			{#each vars as v}
				<div class="swatch">
					<div class="chip" style:background="var({v})"></div>
					<code>{v}</code>
				</div>
			{/each}
		</div>
	{/each}
</section>

<section>
	<h2>Typography</h2>
	{#each typeStyles as t}
		<div
			class="type-row"
			style:font-size="var(--text-{t}-size)"
			style:font-weight="var(--text-{t}-weight)"
			style:line-height="var(--text-{t}-leading)"
		>
			<span>The quick brown fox</span><code>--text-{t}</code>
		</div>
	{/each}
</section>

<section>
	<h2>Spacing</h2>
	{#each spacing as s}
		<div class="space-row">
			<code>--spacing-{s}</code>
			<div class="bar" style:width="var(--spacing-{s})"></div>
		</div>
	{/each}
</section>

<section>
	<h2>Radius and shadow</h2>
	<div class="boxes">
		{#each radii as r}
			<div class="box" style:border-radius="var(--radius-{r})"><code>--radius-{r}</code></div>
		{/each}
		{#each shadows as s}
			<div class="box shadow" style:box-shadow="var(--shadow-{s})"><code>--shadow-{s}</code></div>
		{/each}
	</div>
</section>

<style>
	.lead {
		color: var(--color-text-secondary);
		margin-top: var(--spacing-2);
	}
	section {
		margin-top: var(--spacing-10);
	}
	h3 {
		margin: var(--spacing-6) 0 var(--spacing-3);
	}
	code {
		font-size: var(--text-supporting-size);
		color: var(--color-text-secondary);
	}
	.swatches {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
		gap: var(--spacing-3);
	}
	.chip {
		height: 48px;
		border-radius: var(--radius-element);
		border: 1px solid var(--color-border);
		margin-bottom: var(--spacing-1);
	}
	.type-row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: var(--spacing-4);
		padding: var(--spacing-2) 0;
		border-bottom: 1px solid var(--color-border);
	}
	.space-row {
		display: grid;
		grid-template-columns: 140px 1fr;
		align-items: center;
		padding: var(--spacing-1) 0;
	}
	.bar {
		height: 12px;
		background: var(--color-accent);
		border-radius: var(--radius-inner);
	}
	.boxes {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: var(--spacing-4);
	}
	.box {
		height: 96px;
		display: grid;
		place-items: center;
		background: var(--color-background-surface);
		border: 1px solid var(--color-border);
	}
	.shadow {
		border: none;
		border-radius: var(--radius-container);
	}
</style>
