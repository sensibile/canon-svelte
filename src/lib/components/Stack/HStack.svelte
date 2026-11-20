<!-- Port of Astryx `HStack`: a horizontal Stack. MIT, Meta Platforms, Inc. -->
<script lang="ts">
	import Stack, { type StackCrossAlignment, type StackMainAlignment } from './Stack.svelte';
	import type { ComponentProps } from 'svelte';

	type Props = Omit<ComponentProps<typeof Stack>, 'direction' | 'hAlign' | 'vAlign'> & {
		hAlign?: StackMainAlignment;
		vAlign?: StackCrossAlignment;
	};

	let { hAlign, vAlign, justify, align, ...rest }: Props = $props();
</script>

<Stack {...rest} direction="horizontal" hAlign={hAlign ?? justify} vAlign={vAlign ?? align} />
