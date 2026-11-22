<!--
  Internal: the copy button of a Timestamp details row. Port of `CopyButton` in Astryx
  `TimestampHoverCard` (packages/core/src/Timestamp/TimestampHoverCard.tsx) and its clipboard
  hook (packages/core/src/hooks/useClipboard.ts), MIT, Meta Platforms, Inc. Copies `value`, shows a
  check (or a cross on failure) for 1.5s, and announces the result politely.
  Not yet ported: the `timestamp-copy` component-icon slot.
-->
<script lang="ts">
	import IconButton from '../IconButton/IconButton.svelte';
	import VisuallyHidden from '../VisuallyHidden/VisuallyHidden.svelte';

	let { value }: { value: string } = $props();

	const COPY_FEEDBACK_MS = 1500;
	const COPIED = 'Copied';
	const COPY_FAILED = 'Failed to copy value to clipboard.';
	let status = $state<'idle' | 'copied' | 'failed'>('idle');
	let announcement = $state('');
	let resetTimer: ReturnType<typeof setTimeout> | undefined;
	$effect(() => () => clearTimeout(resetTimer));

	function clipboardWriteAllowed(): boolean {
		const doc = document as Document & { permissionsPolicy?: { allowsFeature?: (f: string) => boolean }; featurePolicy?: { allowsFeature?: (f: string) => boolean } };
		const policy = doc.permissionsPolicy ?? doc.featurePolicy;
		return typeof policy?.allowsFeature === 'function' ? policy.allowsFeature('clipboard-write') : true;
	}
	/** The legacy copy command, for documents whose policy blocks the async clipboard. */
	function copyThroughCopyCommand(text: string) {
		let written = false;
		const write = (e: ClipboardEvent) => {
			if (!e.clipboardData) return;
			e.clipboardData.setData('text/plain', text);
			e.preventDefault();
			e.stopImmediatePropagation();
			written = true;
		};
		window.addEventListener('copy', write, true);
		let copied: boolean;
		try {
			copied = document.execCommand('copy');
		} finally {
			window.removeEventListener('copy', write, true);
		}
		if (!copied || !written) throw new Error('The browser did not copy the text.');
	}
	async function writeClipboardText(text: string) {
		if (!clipboardWriteAllowed()) return copyThroughCopyCommand(text);
		try {
			await navigator.clipboard.writeText(text);
		} catch (error) {
			if (!(error instanceof DOMException && error.name === 'NotAllowedError')) throw error;
			try {
				copyThroughCopyCommand(text);
			} catch {
				throw error;
			}
		}
	}

	async function copy() {
		clearTimeout(resetTimer);
		try {
			await writeClipboardText(value);
			status = 'copied';
			announcement = COPIED;
		} catch {
			status = 'failed';
			announcement = COPY_FAILED;
		}
		resetTimer = setTimeout(() => {
			status = 'idle';
			announcement = '';
		}, COPY_FEEDBACK_MS);
	}

	const text = $derived(status === 'failed' ? COPY_FAILED : status === 'copied' ? COPIED : 'Copy');
</script>

<IconButton
	variant="ghost"
	size="sm"
	icon={status === 'failed' ? 'close' : status === 'copied' ? 'check' : 'copy'}
	tooltip={text}
	label={status === 'idle' ? `Copy ${value}` : text}
	onclick={copy}
	class="astryx-timestamp-copy-button"
/>
<VisuallyHidden aria-live="polite">{announcement}</VisuallyHidden>
