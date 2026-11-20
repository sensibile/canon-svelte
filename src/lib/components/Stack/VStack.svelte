<!-- Port of Astryx `VStack`: a vertical Stack. MIT, Meta Platforms, Inc. -->
<script lang="ts">
	import Stack, { type StackCrossAlignment, type StackMainAlignment } from './Stack.svelte';
	import type { ComponentProps } from 'svelte';

	type Props = Omit<ComponentProps<typeof Stack>, 'direction' | 'hAlign' | 'vAlign'> & {
		hAlign?: StackCrossAlignment;
		vAlign?: StackMainAlignment;
	};

	let { hAlign, vAlign, justify, align, ...rest }: Props = $props();
</script>

<Stack {...rest} direction="vertical" hAlign={hAlign ?? align} vAlign={vAlign ?? justify} />
