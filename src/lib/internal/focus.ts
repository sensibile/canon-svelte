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

export function focusables(root: HTMLElement): HTMLElement[] {
	return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
		(el) => !el.closest('[inert]') && el.getAttribute('aria-disabled') !== 'true' && el.offsetParent !== null
	);
}

/** Focus `[data-autofocus]`, else the first focusable, else the root itself. */
export function focusFirst(root: HTMLElement) {
	const target = root.querySelector<HTMLElement>('[data-autofocus]') ?? focusables(root)[0];
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
		if (e.key !== 'Tab') return;
		const items = focusables(root);
		if (items.length === 0) {
			e.preventDefault();
			return;
		}
		const first = items[0];
		const last = items[items.length - 1];
		const active = root.ownerDocument.activeElement;
		if (e.shiftKey && (active === first || !root.contains(active))) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && (active === last || !root.contains(active))) {
			e.preventDefault();
			first.focus();
		}
	};
	root.addEventListener('keydown', onKey);
	return () => root.removeEventListener('keydown', onKey);
}
