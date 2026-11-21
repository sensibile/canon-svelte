<!--
  Port of Astryx `FileInput` (packages/core/src/FileInput/FileInput.tsx), MIT, Meta Platforms, Inc.
  A compact input row or a drag-and-drop zone. Files are checked against `accept`, `maxSize`
  (bytes) and `maxFiles`; rejected files show an error status. Use `bind:value` or `onChange`.
  Not yet ported: `changeAction` (optimistic async change), the "tooltip" status variant.
-->
<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements';
	import Field from '../Field/Field.svelte';
	import type { FieldStatusInput, FieldStatusPlacement } from '../Field/types.js';
	import Icon from '../Icon/Icon.svelte';
	import Spinner from '../Spinner/Spinner.svelte';
	import Button from '../Button/Button.svelte';
	import Tooltip from '../Tooltip/Tooltip.svelte';
	import VisuallyHidden from '../VisuallyHidden/VisuallyHidden.svelte';
	import type { SizeValue } from '../../types.js';

	type FileValue = File | File[] | null;

	interface Props extends Omit<HTMLInputAttributes, 'value' | 'type' | 'multiple' | 'disabled' | 'required' | 'onchange'> {
		label: string;
		isLabelHidden?: boolean;
		value?: FileValue;
		onChange?: (files: FileValue) => void;
		/** Comma-separated extensions (".pdf") and MIME types ("image/*"). */
		accept?: string;
		isMultiple?: boolean;
		/** Largest allowed file, in bytes. */
		maxSize?: number;
		maxFiles?: number;
		isDisabled?: boolean;
		disabledMessage?: string;
		isRequired?: boolean;
		isOptional?: boolean;
		isLoading?: boolean;
		status?: FieldStatusInput;
		statusVariant?: FieldStatusPlacement;
		description?: string;
		placeholder?: string;
		mode?: 'dropzone' | 'input';
		width?: SizeValue;
		labelTooltip?: string;
		containerClass?: string;
		controlClass?: string;
	}

	let {
		label,
		isLabelHidden = false,
		value = $bindable(null),
		onChange,
		accept,
		isMultiple = false,
		maxSize,
		maxFiles,
		isDisabled = false,
		disabledMessage,
		isRequired = false,
		isOptional = false,
		isLoading = false,
		status: statusProp,
		statusVariant: statusVariantProp,
		description,
		placeholder,
		mode = 'input',
		width,
		labelTooltip,
		containerClass,
		controlClass,
		id: idProp,
		'aria-describedby': callerDescribedBy,
		form: formProp,
		...rest
	}: Props = $props();

	const uid = $props.id();
	const id = $derived(idProp ?? `${uid}-file`);
	const descriptionID = `${uid}-desc`;
	const statusMessageID = `${uid}-status`;
	const requiredID = `${uid}-required`;
	const disabledMessageID = `${uid}-disabled-reason`;
	let inputEl: HTMLInputElement | undefined = $state();
	let triggerEl: HTMLButtonElement | undefined = $state();
	let isDragOver = $state(false);
	let validationError = $state<string | null>(null);
	let announcement = $state('');

	const isDropzone = $derived(mode === 'dropzone');
	const isSelectionDisabled = $derived(isDisabled || isLoading);
	$effect(() => {
		if (isSelectionDisabled) isDragOver = false;
	});
	const showsDisabledMessage = $derived(isDisabled && !!disabledMessage);
	const status: FieldStatusInput | undefined = $derived(
		statusProp ?? (validationError ? { type: 'error', message: validationError } : undefined)
	);
	const statusVariant = $derived(statusVariantProp ?? (isDropzone ? 'detached' : 'attached'));
	const conveysRequired = $derived(isRequired && !isOptional);
	const describedBy = $derived(
		[
			callerDescribedBy,
			description ? descriptionID : null,
			status?.message ? statusMessageID : null,
			conveysRequired ? requiredID : null,
			showsDisabledMessage ? disabledMessageID : null
		]
			.filter(Boolean)
			.join(' ') || undefined
	);

	const files = $derived(value == null ? [] : Array.isArray(value) ? value : [value]);
	const hasFiles = $derived(files.length > 0);
	const fileNames = $derived(hasFiles ? files.map((f) => f.name).join(', ') : null);
	const displayPlaceholder = $derived(placeholder ?? (isMultiple ? 'Choose files' : 'Choose file'));

	const listFormat = new Intl.ListFormat('en', { type: 'conjunction' });
	const numberFormat = new Intl.NumberFormat('en', { maximumFractionDigits: 1, minimumFractionDigits: 1, useGrouping: false });
	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${numberFormat.format(bytes / 1024)} KB`;
		return `${numberFormat.format(bytes / (1024 * 1024))} MB`;
	}

	function validate(list: File[]): { valid: File[]; errors: string[] } {
		const errors: string[] = [];
		let valid = list;
		if (accept) {
			const types = accept.split(',').map((s) => s.trim().toLowerCase());
			valid = valid.filter((file) => {
				const ok = types.some((type) =>
					type.startsWith('.')
						? file.name.toLowerCase().endsWith(type)
						: type.endsWith('/*')
							? file.type.startsWith(type.slice(0, -1))
							: file.type.toLowerCase() === type
				);
				if (!ok) errors.push(`"${file.name}" is not an accepted file type`);
				return ok;
			});
		}
		if (maxSize != null) {
			valid = valid.filter((file) => {
				if (file.size > maxSize) {
					errors.push(`"${file.name}" exceeds ${formatFileSize(maxSize)} limit`);
					return false;
				}
				return true;
			});
		}
		if (isMultiple && maxFiles != null && valid.length > maxFiles) {
			errors.push(`Maximum ${maxFiles} files allowed`);
			valid = valid.slice(0, maxFiles);
		}
		return { valid, errors };
	}

	function setValue(next: FileValue) {
		value = next;
		onChange?.(next);
	}

	function handleFiles(list: File[]) {
		if (isSelectionDisabled) return;
		const { valid, errors } = validate(list);
		validationError = errors.length > 0 ? listFormat.format(errors) : null;
		if (valid.length === 0) {
			setValue(null);
			return;
		}
		setValue(isMultiple ? valid : valid[0]);
		if (errors.length === 0) {
			announcement = valid.length === 1 ? `1 file selected: ${valid[0].name}` : `${valid.length} files selected`;
		}
	}

	// Keep the native input's FileList equal to the accepted selection, so a named FileInput
	// submits what it shows (including dropped files and after validation drops some).
	function syncNativeFiles() {
		if (!inputEl) return;
		try {
			const dt = new DataTransfer();
			for (const f of files) dt.items.add(f);
			inputEl.files = dt.files;
		} catch {
			// No DataTransfer constructor (very old browsers): fall back to resetting the input.
			inputEl.value = '';
		}
	}
	$effect(() => {
		void files;
		syncNativeFiles();
	});

	function openPicker() {
		if (!isSelectionDisabled) inputEl?.click();
	}

	function handleClear(e: MouseEvent) {
		e.stopPropagation();
		validationError = null;
		setValue(null);
		if (inputEl) inputEl.value = '';
		if (e.detail === 0) triggerEl?.focus();
		else requestAnimationFrame(() => triggerEl?.focus({ preventScroll: true }));
	}

	function handleContainerClick(e: MouseEvent) {
		if (isSelectionDisabled) return;
		// Clicks on the clear button or the hidden trigger handle themselves.
		if ((e.target as HTMLElement).closest('button')) return;
		openPicker();
	}

	function onDragEnterOrOver(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		if (isSelectionDisabled) {
			if (e.dataTransfer) e.dataTransfer.dropEffect = 'none';
		} else if (isDropzone) {
			isDragOver = true;
		}
	}
	function onDragLeave(e: DragEvent & { currentTarget: HTMLElement }) {
		e.preventDefault();
		e.stopPropagation();
		if (e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget)) return;
		isDragOver = false;
	}
	function onDrop(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		isDragOver = false;
		if (isSelectionDisabled || !isDropzone) return;
		const list = Array.from(e.dataTransfer?.files ?? []);
		if (list.length > 0) handleFiles(list);
	}
</script>

<Field
	class={containerClass}
	{label}
	{isLabelHidden}
	{description}
	inputID={id}
	descriptionID={description ? descriptionID : undefined}
	{isOptional}
	{isRequired}
	{isDisabled}
	status={status
		? { type: status.type, message: status.message, messageID: status.message ? statusMessageID : undefined }
		: undefined}
	{statusVariant}
	{labelTooltip}
	{width}
>
	<Tooltip content={disabledMessage ?? ''} isEnabled={showsDisabledMessage} focusTrigger="always">
		<!-- The hidden trigger button is the keyboard and screen reader control; the box is a mouse target. -->
		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
		<div
			class={['astryx-file-input', isDropzone ? 'dropzone' : 'compact', controlClass]}
			class:selectable={!isSelectionDisabled}
			class:drag-over={isDropzone && !isSelectionDisabled && isDragOver}
			class:disabled={isDisabled}
			class:busy={isLoading}
			data-mode={mode}
			data-status={status?.type}
			onclick={handleContainerClick}
			ondragenter={isDropzone ? onDragEnterOrOver : undefined}
			ondragover={isDropzone ? onDragEnterOrOver : undefined}
			ondragleave={isDropzone ? onDragLeave : undefined}
			ondrop={isDropzone ? onDrop : undefined}
		>
			<VisuallyHidden>
				<button
					bind:this={triggerEl}
					type="button"
					aria-disabled={isSelectionDisabled ? 'true' : undefined}
					onclick={openPicker}
					aria-label={hasFiles && fileNames ? `${label}, ${fileNames}` : label}
					aria-busy={isLoading || undefined}
					aria-describedby={describedBy}
				></button>
			</VisuallyHidden>
			<input
				{...rest}
				bind:this={inputEl}
				{id}
				type="file"
				{accept}
				multiple={isMultiple}
				form={isDisabled ? '' : formProp}
				aria-hidden="true"
				tabindex={-1}
				class="hidden-input"
				onclick={(e) => {
					e.stopPropagation();
					if (isSelectionDisabled) e.preventDefault();
				}}
				onchange={(e) => {
					handleFiles(Array.from(e.currentTarget.files ?? []));
					syncNativeFiles();
				}}
			/>
			{#if isDropzone}
				{#if isLoading}
					<Spinner size="md" aria-hidden="true" />
				{:else if hasFiles}
					<div class="file-name file-name-dropzone">{fileNames}</div>
				{:else}
					<Icon icon="upload" size="md" color="secondary" />
					<span class="placeholder">{isDragOver ? 'Drop files here' : displayPlaceholder}</span>
				{/if}
			{:else}
				{#if isLoading}
					<span class="file-name">{fileNames ?? displayPlaceholder}</span>
					<Spinner size="sm" aria-hidden="true" />
				{:else}
					<Icon icon="upload" size="sm" color="secondary" />
					<span class={hasFiles ? 'file-name' : 'placeholder placeholder-compact'}>{fileNames ?? displayPlaceholder}</span>
					{#if status}<Icon icon={status.type} size="md" color={status.type} />{/if}
				{/if}
			{/if}
			{#if hasFiles && !isDisabled && !isLoading}
				<Button
					class="astryx-input-clear-button input-clear"
					variant="ghost"
					size="sm"
					label="Clear {label}"
					tooltip="Clear"
					icon="close"
					isIconOnly
					onmousedown={(e) => e.preventDefault()}
					onclick={handleClear}
				/>
			{/if}
		</div>
	</Tooltip>
	<VisuallyHidden aria-live="polite">{announcement}</VisuallyHidden>
	{#if conveysRequired}<VisuallyHidden id={requiredID}>Required</VisuallyHidden>{/if}
	{#if showsDisabledMessage}<VisuallyHidden id={disabledMessageID}>{disabledMessage}</VisuallyHidden>{/if}
</Field>

<style>
	@layer astryx-base {
		.dropzone,
		.compact {
			box-sizing: border-box;
			position: relative;
			z-index: 1;
			display: flex;
			gap: var(--spacing-2);
			border: var(--border-width) solid var(--color-border-emphasized);
			border-radius: var(--radius-element);
			background-color: var(--color-background-surface);
			transition-duration: var(--duration-fast);
			transition-timing-function: var(--ease-standard);
			cursor: pointer;
			outline: none;
		}
		@media (prefers-reduced-motion: reduce) {
			.dropzone, .compact { transition-duration: 0s; }
		}
		.dropzone:focus-within,
		.compact:focus-within { border-color: var(--color-accent); }
		.dropzone {
			flex-direction: column;
			align-items: center;
			justify-content: center;
			padding-block: var(--spacing-6);
			padding-inline: var(--spacing-4);
			border-style: dashed;
			transition-property: border-color, box-shadow, background-color;
		}
		.compact {
			align-items: center;
			padding-block: var(--spacing-1);
			padding-inline: var(--spacing-2);
			height: var(--size-element-md);
			box-shadow: none;
			transition-property: border-color, box-shadow;
		}
		@media (hover: hover) {
			.dropzone.selectable:hover,
			.compact.selectable:hover:not(:focus-within) {
				box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--color-accent) 20%, transparent);
			}
		}
		.drag-over { border-color: var(--color-accent); background-color: var(--color-accent-muted); }
		.disabled { cursor: default; opacity: 0.5; }
		.busy { cursor: default; box-shadow: none; }
		[data-status='warning'] { border-color: var(--color-border-warning); }
		[data-status='error'] { border-color: var(--color-border-error); }
		[data-status='success'] { border-color: var(--color-border-success); }

		.hidden-input {
			position: absolute;
			width: 1px;
			height: 1px;
			padding: 0;
			margin: -1px;
			overflow: hidden;
			clip: rect(0, 0, 0, 0);
			white-space: nowrap;
			border-width: 0;
		}
		.placeholder,
		.file-name {
			font-family: var(--font-family-body);
			font-size: var(--text-body-size);
			line-height: var(--text-body-leading);
		}
		@media (pointer: coarse) {
			@supports (-webkit-touch-callout: none) {
				.placeholder, .file-name { font-size: max(1rem, var(--text-body-size)); }
			}
		}
		.placeholder { color: var(--color-text-secondary); text-align: center; user-select: none; }
		.placeholder-compact { text-align: start; flex: 1; min-width: 0; }
		.file-name {
			color: var(--color-text-primary);
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			flex: 1;
			min-width: 0;
			text-align: start;
		}
		.file-name-dropzone { text-align: center; white-space: normal; }
		.compact :global(.input-clear) { height: 20px; color: var(--color-icon-secondary); }
	}
</style>
