// Port of Astryx `useOutlineFromDOM` (packages/core/src/Outline/useOutlineFromDOM.ts), MIT, Meta Platforms, Inc.
import type { OutlineItem } from './types.js';

function collectOutlineItems(container: HTMLElement | null | undefined): OutlineItem[] {
	if (container == null) return [];
	return Array.from(container.querySelectorAll('h1,h2,h3,h4,h5,h6'))
		.map((heading) => ({
			id: heading.id,
			label: heading.textContent?.trim() ?? '',
			level: Number(heading.tagName.slice(1))
		}))
		.filter((item) => item.id !== '' && item.label !== '');
}

/**
 * Outline items for the headings with ids inside a container, kept current as its content changes.
 * Call during component setup: `const outline = outlineFromDOM(() => article)`, then read `outline.items`.
 * Port change: replaces the `useOutlineFromDOM(ref)` hook.
 */
export function outlineFromDOM(getContainer: () => HTMLElement | null | undefined): { readonly items: OutlineItem[] } {
	let items = $state<OutlineItem[]>([]);
	$effect(() => {
		const container = getContainer();
		items = collectOutlineItems(container);
		if (container == null || typeof MutationObserver === 'undefined') return;
		const observer = new MutationObserver(() => {
			items = collectOutlineItems(container);
		});
		observer.observe(container, {
			childList: true,
			subtree: true,
			characterData: true,
			attributes: true,
			attributeFilter: ['id']
		});
		return () => observer.disconnect();
	});
	return {
		get items() {
			return items;
		}
	};
}
