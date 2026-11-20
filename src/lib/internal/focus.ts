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
	return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
		(el) =>
			el.tabIndex >= 0 &&
			!el.closest('[inert]') &&
			!(skipAriaDisabled && el.getAttribute('aria-disabled') === 'true') &&
			el.offsetParent !== null
	);
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
export function trapFocus(root: HTMLElement): () => void {
	const onKey = (e: KeyboardEvent) => {
		// A nested trap inside this one already handled it.
		if (e.key !== 'Tab' || e.defaultPrevented) return;
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
