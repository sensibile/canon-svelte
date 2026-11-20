/** Call `fn` now and whenever `root`'s descendants are added or replaced. Returns a cleanup function. */
export function observeChildren(root: Element, fn: () => void): () => void {
	fn();
	const obs = new MutationObserver(fn);
	obs.observe(root, { childList: true, subtree: true });
	return () => obs.disconnect();
}
