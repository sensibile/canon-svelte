<!--
  Internal: the chrome Selector and MultiSelector share. Ports the trigger box, field wrapper,
  popover and search row of Astryx's Selector/MultiSelector (packages/core/src/Selector,
  packages/core/src/MultiSelector), MIT, Meta Platforms, Inc.
  The owner renders the trigger button and the listbox, and keeps all selection state; the shell
  handles layout, light dismiss, focusing the search field on open and scrolling the active
  option into view.
-->
<script lang="ts" module>
	export function selectorIds(uid: string) {
		return {
			trigger: `${uid}-trigger`,
			listbox: `${uid}-listbox`,
			description: `${uid}-desc`,
			statusMessage: `${uid}-status`,
			fieldLabel: `${uid}-label`,
			inputLabel: `${uid}-input-label`,
			valueText: `${uid}-value`,
			readOnly: `${uid}-readonly`,
			disabledMessage: `${uid}-disabled-reason`,
			search: `${uid}-search`,
			item: (index: number) => `${uid}-listbox-item-${index}`
		};
	}

	export interface SelectorShellSearch {
		query: string;
		placeholder: string;
		label: string;
		isRequired: boolean;
		activeDescendant: string | undefined;
		oninput: (value: string) => void;
		onkeydown: (e: KeyboardEvent) => void;
		/** Closes the list, e.g. when Tab leaves the search row's clear button. */
		ondismiss: () => void;
	}
</script>

<script lang="ts">
	import { tick, type Snippet } from 'svelte';
	import Field from '../Field/Field.svelte';
	import type { FieldStatusPlacement } from '../Field/types.js';
	import Icon, { type IconComponent } from '../Icon/Icon.svelte';
	import type { IconName } from '../Icon/defaultIcons.js';
	import Spinner from '../Spinner/Spinner.svelte';
	import Button from '../Button/Button.svelte';
	import Divider from '../Divider/Divider.svelte';
	import Layer from '../Layer/Layer.svelte';
	import VisuallyHidden from '../VisuallyHidden/VisuallyHidden.svelte';
	import Tooltip from '../Tooltip/Tooltip.svelte';
	import { pushLayer } from '../../internal/layerStack.js';
	import type { LayerPlacement } from '../../internal/position.js';
	import type { SizeValue } from '../../types.js';
	import { INPUT_GROUP_ITEM, type InputGroupContext } from '../InputGroup/context.js';

	interface Props {
		uid: string;
		/** Class prefix for theming hooks, e.g. "astryx-selector". */
		kind: string;
		label: string;
		isLabelHidden: boolean;
		description?: string;
		isOptional: boolean;
		isRequired: boolean;
		labelTooltip?: string;
		width?: SizeValue;
		containerClass?: string;
		controlClass?: string;
		status?: { type: 'warning' | 'error' | 'success'; message?: string };
		statusVariant: FieldStatusPlacement;
		isDisabled: boolean;
		isReadOnly: boolean;
		disabledMessage?: string;
		variant: 'input' | 'secondary' | 'ghost';
		size: 'sm' | 'md' | 'lg';
		startIcon?: IconName | IconComponent;
		isLoading: boolean;
		isPlaceholder: boolean;
		inputGroup: InputGroupContext | null;
		open: boolean;
		placement: LayerPlacement;
		/** Shown as a clear button when set. */
		clearLabel?: string | null;
		onclear?: (e: MouseEvent) => void;
		onControlClick: (e: MouseEvent) => void;
		/** Dismissal by a press outside the control and the popover. */
		onDismiss: () => void;
		/** The option id to keep scrolled into view. */
		activeOptionId?: string;
		announcement: string;
		search?: SelectorShellSearch | null;
		/** The trigger's resolved id (a consumer `id` or the generated one), for the label's `for`. */
		triggerId: string;
		trigger: Snippet;
		listbox: Snippet;
		/** Extra hidden content inside the control, such as form inputs. */
		hidden?: Snippet;
		control?: HTMLDivElement;
		surface?: HTMLDivElement;
		searchInput?: HTMLInputElement;
	}

	let {
		uid,
		triggerId,
		kind,
		label,
		isLabelHidden,
		description,
		isOptional,
		isRequired,
		labelTooltip,
		width,
		containerClass,
		controlClass,
		status,
		statusVariant,
		isDisabled,
		isReadOnly,
		disabledMessage,
		variant,
		size,
		startIcon,
		isLoading,
		isPlaceholder,
		inputGroup,
		open,
		placement,
		clearLabel,
		onclear,
		onControlClick,
		onDismiss,
		activeOptionId,
		announcement,
		search,
		trigger,
		listbox,
		hidden,
		control = $bindable(),
		surface = $bindable(),
		searchInput = $bindable()
	}: Props = $props();

	const ids = $derived(selectorIds(uid));
	const showsDisabledMessage = $derived(isDisabled && !!disabledMessage);
	const hasSearch = $derived(search != null);

	// Focus the search field when the list opens with search.
	$effect(() => {
		if (!open || !hasSearch) return;
		tick().then(() => {
			const input = searchInput;
			if (!input) return;
			input.focus({ preventScroll: true });
			input.setSelectionRange(input.value.length, input.value.length);
		});
	});

	// Light dismiss: a press outside the control and the popover closes it.
	$effect(() => {
		const el = surface;
		if (!open || !el) return;
		const doc = el.ownerDocument;
		const layer = pushLayer();
		const onPointerDown = (e: PointerEvent) => {
			if (!layer.isTop()) return;
			const t = e.target as Node;
			if (el.contains(t) || control?.contains(t)) return;
			onDismiss();
		};
		doc.addEventListener('pointerdown', onPointerDown, true);
		return () => {
			layer.remove();
			doc.removeEventListener('pointerdown', onPointerDown, true);
		};
	});

	$effect(() => {
		if (!open || !activeOptionId || !surface) return;
		surface.querySelector(`#${CSS.escape(activeOptionId)}`)?.scrollIntoView({ block: 'nearest' });
	});

	function controlClick(e: MouseEvent) {
		// Clicks on the clear button don't toggle the list.
		if ((e.target as Element).closest('[data-selector-keep-open]')) return;
		onControlClick(e);
	}
