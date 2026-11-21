<script lang="ts">
	import {
		Button,
		CheckboxList,
		CheckboxListItem,
		FileInput,
		Heading,
		InputGroup,
		InputGroupText,
		Item,
		MultiSelector,
		NumberInput,
		RadioList,
		RadioListItem,
		Selector,
		Slider,
		Text,
		TextArea,
		TextInput,
		Tokenizer,
		Typeahead,
		VStack,
		createStaticSource,
		type SearchableItem
	} from '#lib';

	let bio = $state('Designer and developer.');
	let plan = $state('pro');
	let toppings = $state<string[]>(['cheese']);
	let quantity = $state<number | null>(2);
	let price = $state<number | null>(1299.5);
	let files = $state<File | File[] | null>(null);
	let docs = $state<File | File[] | null>(null);
	let volume = $state(40);
	let budget = $state<[number, number]>([200, 600]);
	let level = $state(2);
	let itemClicks = $state(0);

	let fruit = $state<string | null>('apple');
	let sort = $state<string | null>('new');
	let city = $state<string | null>(null);
	let toppingsMulti = $state<string[]>(['cheese']);
	let labels = $state<string[]>([]);
	const cityOptions = [
		{ type: 'section' as const, title: 'Americas', options: [{ value: 'nyc', label: 'New York', description: 'United States' }, { value: 'sao', label: 'São Paulo' }] },
		{ type: 'divider' as const },
		{ type: 'section' as const, title: 'Asia', options: [{ value: 'sel', label: 'Seoul' }, { value: 'tyo', label: 'Tokyo' }, { value: 'sin', label: 'Singapore' }] }
	];
	const people: SearchableItem[] = ['Ada Lovelace', 'Alan Turing', 'Grace Hopper', 'Katherine Johnson', 'Linus Torvalds', 'Margaret Hamilton'].map(
		(label) => ({ id: label.toLowerCase().replace(/ /g, '-'), label })
	);
	const peopleSource = createStaticSource(people);
	let person = $state<SearchableItem | null>(null);
	let reviewers = $state<SearchableItem[]>([people[2]]);
</script>

<section>
	<Heading level={2}>Text and number entry</Heading>
	<div class="demo form-grid">
		<VStack gap={5}>
			<TextArea label="Bio" bind:value={bio} maxLength={40} description="Shown on your profile." />
			<TextArea label="Notes" value="" status={{ type: 'warning', message: 'Notes are public.' }} rows={2} />
		</VStack>
		<VStack gap={5}>
			<NumberInput label="Quantity" bind:value={quantity} min={0} max={10} hasNumberSteppers isIntegerOnly />
			<NumberInput
				label="Price"
				bind:value={price}
				step={0.5}
				units="USD"
				formatValue={(v) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
			/>
			<InputGroup label="Website">
				<InputGroupText>https://</InputGroupText>
				<TextInput label="Domain" placeholder="example.com" />
				<Button label="Check" />
			</InputGroup>
		</VStack>
	</div>
</section>

<section>
	<Heading level={2}>Choice lists</Heading>
	<div class="demo form-grid">
		<RadioList label="Plan" bind:value={plan} description="Change it any time.">
			<RadioListItem value="free" label="Free" description="For hobby projects" />
			<RadioListItem value="pro" label="Pro" description="For professionals" />
			<RadioListItem value="team" label="Team" isDisabled description="Coming soon" />
		</RadioList>
		<CheckboxList label="Toppings" bind:value={toppings} hasDividers>
			<CheckboxListItem value="cheese" label="Cheese" />
			<CheckboxListItem value="ham" label="Ham" description="Smoked" />
			<CheckboxListItem value="olive" label="Olive" />
		</CheckboxList>
		<VStack gap={1}>
			<Text type="label">Items</Text>
			<Item label="Clickable item" description="Clicked {itemClicks} times" onclick={() => itemClicks++} />
			<Item label="Link item" description="Opens the Astryx docs" href="https://astryx.atmeta.com" target="_blank" />
			<Item label="Selected item" isSelected />
		</VStack>
	</div>
</section>

<section>
	<Heading level={2}>Files and sliders</Heading>
	<div class="demo form-grid">
		<VStack gap={5}>
			<FileInput label="Avatar" bind:value={files} accept="image/*" maxSize={2 * 1024 * 1024} />
			<FileInput label="Documents" bind:value={docs} mode="dropzone" isMultiple maxFiles={3} />
		</VStack>
		<VStack gap={6}>
			<Slider label="Volume" bind:value={volume} />
			<Slider label="Budget" bind:value={budget} min={0} max={1000} step={50} valueDisplay="text" formatValue={(v) => `$${v}`} />
			<Slider
				label="Level"
				bind:value={level}
				min={0}
				max={4}
				marks={[
					{ value: 0, label: 'Low' },
					{ value: 2, label: 'Mid' },
					{ value: 4, label: 'High' }
				]}
			/>
		</VStack>
	</div>
</section>

<section>
	<Heading level={2}>Selection</Heading>
	<div class="demo form-grid">
		<VStack gap={5}>
			<Selector label="Fruit" bind:value={fruit} hasClear options={['apple', 'banana', 'cherry', { value: 'durian', label: 'Durian', disabled: true }]} />
			<Selector label="City" bind:value={city} hasSearch options={cityOptions} placeholder="Pick a city" />
			<Selector label="Sort" variant="secondary" isLabelHidden bind:value={sort} options={[{ value: 'new', label: 'Newest' }, { value: 'old', label: 'Oldest' }]} />
		</VStack>
		<VStack gap={5}>
			<MultiSelector label="Toppings" bind:value={toppingsMulti} hasSelectAll hasClear options={['cheese', 'ham', 'olive', 'pepper', 'onion']} />
			<MultiSelector label="Labels" bind:value={labels} hasSearch hasCreate triggerDisplay="badges" options={['bug', 'feature', 'docs']} />
		</VStack>
		<VStack gap={5}>
			<Typeahead label="Assignee" searchSource={peopleSource} bind:value={person} hasEntriesOnFocus />
			<Tokenizer label="Reviewers" searchSource={peopleSource} bind:value={reviewers} hasClear hasEntriesOnFocus />
		</VStack>
	</div>
</section>

<style>
	.form-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: var(--spacing-8);
	}
</style>
