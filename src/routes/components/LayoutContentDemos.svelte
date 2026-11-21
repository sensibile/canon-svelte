<script lang="ts">
	import {
		AspectRatio,
		Avatar,
		AvatarGroup,
		AvatarGroupOverflow,
		AvatarStatusDot,
		Banner,
		Blockquote,
		Button,
		Card,
		Center,
		ClickableCard,
		Code,
		Collapsible,
		CollapsibleGroup,
		EmptyState,
		Grid,
		GridSpan,
		Heading,
		HStack,
		Icon,
		Kbd,
		MetadataList,
		MetadataListItem,
		ProgressBar,
		Section,
		Skeleton,
		StatusDot,
		Text,
		Thumbnail,
		Timestamp,
		Token,
		VStack
	} from '#lib';

	let progress = $state(40);
	let tokens = $state(['Svelte', 'Astryx', 'Design system']);
	let thumbs = $state(['Mountains', 'Lake']);
	let cardClicks = $state(0);
	let showBanner = $state(true);
	const now = Date.now();
	const thumbSrc = (seed: string) =>
		`data:image/svg+xml,${encodeURIComponent(
			`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 3"><rect width="4" height="3" fill="hsl(${seed.length * 40} 50% 60%)"/></svg>`
		)}`;
</script>

<section>
	<Heading level={2}>Card, Section, Grid</Heading>
	<VStack gap={4} class="demo">
		<Grid columns={{ minWidth: 200 }} gap={4}>
			<Card>
				<Text weight="semibold">Default card</Text>
				<Text type="supporting" display="block">Border and container padding.</Text>
			</Card>
			<Card variant="muted" elevation="low">
				<Text weight="semibold">Muted, low elevation</Text>
			</Card>
			<ClickableCard label="Open project" onclick={() => (cardClicks += 1)}>
				<Text weight="semibold">Clickable card</Text>
				<Text type="supporting" display="block">Clicked {cardClicks} times</Text>
			</ClickableCard>
		</Grid>
		<Card padding={0}>
			<Section dividers={['bottom']}><Text weight="semibold">Section header</Text></Section>
			<Section variant="muted"><Text>Muted section body</Text></Section>
		</Card>
		<Grid columns={4} gap={2}>
			<GridSpan columns={2}><div class="cell">span 2</div></GridSpan>
			<div class="cell">1</div>
			<div class="cell">1</div>
			<div class="cell">1</div>
			<GridSpan columns={3}><div class="cell">span 3</div></GridSpan>
		</Grid>
		<HStack gap={4} align="center">
			<div style="width: 160px"><AspectRatio ratio={16 / 9}><div class="fill">16:9</div></AspectRatio></div>
			<div style="width: 80px"><AspectRatio ratio={1} shape="ellipse"><div class="fill">1:1</div></AspectRatio></div>
			<Center width={160} height={90} class="outlined"><Text type="supporting">Center</Text></Center>
		</HStack>
	</VStack>
</section>

<section>
	<Heading level={2}>Avatar</Heading>
	<VStack gap={4} class="demo">
		<HStack gap={3} align="center">
			<Avatar name="Ada Lovelace" size="xsm" />
			<Avatar name="Grace Hopper" size="sm" />
			<Avatar name="Alan Turing" />
			<Avatar name="Katherine Johnson" size="lg">
				{#snippet status()}<AvatarStatusDot label="Online" />{/snippet}
			</Avatar>
			<Avatar name="Linus" size="xl" shape="rounded" />
			<Avatar alt="Broken image" src="/does-not-exist.png" />
		</HStack>
		<AvatarGroup size="sm">
			<Avatar name="Ada Lovelace" />
			<Avatar name="Grace Hopper" />
			<Avatar name="Alan Turing" />
			<AvatarGroupOverflow count={4} />
		</AvatarGroup>
	</VStack>
</section>

<section>
	<Heading level={2}>Banner</Heading>
	<VStack gap={3} class="demo">
		<Banner status="info" title="Heads up" description="Banners announce page-level information." />
		<Banner status="success" title="Saved" container="section" />
		<Banner status="warning" title="Your trial ends in 3 days">
			{#snippet endContent()}<Button label="Upgrade" size="sm" />{/snippet}
		</Banner>
		{#if showBanner}
			<Banner
				status="error"
				title="Sync failed"
				description="We couldn't reach the server. Check your connection and try again. This longer description collapses when it runs past a couple of lines, so the banner stays compact until you expand it."
				isDismissable
				onDismiss={() => (showBanner = false)}
			/>
		{:else}
			<Button label="Show error banner again" size="sm" onclick={() => (showBanner = true)} />
		{/if}
	</VStack>
</section>

<section>
	<Heading level={2}>Progress, status and loading</Heading>
	<VStack gap={4} class="demo">
		<ProgressBar label="Upload" value={progress} hasValueLabel />
		<HStack gap={2}>
			<Button label="-10" size="sm" onclick={() => (progress = Math.max(0, progress - 10))} />
			<Button label="+10" size="sm" onclick={() => (progress = Math.min(100, progress + 10))} />
		</HStack>
		<ProgressBar
			label="Steps"
			value={60}
			variant="success"
			marks={[
				{ value: 25, label: 'Draft' },
				{ value: 50, label: 'Review' },
				{ value: 75, label: 'Publish' }
			]}
		/>
		<ProgressBar label="Loading" isIndeterminate isLabelHidden />
		<HStack gap={4} align="center">
			<HStack gap={2} align="center"><StatusDot variant="success" label="Online" /><Text>Online</Text></HStack>
			<HStack gap={2} align="center"><StatusDot variant="warning" label="Degraded" isPulsing /><Text>Degraded</Text></HStack>
			<HStack gap={2} align="center"><StatusDot variant="error" label="Down" tooltip="Down since 9:00" /><Text>Down</Text></HStack>
			<StatusDot variant="neutral" label="Unknown" />
		</HStack>
		<VStack gap={2}>
			<Skeleton height={16} width="60%" />
			<Skeleton height={16} width="80%" index={1} />
			<Skeleton height={16} width="40%" index={2} />
		</VStack>
	</VStack>
</section>

<section>
	<Heading level={2}>Token, Thumbnail</Heading>
	<VStack gap={4} class="demo">
		<HStack gap={2} wrap="wrap" align="center">
			{#each tokens as t (t)}
				<Token label={t} onRemove={() => (tokens = tokens.filter((x) => x !== t))} />
			{/each}
			<Token label="Blue" color="blue" />
			<Token label="Link" href="https://astryx.atmeta.com" size="sm" />
			<Token label="Disabled" isDisabled />
		</HStack>
		<HStack gap={2}>
			{#each thumbs as t (t)}
				<Thumbnail src={thumbSrc(t)} alt={t} onRemove={() => (thumbs = thumbs.filter((x) => x !== t))} />
			{/each}
			<Thumbnail src={thumbSrc('uploading')} alt="Uploading" isLoading />
		</HStack>
	</VStack>
</section>

<section>
	<Heading level={2}>Text content</Heading>
	<VStack gap={4} class="demo">
		<Text>Inline <Code>pnpm check</Code> code and a shortcut <Kbd keys="mod+k" /> or <Kbd keys="shift+enter" />.</Text>
		<Blockquote cite="https://astryx.atmeta.com">Design systems are products, not projects.</Blockquote>
		<HStack gap={4} wrap="wrap">
			<Text>Posted <Timestamp value={now - 5 * 60_000} isLive /></Text>
			<Text>Edited <Timestamp value={now - 26 * 3600_000} format="relative_short" /></Text>
			<Text>Created <Timestamp value="2025-03-14T09:26:53Z" /></Text>
			<Timestamp
				value="2025-03-14T09:26:53Z"
				format="system_date_time"
				timezoneID="UTC"
				tooltipEntries={[
					{ label: 'UTC', timezoneID: 'UTC' },
					{ label: 'Seoul', timezoneID: 'Asia/Seoul', format: 'date_time' },
					{ label: 'Unix', format: 'unix_seconds' }
				]}
			/>
		</HStack>
	</VStack>
</section>

<section>
	<Heading level={2}>MetadataList, Collapsible, EmptyState</Heading>
	<VStack gap={4} class="demo">
		<MetadataList title="Details" maxNumOfItems={3}>
			<MetadataListItem label="Owner">Tony</MetadataListItem>
			<MetadataListItem label="Status"><Token label="Active" color="green" size="sm" /></MetadataListItem>
			<MetadataListItem label="Created"><Timestamp value="2025-03-14T09:26:53Z" format="date" /></MetadataListItem>
			<MetadataListItem label="Region">ap-northeast-2</MetadataListItem>
			<MetadataListItem label="Tier">Pro</MetadataListItem>
		</MetadataList>
		<MetadataList orientation="horizontal" columns="multi">
			<MetadataListItem label="Files">128</MetadataListItem>
			<MetadataListItem label="Size">4.2 MB</MetadataListItem>
			<MetadataListItem label="Branch">main</MetadataListItem>
		</MetadataList>
		<Collapsible trigger="Standalone collapsible">
			<Text>Open by default. Click the header to collapse.</Text>
		</Collapsible>
		<CollapsibleGroup hasDividers defaultValue="a">
			<Collapsible value="a" trigger="What is Astryx?"><Text>Meta's open source design system.</Text></Collapsible>
			<Collapsible value="b" trigger="Why Svelte?"><Text>Small runtime and scoped CSS.</Text></Collapsible>
			<Collapsible value="c" trigger="Disabled" isDisabled><Text>Hidden.</Text></Collapsible>
		</CollapsibleGroup>
		<Card>
			<EmptyState title="No results" description="Try a different search term.">
				{#snippet icon()}<Icon icon="search" size="lg" />{/snippet}
				{#snippet actions()}<Button label="Clear search" />{/snippet}
			</EmptyState>
		</Card>
	</VStack>
</section>

<style>
	.cell {
		padding: var(--spacing-2);
		border-radius: var(--radius-element);
		background: var(--color-neutral);
		text-align: center;
	}
	.fill {
		display: grid;
		place-items: center;
		width: 100%;
		height: 100%;
		background: var(--color-neutral);
	}
	:global(.outlined) {
		border: 1px dashed var(--color-border);
		border-radius: var(--radius-element);
	}
</style>
