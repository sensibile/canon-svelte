// Focus helpers shared by overlays (Popover, Dialog, DropdownMenu).
export const FOCUSABLE_SELECTOR = [
	'a[href]',
	'button:not([disabled])',
	'input:not([disabled]):not([type="hidden"])',
	'select:not([disabled])',
	'textarea:not([disabled])',
	'[tabindex]:not([tabindex="-1"])',
	'[contenteditable="true"]'
].join(',');

/**
 * Sequential tab stops in `root`. aria-disabled controls stay focusable (e.g. a loading Button),
 * so they count unless `skipAriaDisabled` is set (used when picking where focus starts).
 */
export function focusables(root: HTMLElement, skipAriaDisabled = false): HTMLElement[] {
	const all = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
		(el) =>
			el.tabIndex >= 0 &&
			// Native disabled state, including controls inside a disabled fieldset.
			!el.matches(':disabled') &&
			!el.closest('[inert]') &&
			!(skipAriaDisabled && el.getAttribute('aria-disabled') === 'true') &&
			el.offsetParent !== null &&
			// visibility: hidden or collapse (own or inherited) isn't a tab stop either.
			getComputedStyle(el).visibility === 'visible'
	);
	return all.filter((el) => isRadioTabStop(el, all));
}

/** A named radio group is one tab stop: its checked radio, or its first radio when none is checked. */
function isRadioTabStop(el: HTMLElement, candidates: HTMLElement[]): boolean {
	if (!(el instanceof HTMLInputElement) || el.type !== 'radio' || !el.name) return true;
	const group = candidates.filter(
		(c): c is HTMLInputElement =>
			c instanceof HTMLInputElement && c.type === 'radio' && c.name === el.name && c.form === el.form
	);
	const checked = group.find((r) => r.checked);
	return el === (checked ?? group[0]);
}

/** Focus `[data-autofocus]`, else the first focusable, else the root itself. */
export function focusFirst(root: HTMLElement) {
	const target = root.querySelector<HTMLElement>('[data-autofocus]') ?? focusables(root, true)[0];
	if (target) {
		target.focus({ preventScroll: true });
		return;
	}
	if (!root.hasAttribute('tabindex')) root.tabIndex = -1;
	root.focus({ preventScroll: true });
}

/** Keep Tab / Shift+Tab inside `root`. Returns a cleanup function. */
export function trapFocus(root: HTMLElement, isActive: () => boolean = () => true): () => void {
	const onKey = (e: KeyboardEvent) => {
		// A nested trap inside this one already handled it, or a foreground layer
		// (e.g. a native modal Dialog rendered inside) owns focus.
		if (e.key !== 'Tab' || e.defaultPrevented || !isActive()) return;
		const items = focusables(root);
		if (items.length === 0) {
			e.preventDefault();
			return;
		}
		const first = items[0];
		const last = items[items.length - 1];
		const active = root.ownerDocument.activeElement;
		const inside = active != null && root.contains(active);
		// Focus can sit on a non-tab-stop (e.g. a roving-tabindex tab reached with arrows),
		// so compare document positions rather than identity with first/last.
		const follows = (a: Node, b: Node) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
		const atStart = !inside || active === first || !items.some((el) => follows(el, active));
		const atEnd = !inside || active === last || !items.some((el) => follows(active, el));
		if (e.shiftKey && atStart) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && atEnd) {
			e.preventDefault();
			first.focus();
		}
	};
	root.addEventListener('keydown', onKey);
	return () => root.removeEventListener('keydown', onKey);
}
