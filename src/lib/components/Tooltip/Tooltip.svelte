<!--
  Port of Astryx `Tooltip` / `useTooltip` (packages/core/src/Tooltip), MIT, Meta Platforms, Inc.
  Wraps its trigger (the first element inside) and shows `content` on hover after `delay`,
  on keyboard focus, and hides on leave, blur or Escape. The trigger gets aria-describedby.
  Not yet ported: touch long-press trigger.
-->
<script lang="ts" module>
	export type TooltipFocusTrigger = 'auto' | 'always' | 'never';
</script>

<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import Layer from '../Layer/Layer.svelte';
	import { observeChildren } from '../../internal/observeChildren.js';
	import type { LayerAlignment, LayerPlacement } from '../../internal/position.js';

	interface Props {
		/** Tooltip text, or a snippet for rich content. */
		content: string | Snippet;
		placement?: LayerPlacement;
		alignment?: LayerAlignment;
		/** ms before showing on hover. */
		delay?: number;
		/** ms before hiding after the pointer leaves. */
		hideDelay?: number;
		/** "auto" shows on keyboard focus only; "always" also on pointer focus. */
		focusTrigger?: TooltipFocusTrigger;
		isEnabled?: boolean;
		/** Controlled open state. */
		isOpen?: boolean;
		isDefaultOpen?: boolean;
		onOpenChange?: (open: boolean) => void;
		/** Dashed underline on the trigger; "auto" applies it to plain-text triggers. */
		hasHoverIndication?: 'auto' | boolean;
		/** Position against this element instead of the wrapped trigger. */
		anchor?: HTMLElement | null;
		children?: Snippet;
	}

	let {
		content,
		placement = 'above',
		alignment = 'center',
		delay = 200,
		hideDelay = 0,
		focusTrigger = 'auto',
		isEnabled = true,
		isOpen,
		isDefaultOpen = false,
		onOpenChange,
		hasHoverIndication = 'auto',
		anchor,
		children
	}: Props = $props();

	const uid = $props.id();
	const tooltipId = `${uid}-tooltip`;
	let wrapper: HTMLElement | undefined = $state();
	// Default-open is read once at mount, like an uncontrolled default.
	let internalOpen = $state(false);
	$effect.pre(() => {
		internalOpen = untrack(() => isDefaultOpen);
	});
	const open = $derived(isEnabled && (isOpen ?? internalOpen));
	let showTimer: ReturnType<typeof setTimeout> | undefined;
	let hideTimer: ReturnType<typeof setTimeout> | undefined;

	// The trigger is the first element inside the wrapper; plain text gets an inline wrapper instead.
	let trigger = $state<HTMLElement | null>(null);
	let textOnly = $state(false);
	$effect(() => {
		const root = wrapper;
		if (!root) return;
		// Re-resolve when the child is swapped (e.g. a Button switching between <a> and <button>).
		return observeChildren(root, () => {
			const first = root.firstElementChild as HTMLElement | null;
			textOnly = first == null;
			trigger = first ?? root;
		});
	});
	const anchorEl = $derived(anchor ?? trigger);
	const showIndication = $derived(hasHoverIndication === true || (hasHoverIndication === 'auto' && textOnly));

	// Describe the trigger by the tooltip while it's showing.
	$effect(() => {
		const el = trigger;
		if (!el || !open) return;
		const prev = el.getAttribute('aria-describedby');
		const ids = new Set((prev ?? '').split(/\s+/).filter(Boolean));
		if (ids.has(tooltipId)) return;
		el.setAttribute('aria-describedby', [...ids, tooltipId].join(' '));
		return () => {
			if (prev == null) el.removeAttribute('aria-describedby');
			else el.setAttribute('aria-describedby', prev);
		};
	});

	function setOpen(next: boolean) {
		if (!isEnabled && next) return;
		if (internalOpen === next && isOpen === undefined) return;
		internalOpen = next;
		onOpenChange?.(next);
	}
	function clearTimers() {
		clearTimeout(showTimer);
		clearTimeout(hideTimer);
	}
	function scheduleShow(ms = delay) {
		clearTimers();
		showTimer = setTimeout(() => setOpen(true), ms);
	}
	// With no hideDelay, a short grace lets the pointer cross the gap onto the tooltip (WCAG 1.4.13).
	const HOVER_BRIDGE_DELAY = 100;
	function scheduleHide(ms = hideDelay) {
		clearTimers();
		if (ms <= 0) setOpen(false);
		else hideTimer = setTimeout(() => setOpen(false), ms);
	}

	function onpointerover(e: PointerEvent) {
		if (e.pointerType === 'touch') return;
		scheduleShow();
	}
	function onpointerout(e: PointerEvent) {
		if (wrapper?.contains(e.relatedTarget as Node)) return;
		scheduleHide(hideDelay > 0 ? hideDelay : HOVER_BRIDGE_DELAY);
	}
	function onfocusin(e: FocusEvent) {
		if (focusTrigger === 'never') return;
		const target = e.target as HTMLElement;
		if (focusTrigger === 'auto' && !target.matches(':focus-visible')) return;
		scheduleShow(0);
	}
	function onfocusout(e: FocusEvent) {
		if (wrapper?.contains(e.relatedTarget as Node)) return;
		scheduleHide(0);
	}
	function onpointerdown() {
		// Pressing the trigger dismisses the tooltip, like Astryx.
		clearTimers();
		setOpen(false);
	}

	$effect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				clearTimers();
				setOpen(false);
			}
		};
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	});
	$effect(() => clearTimers);
</script>

<!-- A plain-text trigger is a focus stop so keyboard users can reach its tooltip. -->
<!-- svelte-ignore a11y_no_static_element_interactions, a11y_no_noninteractive_tabindex -->
<span
	bind:this={wrapper}
	class="tooltip-trigger"
	class:inline={textOnly}
	class:indication={showIndication}
	tabindex={textOnly && focusTrigger !== 'never' && isEnabled ? 0 : undefined}
	{onpointerover}
	{onpointerout}
	{onfocusin}
	{onfocusout}
	{onpointerdown}
>
	{@render children?.()}
</span>

<Layer
	open={open && anchorEl != null}
	anchor={anchorEl}
	{placement}
	{alignment}
	offset={4}
	id={tooltipId}
	role="tooltip"
	class="astryx-tooltip"
	onpointerenter={() => clearTimers()}
	onpointerleave={() => scheduleHide(hideDelay > 0 ? hideDelay : HOVER_BRIDGE_DELAY)}
>
	<div class="content">
		{#if typeof content === 'function'}{@render content()}{:else}{content}{/if}
	</div>
</Layer>

<style>
	@layer astryx-base {
		.tooltip-trigger { display: contents; }
		.inline { display: inline; }
		.indication {
			text-decoration-line: underline;
			text-decoration-style: dashed;
			text-decoration-color: var(--color-border-emphasized);
			text-underline-offset: 2px;
		}
		:global(.astryx-layer.astryx-tooltip) {
			background-color: var(--color-background-inverted);
			color: var(--color-background-surface);
			border-radius: var(--radius-container);
			font-family: var(--font-family-body);
			font-size: var(--text-body-size);
			line-height: var(--text-body-leading);
		}
		.content {
			padding-block: var(--spacing-1);
			padding-inline: var(--spacing-2);
			max-width: 300px;
			word-break: break-word;
		}
	}
</style>
