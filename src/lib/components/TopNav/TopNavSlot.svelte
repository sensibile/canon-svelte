<!-- Internal: tells TopNav children which region (start, center, end) they render in. -->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import { setTopNavSlot, type TopNavSlot } from './context.js';

	let { slot, children }: { slot: TopNavSlot; children?: Snippet } = $props();
	// svelte-ignore state_referenced_locally (a region never changes slot)
	setTopNavSlot(slot);
</script>

{@render children?.()}
