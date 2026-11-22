<!--
  Port of Astryx `HoverCard` / `useHoverCard` (packages/core/src/HoverCard), MIT, Meta Platforms, Inc.
  Wraps its trigger (the first element inside, or plain text in a focusable span) and shows a rich,
  interactive card after `delay` on hover, on focus, or on a touch tap. The card stays open while the
  pointer or focus is inside it and hides `hideDelay` after both leave, or on Escape. Without a
  `label` the trigger is described by the card (role group); with one the card is a labelled
  dialog and the trigger gets aria-haspopup, aria-controls and aria-expanded where its role allows.
  Port changes: a controlled card's interactions request changes through onOpenChange, and focus
  on the trigger or in the card keeps it open like hover does.
  Not yet ported: the useHoverCard hook (use the component), the touch bottom-sheet presentation,
  and the tap recognizer's movement and long-press rules (a touch click counts as a tap).
-->
<script lang="ts" module>
	export type HoverCardFocusTrigger = 'auto' | 'always' | 'never';
	export type HoverCardTouchTrigger = 'auto' | 'tap' | 'none';

	const HASPOPUP_ROLES = new Set(['application', 'button', 'combobox', 'gridcell', 'link', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'searchbox', 'slider', 'tab', 'textbox', 'treeitem']);
	const EXPANDABLE_ROLES = new Set(['application', 'button', 'checkbox', 'columnheader', 'combobox', 'gridcell', 'link', 'listbox', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'row', 'rowheader', 'switch', 'tab', 'treeitem']);
	const ACTION_ROLES = new Set(['button', 'checkbox', 'combobox', 'link', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'option', 'radio', 'searchbox', 'slider', 'spinbutton', 'switch', 'tab', 'textbox']);
	const BUTTON_INPUT_TYPES = new Set(['button', 'submit', 'reset', 'image']);
	const TEXT_INPUT_TYPES = new Set(['text', 'search', 'email', 'tel', 'url']);

	/** Which popup attributes a trigger's role supports. */
	function popupTriggerSupport(el: HTMLElement): { haspopup: boolean; expanded: boolean } {
		const role = el.getAttribute('role')?.trim().split(/\s+/)[0];
		if (role) return { haspopup: HASPOPUP_ROLES.has(role), expanded: EXPANDABLE_ROLES.has(role) };
		switch (el.tagName) {
			case 'BUTTON':
				return { haspopup: true, expanded: true };
			case 'SUMMARY':
				return { haspopup: false, expanded: true };
			case 'A':
			case 'AREA':
				return el.hasAttribute('href') ? { haspopup: true, expanded: true } : { haspopup: false, expanded: false };
			case 'INPUT': {
				const type = (el as HTMLInputElement).type?.toLowerCase() ?? 'text';
				if (BUTTON_INPUT_TYPES.has(type)) return { haspopup: true, expanded: true };
				if (TEXT_INPUT_TYPES.has(type)) return { haspopup: true, expanded: false };
				return { haspopup: false, expanded: false };
			}
			case 'TEXTAREA':
				return { haspopup: true, expanded: false };
			case 'SELECT': {
				const select = el as HTMLSelectElement;
				return { haspopup: !select.multiple && select.size <= 1, expanded: true };
			}
			default:
				return { haspopup: false, expanded: false };
		}
	}

	function isDisabledControl(el: Element): boolean {
		return (el as HTMLButtonElement).disabled === true || el.getAttribute('aria-disabled') === 'true';
	}

	/** Whether a tap on this trigger performs its own action, so a touch tap shouldn't open the card. */
	function isActionTrigger(el: HTMLElement): boolean {
		if (isDisabledControl(el)) return false;
		const role = el.getAttribute('role');
		if (role) return ACTION_ROLES.has(role);
		switch (el.tagName) {
			case 'LABEL': {
				const control = (el as HTMLLabelElement).control;
				return control == null || !isDisabledControl(control);
			}
			case 'BUTTON':
			case 'INPUT':
			case 'SELECT':
			case 'SUMMARY':
			case 'TEXTAREA':
				return true;
			case 'A':
			case 'AREA':
				return el.hasAttribute('href');
			default:
				return el.isContentEditable;
		}
	}

	function isFocusableTrigger(el: HTMLElement): boolean {
		if (el.hasAttribute('tabindex')) return el.tabIndex >= 0;
		if (['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName)) return !(el as HTMLButtonElement).disabled;
		return el.isContentEditable;
	}
</script>

<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import type { ClassValue } from 'svelte/elements';
	import Layer from '../Layer/Layer.svelte';
	import { observeChildren } from '../../internal/observeChildren.js';
	import { pushLayer } from '../../internal/layerStack.js';
	import type { LayerAlignment, LayerPlacement } from '../../internal/position.js';

	interface Props {
		/** The card's content. */
		content: Snippet;
		placement?: LayerPlacement;
		alignment?: LayerAlignment;
		/** ms before showing on hover. */
		delay?: number;
		/** ms before hiding once the pointer and focus have left the trigger and the card. */
		hideDelay?: number;
		/** "auto" shows on focus of a focusable trigger; "always" for any focus inside; "never" not on focus. */
		focusTrigger?: HoverCardFocusTrigger;
		/** "auto" opens on tap unless the trigger is an action (a button or link); "tap" always; "none" never. */
		touchTrigger?: HoverCardTouchTrigger;
		isEnabled?: boolean;
		/** Makes the card a labelled dialog instead of a description of the trigger. */
		label?: string;
		onOpenChange?: (isOpen: boolean) => void;
		/** Dashed underline on the trigger; "auto" applies it to plain-text triggers. */
		hasHoverIndication?: 'auto' | boolean;
		/** Controlled open state. */
		isOpen?: boolean;
		isDefaultOpen?: boolean;
		class?: ClassValue;
		style?: string;
		children?: Snippet;
	}

	let {
		content,
		placement = 'above',
		alignment = 'center',
		delay = 300,
		hideDelay = 200,
		focusTrigger = 'auto',
		touchTrigger = 'auto',
		isEnabled = true,
		label,
		onOpenChange,
		hasHoverIndication = 'auto',
		isOpen,
		isDefaultOpen = false,
		class: className,
		style,
		children
	}: Props = $props();

	const uid = $props.id();
	const cardId = `${uid}-hovercard`;
	let wrapper: HTMLElement | undefined = $state();
	let card: HTMLDivElement | undefined = $state();

	let layerOpen = $state(false);
	$effect.pre(() => {
		if (untrack(() => isDefaultOpen)) layerOpen = true;
	});
	// A controlled card follows `isOpen`; the trigger's events only request changes through onOpenChange.
	const open = $derived(isEnabled && (isOpen ?? layerOpen));

	// Port change: a controlled card's hover, focus and tap still request changes through onOpenChange.
	function show() {
		if (open || !isEnabled) return;
		if (isOpen === undefined) layerOpen = true;
		onOpenChange?.(true);
	}
	function hide() {
		isHoveringCard = false;
		disarmOutside();
		if (!open) return;
		if (isOpen === undefined) layerOpen = false;
		onOpenChange?.(false);
	}

	/** Skip `display: contents` wrappers (such as a Button's Tooltip span) to the element with a box. */
	function boxedElement(el: HTMLElement): HTMLElement {
		let current = el;
		while (getComputedStyle(current).display === 'contents' && current.firstElementChild instanceof HTMLElement) {
			current = current.firstElementChild;
		}
		return current;
	}
	// The trigger is the first element inside; plain text gets a focusable inline wrapper instead.
	let trigger = $state<HTMLElement | null>(null);
	let textOnly = $state(false);
	$effect(() => {
		const root = wrapper;
		if (!root) return;
		return observeChildren(root, () => {
			const first = root.firstElementChild as HTMLElement | null;
			textOnly = first == null && (root.textContent ?? '').trim() !== '';
			trigger = first ? boxedElement(first) : root;
		});
	});
	const showIndication = $derived(hasHoverIndication === true || (hasHoverIndication === 'auto' && textOnly));

	// Trigger ARIA: described by the card, or with a label, a popup trigger for the dialog.
	$effect(() => {
		const el = trigger;
		if (!el) return;
		const names = ['aria-describedby', 'aria-haspopup', 'aria-controls', 'aria-expanded'] as const;
		const own = Object.fromEntries(names.map((n) => [n, el.getAttribute(n)])) as Record<(typeof names)[number], string | null>;
		const set = (name: string, value: string | null | undefined) => {
			if (value == null || value === '') el.removeAttribute(name);
			else el.setAttribute(name, value);
		};
		if (label) {
			const support = textOnly ? { haspopup: false, expanded: false } : popupTriggerSupport(el);
			set('aria-haspopup', support.haspopup ? 'dialog' : own['aria-haspopup']);
			set('aria-controls', open ? [own['aria-controls'], cardId].filter(Boolean).join(' ') : own['aria-controls']);
			set('aria-expanded', support.expanded ? String(open) : own['aria-expanded']);
		} else {
			const ids = new Set((own['aria-describedby'] ?? '').split(/\s+/).filter(Boolean));
			ids.add(cardId);
			set('aria-describedby', [...ids].join(' '));
		}
		return () => {
			for (const n of names) set(n, own[n]);
		};
	});

	let showTimer: ReturnType<typeof setTimeout> | undefined;
	let hideTimer: ReturnType<typeof setTimeout> | undefined;
	let isHoveringCard = false;
	let isHoveringTrigger = false;
	let isTouchPointer = false;
	let isEscapeDismissing = false;
	let focusCounted = false;

	function clearTimers() {
		clearTimeout(showTimer);
		clearTimeout(hideTimer);
		showTimer = hideTimer = undefined;
	}
	function scheduleShow() {
		if (!isEnabled) return;
		clearTimers();
		showTimer = setTimeout(show, delay);
	}
	// Port change: focus on the trigger or in the card also keeps the card open.
	function scheduleHide() {
		clearTimers();
		hideTimer = setTimeout(() => {
			const active = document.activeElement;
			const holdsFocus = (focusCounted && wrapper?.contains(active)) || card?.contains(active);
			if (!isHoveringCard && !isHoveringTrigger && !holdsFocus) hide();
		}, hideDelay);
	}

	/** Whether a focus event inside the wrapper counts as focus on the trigger, per `focusTrigger`. */
	function isFocusForTrigger(target: EventTarget | null): boolean {
		if (focusTrigger === 'always') return true;
		if (focusTrigger === 'never') return false;
		return trigger != null && (target === trigger || isFocusableTrigger(trigger));
	}

	function onpointerenter(e: PointerEvent) {
		isTouchPointer = e.pointerType === 'touch';
	}
	function onmouseenter() {
		if (isTouchPointer) return;
		isHoveringTrigger = true;
		scheduleShow();
	}
	function onmouseleave() {
		isHoveringTrigger = false;
		if (!isTouchPointer) scheduleHide();
	}
	let touchPressed = false;
	function onpointerdown(e: PointerEvent) {
		isTouchPointer = e.pointerType === 'touch' || e.pointerType === 'pen';
		touchPressed = isTouchPointer;
		if (touchPressed) {
			clearTimeout(showTimer);
			showTimer = undefined;
		}
	}
	// A touch tap: open or close the card, unless the trigger is an action that the tap should run.
	function onclick(e: MouseEvent) {
		if (!touchPressed) return;
		touchPressed = false;
		const tapped = e.target as Element | null;
		const mode =
			touchTrigger === 'auto'
				? tapped && isDisabledControl(tapped)
					? 'tap'
					: trigger && !textOnly && isActionTrigger(trigger)
						? 'none'
						: 'tap'
				: touchTrigger;
		if (mode === 'none' || !isEnabled || open) {
			hide();
			return;
		}
		clearTimers();
		show();
		armOutside();
	}
	function onfocusin(e: FocusEvent) {
		focusCounted = isFocusForTrigger(e.target);
		if (!focusCounted || !isEnabled) return;
		if (isTouchPointer) return;
		if (isEscapeDismissing) {
			isEscapeDismissing = false;
			return;
		}
		clearTimers();
		show();
	}
	function onfocusout(e: FocusEvent) {
		if (!focusCounted && !isFocusForTrigger(e.target)) return;
		focusCounted = false;
		if (card?.contains(e.relatedTarget as Node)) return;
		scheduleHide();
	}

	// After a tap opens the card, a release outside the trigger and the card closes it.
	let outsideListener: ((e: PointerEvent) => void) | null = null;
	function armOutside() {
		if (outsideListener) return;
		outsideListener = (e: PointerEvent) => {
			const target = e.target as Node | null;
			if (target && (wrapper?.contains(target) || card?.contains(target))) return;
			hide();
		};
		document.addEventListener('pointerup', outsideListener, true);
		document.addEventListener('pointercancel', outsideListener, true);
	}
	function disarmOutside() {
		if (!outsideListener) return;
		document.removeEventListener('pointerup', outsideListener, true);
		document.removeEventListener('pointercancel', outsideListener, true);
		outsideListener = null;
	}

	/** Close the card; if focus was inside it, return focus to the trigger without reopening. */
	function dismissReturningFocus() {
		const hadFocus = card?.contains(document.activeElement) ?? false;
		hide();
		if (hadFocus) {
			isEscapeDismissing = true;
			trigger?.focus();
		}
	}

	// Escape dismisses the topmost open card.
	$effect(() => {
		if (!open) return;
		const layer = pushLayer();
		const onKey = (e: KeyboardEvent) => {
			if (e.key !== 'Escape' || e.defaultPrevented || !layer.isTop()) return;
			// Consume it, so an enclosing modal doesn't also close.
			e.preventDefault();
			clearTimers();
			disarmOutside();
			if (isOpen !== undefined) {
				onOpenChange?.(false);
				return;
			}
			dismissReturningFocus();
		};
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('keydown', onKey);
			layer.remove();
		};
	});

	$effect(() => {
		const now = isOpen;
		if (now === undefined) return;
		untrack(() => {
			clearTimers();
			layerOpen = now;
			if (!now) disarmOutside();
		});
	});
	// A close from outside (the owner, or disabling) returns focus from the card to the trigger,
	// like an Escape. Runs before the DOM update, while the card and its focused element still exist.
	let wasOpen = untrack(() => open);
	$effect.pre(() => {
		const now = open;
		untrack(() => {
			if (!now && wasOpen && card?.contains(document.activeElement)) {
				isEscapeDismissing = true;
				trigger?.focus();
			}
			wasOpen = now;
		});
	});
	$effect(() => () => {
		clearTimers();
		disarmOutside();
	});
	// Disabling closes the card and cancels a pending open.
	$effect(() => {
		if (isEnabled) return;
		untrack(() => {
			clearTimers();
			disarmOutside();
			layerOpen = false;
		});
	});

	function onCardMouseEnter() {
		if (isTouchPointer) return;
		isHoveringCard = true;
		clearTimers();
	}
	function onCardMouseLeave() {
		if (isTouchPointer) return;
		isHoveringCard = false;
		scheduleHide();
	}
	function onCardFocusIn() {
		clearTimers();
	}
	function onCardFocusOut(e: FocusEvent) {
		const related = e.relatedTarget as Node | null;
		if (card?.contains(related) || trigger?.contains(related)) return;
		scheduleHide();
	}
</script>

<!-- A plain-text trigger is a focus stop so keyboard users can reach its card. -->
<!-- svelte-ignore a11y_no_static_element_interactions, a11y_no_noninteractive_tabindex, a11y_click_events_have_key_events -->
<span
	bind:this={wrapper}
	class={['trigger', textOnly && 'inline', showIndication && 'indication']}
	tabindex={textOnly ? 0 : undefined}
	{onpointerenter}
	{onmouseenter}
	{onmouseleave}
	{onpointerdown}
	{onclick}
	{onfocusin}
	{onfocusout}
>
	{@render children?.()}
</span>

<Layer
	open={open && trigger != null}
	anchor={trigger}
	{placement}
	{alignment}
	offset={4}
	id={cardId}
	role={label ? 'dialog' : 'group'}
	aria-label={label || undefined}
	class={['astryx-hover-card', 'hover-card', className]}
	{style}
	bind:element={card}
	onmouseenter={onCardMouseEnter}
	onmouseleave={onCardMouseLeave}
	onfocusin={onCardFocusIn}
	onfocusout={onCardFocusOut}
>
	<div class="content">
		{@render content()}
	</div>
</Layer>

<style>
	@layer astryx-base {
		.trigger { display: contents; }
		.inline { display: inline; }
		.inline:focus-visible {
			outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color);
			outline-offset: var(--focus-outline-offset);
		}
		.indication {
			text-decoration-line: underline;
			text-decoration-style: dashed;
			text-decoration-color: var(--color-border-emphasized);
			text-underline-offset: var(--spacing-0-5);
		}
		:global(.astryx-layer.hover-card) {
			background-color: var(--color-background-surface);
			--_hovercard-radius: var(--radius-container);
			border-radius: var(--_hovercard-radius);
			box-shadow: var(--shadow-med);
		}
		.content {
			display: block;
			padding: var(--spacing-3);
		}
	}
</style>
