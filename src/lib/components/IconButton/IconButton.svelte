<!-- Port of Astryx `IconButton`: a Button that shows only its icon; `label` is the accessible name. MIT, Meta Platforms, Inc. -->
<script lang="ts">
	import type { ComponentProps } from 'svelte';
	import Button from '../Button/Button.svelte';
	import type { IconComponent } from '../Icon/Icon.svelte';
	import type { IconName } from '../Icon/defaultIcons.js';

	type Props = Omit<ComponentProps<typeof Button>, 'isIconOnly' | 'children' | 'endContent' | 'icon'> & {
		icon: IconName | IconComponent;
	};

	let props: Props = $props();
</script>

<Button {...props} isIconOnly />
