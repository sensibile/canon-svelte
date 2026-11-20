<script lang="ts">
	import {
		Badge,
		Button,
		CheckboxInput,
		Divider,
		Heading,
		HStack,
		Icon,
		IconButton,
		Link,
		Spinner,
		Switch,
		Text,
		TextInput,
		VStack,
		defaultIcons,
		type BadgeVariant,
		type CheckboxValue,
		type IconName
	} from '#lib';

	let name = $state('');
	let email = $state('not-an-email');
	let search = $state('svelte');
	let agree = $state<CheckboxValue>(true);
	let partial = $state<CheckboxValue>('indeterminate');
	let notify = $state(true);
	let compact = $state(false);
	let saves = $state(0);

	const badgeVariants: BadgeVariant[] = [
		'neutral', 'info', 'success', 'warning', 'error',
		'blue', 'cyan', 'gray', 'green', 'orange', 'pink', 'purple', 'red', 'teal', 'yellow'
	];
	const iconNames = Object.keys(defaultIcons).filter((n) => !n.includes(':')) as IconName[];

	const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
</script>

<svelte:head><title>canon-svelte · Components</title></svelte:head>

<VStack gap={10}>
	<VStack gap={2}>
		<Heading level={1}>Components</Heading>
		<Text type="supporting">Step 2 of the Astryx port: core content, action and form components.</Text>
	</VStack>

	<section>
		<Heading level={2}>Button</Heading>
		<VStack gap={4} class="demo">
			<HStack gap={2} wrap="wrap" align="center">
				<Button label="Primary" variant="primary" />
				<Button label="Secondary" />
				<Button label="Ghost" variant="ghost" />
				<Button label="Destructive" variant="destructive" />
				<Button label="Disabled" isDisabled />
				<Button label="Loading" variant="primary" isLoading />
			</HStack>
			<HStack gap={2} wrap="wrap" align="center">
				<Button label="Small" size="sm" icon="check" />
				<Button label="Medium" icon="search" />
				<Button label="Large" size="lg" icon="upload" variant="primary" />
				<Button label="Elevated" elevation="med" />
				<Button label="Docs" href="https://astryx.atmeta.com" target="_blank" variant="ghost" icon="externalLink" />
				<Button
					label={saves ? `Saved ${saves}×` : 'Save (async)'}
					variant="primary"
					clickAction={async () => {
						await wait(1200);
						saves += 1;
					}}
				/>
			</HStack>
			<HStack gap={2} align="center">
				<IconButton label="Close" icon="close" size="sm" variant="ghost" />
				<IconButton label="Menu" icon="menu" />
				<IconButton label="Copy" icon="copy" variant="primary" size="lg" />
				<IconButton label="More" icon="moreHorizontal" isDisabled />
			</HStack>
		</VStack>
	</section>

	<section>
		<Heading level={2}>Text, Heading, Link</Heading>
		<VStack gap={3} class="demo">
			<Heading level={3} type="display-3">Display 3 heading</Heading>
			<Heading level={3}>Level 3 heading</Heading>
			<Text as="p">
				Body text with an inline <Link href="#top">accent link</Link>, a
				<Link href="https://github.com/meta/astryx" isExternalLink>external link</Link> and a
				<Link href="#top" color="secondary" hasUnderline>secondary underlined link</Link>.
			</Text>
			<Text type="supporting">Supporting text is secondary by default.</Text>
			<Text type="code">const code = 'monospace';</Text>
			<div style="max-width: 240px"><Text maxLines={1}>This sentence is long enough that it gets truncated with an ellipsis.</Text></div>
			<HStack gap={3}>
				<Text weight="bold">Bold</Text>
				<Text color="accent">Accent</Text>
				<Text color="disabled">Disabled</Text>
				<Text hasStrikethrough>Struck</Text>
				<Link onclick={() => saves++}>Button-like link</Link>
				<Link href="#top" isDisabled>Disabled link</Link>
			</HStack>
		</VStack>
	</section>

	<section>
		<Heading level={2}>Badge, Spinner, Icon</Heading>
		<VStack gap={4} class="demo">
			<HStack gap={2} wrap="wrap">
				{#each badgeVariants as variant (variant)}
					<Badge {variant} label={variant} />
				{/each}
				<Badge variant="success" label="With icon" icon="check" />
			</HStack>
			<HStack gap={4} align="center">
				<Spinner size="sm" />
				<Spinner />
				<Spinner size="lg" shade="subtle" />
				<Spinner size="xl" />
				<Spinner label="Loading data" />
			</HStack>
			<HStack gap={3} wrap="wrap">
				{#each iconNames as icon (icon)}
					<Icon {icon} label={icon} />
				{/each}
			</HStack>
			<HStack gap={3}>
				<Icon icon="success" color="success" size="lg" />
				<Icon icon="warning" color="warning" size="lg" />
				<Icon icon="error" color="error" size="lg" />
				<Icon icon="info" color="info" size="lg" />
			</HStack>
		</VStack>
	</section>

	<section>
		<Heading level={2}>Divider</Heading>
		<VStack gap={4} class="demo">
			<Divider />
			<Divider label="Or continue with" variant="strong" />
			<HStack gap={3} height={32} align="stretch">
				<Text>Left</Text><Divider orientation="vertical" /><Text>Right</Text>
			</HStack>
		</VStack>
	</section>

	<section>
		<Heading level={2}>Form controls</Heading>
		<div class="demo form-grid">
			<VStack gap={4}>
				<TextInput label="Name" bind:value={name} placeholder="Ada Lovelace" description="As it appears on your ID." isRequired />
				<TextInput label="Email" type="email" bind:value={email} status={{ type: 'error', message: 'Enter a valid email address.' }} />
				<TextInput label="Search" bind:value={search} startIcon="search" hasClear isOptional />
				<TextInput label="Username" value="taken" status={{ type: 'warning', message: 'Someone may already use this name.' }} statusVariant="detached" size="lg" />
				<TextInput label="Loading" value="Checking…" isLoading size="sm" />
				<TextInput label="Disabled" value="Read only" isDisabled />
			</VStack>
			<VStack gap={4}>
				<CheckboxInput label="I agree to the terms" bind:value={agree} description="You can change this later." />
				<CheckboxInput label="Select all" bind:value={partial} />
				<CheckboxInput label="Small checkbox" size="sm" />
				<CheckboxInput label="Disabled" isDisabled value={true} />
				<CheckboxInput label="Must accept" status={{ type: 'error', message: 'Required to continue.' }} isRequired />
				<Divider />
				<Switch label="Email notifications" bind:value={notify} description="Weekly summary." />
				<Switch label="Compact mode" bind:value={compact} size="sm" />
				<Switch label="Label first, spread" labelPosition="start" labelSpacing="spread" />
				<Switch label="Disabled on" isDisabled value={true} />
				<Text type="supporting">name="{name}", agree={String(agree)}, notify={notify}, compact={compact}</Text>
			</VStack>
		</div>
	</section>
</VStack>

<style>
	section :global(.demo) {
		margin-top: var(--spacing-4);
		padding: var(--spacing-6);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-container);
		background: var(--color-background-surface);
	}
	.form-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: var(--spacing-8);
	}
</style>
