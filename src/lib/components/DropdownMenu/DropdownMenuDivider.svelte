<!-- Port of Astryx `DropdownMenuDivider` (packages/core/src/DropdownMenu), MIT, Meta Platforms, Inc. -->
<script lang="ts">
	import Divider from '../Divider/Divider.svelte';
</script>

<div class="astryx-dropdown-menu-divider divider" role="separator" aria-orientation="horizontal">
	<Divider />
</div>

<style>
	@layer astryx-base {
		.divider { margin-block: var(--spacing-1); }
	}
</style>
