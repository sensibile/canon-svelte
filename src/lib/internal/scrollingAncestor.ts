// Port of Astryx `scrollingAncestor` (packages/core/src/utils/scrollingAncestor.ts), MIT, Meta Platforms, Inc.

const SCROLLABLE_OVERFLOW = new Set(['auto', 'scroll', 'overlay']);

/** The nearest ancestor that scrolls vertically and has overflow, stopping at `bound`. */
export function scrollingAncestor(element: Element, bound?: Element | null): HTMLElement | null {
	const view = element.ownerDocument.defaultView;
	if (view == null) return null;
	for (let node = element.parentElement; node != null; node = node.parentElement) {
		if (SCROLLABLE_OVERFLOW.has(view.getComputedStyle(node).overflowY) && node.scrollHeight > node.clientHeight) {
			return node;
		}
		if (node === bound) return null;
	}
	return null;
}