</script>

{#snippet body()}
	<Tooltip content={disabledMessage ?? ''} isEnabled={showsDisabledMessage} focusTrigger="always">
		<!-- The whole control is the hit area; the trigger button inside owns focus and keys. -->
		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
		<div
			bind:this={control}
			class={[kind, 'astryx-selector-control', 'control', controlClass]}
			class:in-group={inputGroup != null}
			class:disabled={isDisabled}
			class:readonly={isReadOnly}
			class:placeholder={isPlaceholder}
			class:open
			data-variant={variant}
			data-size={size}
			data-status={status?.type}
			data-disabled={isDisabled ? 'disabled' : undefined}
			data-readonly={isReadOnly ? 'readonly' : undefined}
			{...{ [INPUT_GROUP_ITEM]: inputGroup ? '' : undefined }}
			onclick={controlClick}
		>
			{#if startIcon}<Icon icon={startIcon} size="sm" color="secondary" />{/if}
			{#if inputGroup}<VisuallyHidden id={ids.inputLabel}>{label}</VisuallyHidden>{/if}
			{#if isReadOnly}<VisuallyHidden id={ids.readOnly}>Read only</VisuallyHidden>{/if}
			{@render trigger()}
			{@render hidden?.()}
			{#if isLoading}<Spinner size="sm" aria-hidden="true" />{/if}
			{#if clearLabel != null && !isDisabled && !isReadOnly}
				<span class="clear" data-selector-keep-open>
					<Button
						class="astryx-input-clear-button input-clear"
						variant="ghost"
						size="sm"
						label={clearLabel}
						icon="close"
						isIconOnly
						onmousedown={(e) => e.preventDefault()}
						onclick={(e) => {
							e.stopPropagation();
							onclear?.(e);
						}}
					/>
				</span>
			{/if}
			{#if status && statusVariant !== 'detached'}
				<Icon icon={status.type} size="sm" color={status.type} />
			{:else if !isReadOnly}
				<span class="{kind}-indicator-icon chevron" data-state={open ? 'expanded' : 'collapsed'}>
					<Icon icon="chevronDown" size="sm" color="secondary" />
				</span>
			{/if}
		</div>
	</Tooltip>
	{#if showsDisabledMessage}<VisuallyHidden id={ids.disabledMessage}>{disabledMessage}</VisuallyHidden>{/if}
	<VisuallyHidden><span aria-live="polite" aria-atomic="true">{announcement}</span></VisuallyHidden>

	{#if !isReadOnly}
		<Layer
			open={open && control != null}
			anchor={control}
			{placement}
			alignment="start"
			offset={4}
			matchAnchorWidth
			bind:element={surface}
			class="astryx-selector-popup {kind}-popup"
		>
			{#if search}
				<div class="search-panel">
					<div class="search-row">
						<Icon icon="search" size="sm" color="secondary" />
						<input
							bind:this={searchInput}
							id={ids.search}
							class="{kind}-search search"
							type="text"
							role="combobox"
							aria-label={search.label}
							aria-required={search.isRequired || undefined}
							aria-expanded={open}
							aria-controls={ids.listbox}
							aria-autocomplete="list"
							aria-activedescendant={search.activeDescendant}
							autocomplete="off"
							spellcheck="false"
							placeholder={search.placeholder}
							value={search.query}
							oninput={(e) => search.oninput(e.currentTarget.value)}
							onkeydown={(e) => search.onkeydown(e)}
						/>
						{#if search.query}
							<!-- Forward Tab from the search input lands here (the list stays open); Tab past it closes. -->
							<Button
								class="search-clear"
								variant="ghost"
								size="sm"
								label="Clear search"
								icon="close"
								isIconOnly
								onclick={() => {
									search.oninput('');
									searchInput?.focus();
								}}
								onkeydown={(e: KeyboardEvent) => {
									if (e.key === 'Tab' && !e.shiftKey) search.ondismiss();
								}}
							/>
						{/if}
					</div>
					<Divider />
					<div class="listbox-wrap" class:input={variant === 'input'}>{@render listbox()}</div>
				</div>
			{:else}
				<div class="listbox-wrap" class:input={variant === 'input'}>{@render listbox()}</div>
			{/if}
		</Layer>
	{/if}
{/snippet}

{#if inputGroup}
	{@render body()}
{:else}
	<Field
		class={containerClass}
		{label}
		{isLabelHidden}
		{description}
		inputID={triggerId}
		labelID={ids.fieldLabel}
		descriptionID={description ? ids.description : undefined}
		{isOptional}
		{isRequired}
		{isDisabled}
		{labelTooltip}
		status={status
			? { type: status.type, message: status.message, messageID: status.message ? ids.statusMessage : undefined }
			: undefined}
		{statusVariant}
		{width}
	>
		{@render body()}
	</Field>
{/if}

<style>
	@layer astryx-base {
		.control {
			box-sizing: border-box;
			position: relative;
			z-index: 1;
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: var(--spacing-2);
			width: 100%;
			padding-inline: var(--spacing-3);
			border: var(--border-width) solid var(--color-border-emphasized);
			--_field-radius: var(--radius-element);
			border-radius: var(--_field-radius);
			background-color: var(--color-background-surface);
			font-family: var(--font-family-body);
			font-size: var(--text-label-size);
			color: var(--color-text-primary);
			cursor: pointer;
			transition-property: border-color, box-shadow;
			transition-duration: var(--duration-fast);
			transition-timing-function: var(--ease-standard);
			--_line: max(var(--spacing-5), 20px, 1rem);
			line-height: var(--_line);
		}
		@media (pointer: coarse) {
			@supports (-webkit-touch-callout: none) {
				.control { font-size: max(1rem, var(--text-label-size)); }
			}
		}
		@media (prefers-reduced-motion: reduce), (pointer: coarse) {
			.control { transition-duration: 0s; }
		}
		.control[data-size='sm'] { min-height: var(--size-element-sm); padding-block: calc((var(--size-element-sm) - var(--_line) - 2 * var(--border-width)) / 2); }
		.control[data-size='md'] { min-height: var(--size-element-md); padding-block: calc((var(--size-element-md) - var(--_line) - 2 * var(--border-width)) / 2); }
		.control[data-size='lg'] { min-height: var(--size-element-lg); padding-block: calc((var(--size-element-lg) - var(--_line) - 2 * var(--border-width)) / 2); }

		@media (hover: hover) {
			.control[data-variant='input']:not(.disabled, .readonly):hover:not(:focus-within) {
				box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--color-border-emphasized) 30%, transparent);
			}
			.control[data-variant='input'][data-status='warning']:not(.disabled):hover:not(:focus-within) { box-shadow: var(--shadow-inset-warning); }
			.control[data-variant='input'][data-status='error']:not(.disabled):hover:not(:focus-within) { box-shadow: var(--shadow-inset-error); }
			.control[data-variant='input'][data-status='success']:not(.disabled):hover:not(:focus-within) { box-shadow: var(--shadow-inset-success); }
		}
		.control[data-variant='input']:focus-within:not(.disabled) {
			border-color: var(--color-accent);
			box-shadow: inset 0 0 0 2px var(--color-accent-muted);
		}
		@media (forced-colors: active) {
			.control:focus-within { border-color: Highlight; }
		}
		.control[data-variant='input'][data-status='warning'] { border-color: var(--color-border-warning); }
		.control[data-variant='input'][data-status='error'] { border-color: var(--color-border-error); }
		.control[data-variant='input'][data-status='success'] { border-color: var(--color-border-success); }

		.control[data-variant='secondary'],
		.control[data-variant='ghost'] {
			width: fit-content;
			max-width: 100%;
			border-width: 0;
			font-weight: var(--font-weight-medium);
			background-image: linear-gradient(var(--_overlay, transparent), var(--_overlay, transparent));
			transition-property: background-image, background-color, color, opacity, transform;
			transform: scale(1);
		}
		.control[data-variant='secondary'] { background-color: var(--color-neutral); }
		.control[data-variant='ghost'] { background-color: transparent; }
		@media (hover: hover) {
			.control:is([data-variant='secondary'], [data-variant='ghost']):not(.disabled, .readonly):hover { --_overlay: var(--color-overlay-hover); }
		}
		.control:is([data-variant='secondary'], [data-variant='ghost']):not(.disabled, .readonly):active:not(.open) { transform: scale(0.98); --_overlay: var(--color-overlay-pressed); }
		.control:is([data-variant='secondary'], [data-variant='ghost']).open { --_overlay: var(--color-overlay-pressed); }
		.control:is([data-variant='secondary'], [data-variant='ghost']):has(:global(.focus-owner:focus-visible)) {
			outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color);
			outline-offset: var(--focus-outline-offset, 2px);
		}

		.disabled { cursor: default; opacity: 0.5; }
		.control[data-variant='input'].disabled { border-color: var(--color-border-emphasized); box-shadow: none; }
		.readonly { cursor: default; }
		.in-group { flex: 1; min-width: 0; min-height: 0; padding-block: 0; }
		.in-group.disabled { opacity: 1; }

		.clear { display: inline-flex; }
		.control :global(.input-clear) { height: 20px; color: var(--color-icon-secondary); }
		.chevron {
			display: inline-flex;
			flex-shrink: 0;
			transition: transform var(--duration-fast) var(--ease-standard);
		}
		.open .chevron { transform: rotate(180deg); }
		@media (prefers-reduced-motion: reduce) {
			.chevron { transition: none; }
		}

		:global(.astryx-layer.astryx-selector-popup) {
			box-sizing: border-box;
			display: flex;
			flex-direction: column;
			max-height: calc(100vh - 16px);
			background-color: var(--color-background-popover);
			color: var(--color-text-primary);
			border-radius: var(--radius-container);
			box-shadow: var(--shadow-low);
			overflow: hidden;
		}
		@media (forced-colors: active) {
			:global(.astryx-layer.astryx-selector-popup) { border: 1px solid CanvasText; }
		}
		.search-panel { display: flex; flex-direction: column; min-height: 0; max-height: calc(100vh - 16px); }
		.search-row {
			display: flex;
			align-items: center;
			gap: var(--spacing-2);
			padding: var(--spacing-2) var(--spacing-3);
		}
		.search {
			flex: 1;
			min-width: 0;
			border: 0 none;
			padding: 0;
			font-family: var(--font-family-body);
			font-size: var(--text-body-size);
			line-height: var(--text-body-leading);
			color: var(--color-text-primary);
			background: transparent;
			outline: none;
		}
		.search::placeholder { color: var(--color-text-secondary); }
		.listbox-wrap {
			box-sizing: border-box;
			display: flex;
			flex-direction: column;
			min-height: 0;
			max-height: min(300px, calc(100vh - 16px));
			overflow-y: auto;
			overscroll-behavior: contain;
			padding: var(--spacing-1);
			touch-action: pan-y pinch-zoom;
		}
		.listbox-wrap.input { padding-inline: calc(var(--spacing-1) + var(--border-width)); }
		/* Listbox internals the owners render. */
		.listbox-wrap :global(.selector-listbox) { outline: none; }
		.listbox-wrap :global(.selector-empty) {
			padding: var(--spacing-3);
			text-align: center;
			color: var(--color-text-secondary);
			font-family: var(--font-family-body);
			font-size: var(--text-label-size);
			line-height: var(--text-label-leading);
		}
		.listbox-wrap :global(.selector-heading) {
			padding-block: var(--spacing-1);
			padding-inline: var(--spacing-2);
			font-family: var(--font-family-body);
			font-size: var(--text-supporting-size);
			line-height: var(--text-supporting-leading);
			color: var(--color-text-secondary);
			user-select: none;
		}
		.listbox-wrap :global(.selector-divider) { margin-block: var(--spacing-1); }

		/* The trigger button the owners render. */
		.control :global(.selector-trigger) {
			display: flex;
			align-items: center;
			gap: var(--spacing-2);
			flex: 1 1 0;
			min-width: 0;
			padding: 0;
			margin: 0;
			border: 0 none;
			background-color: transparent;
			font: inherit;
			line-height: inherit;
			color: inherit;
			cursor: inherit;
			outline: none;
			text-align: start;
		}
		.control:not([data-variant='input']) :global(.selector-trigger) { flex: 1 1 auto; }
		.in-group :global(.selector-trigger) { align-self: stretch; }
		.placeholder :global(.selector-trigger) { color: var(--color-text-secondary); }
		.control :global(.selector-value-text) {
			flex-grow: 1;
			min-width: 0;
			overflow: hidden;
			text-overflow: ellipsis;
			white-space: nowrap;
			text-align: start;
		}
	}
</style>
