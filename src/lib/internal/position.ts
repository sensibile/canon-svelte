// Anchored positioning for layers (tooltips, popovers, menus), built on @floating-ui/dom.
// Stands in for Astryx's useLayer context mode (packages/core/src/Layer/useLayer.tsx).
import {
	autoUpdate,
	computePosition,
	flip,
	offset as offsetMw,
	shift,
	size as sizeMw,
	type Placement
} from '@floating-ui/dom';

export type LayerPlacement = 'above' | 'below' | 'start' | 'end';
export type LayerAlignment = 'start' | 'center' | 'end';

export interface PositionOptions {
	placement: LayerPlacement;
	alignment: LayerAlignment;
	/** Gap between anchor and layer, in px. */
	offset: number;
	/** Make the layer at least as wide as the anchor (menus, selects). */
	matchAnchorWidth?: boolean;
}

function toFloating(placement: LayerPlacement, alignment: LayerAlignment, rtl: boolean): Placement {
	const side =
		placement === 'above'
			? 'top'
			: placement === 'below'
				? 'bottom'
				: (placement === 'start') !== rtl
					? 'left'
					: 'right';
	if (alignment === 'center') return side;
	const vertical = side === 'top' || side === 'bottom';
	// For above/below, start/end follow the writing direction.
	const startIsLogical = vertical && rtl ? alignment === 'end' : alignment === 'start';
	return `${side}-${startIsLogical ? 'start' : 'end'}` as Placement;
}

const sideToPlacement: Record<string, LayerPlacement> = {
	top: 'above',
	bottom: 'below',
	left: 'start',
	right: 'end'
};

/**
 * Keep `floating` positioned next to `anchor` while either moves or resizes.
 * Writes `data-placement` (the side actually used after flipping) on the layer.
 * Returns a cleanup function.
 */
export function anchorLayer(anchor: Element, floating: HTMLElement, opts: PositionOptions): () => void {
	const rtl = getComputedStyle(anchor).direction === 'rtl';
	const update = async () => {
		const { x, y, placement } = await computePosition(anchor, floating, {
			strategy: 'fixed',
			placement: toFloating(opts.placement, opts.alignment, rtl),
			middleware: [
				offsetMw(opts.offset),
				flip({ padding: 8 }),
				shift({ padding: 8 }),
				...(opts.matchAnchorWidth
					? [
							sizeMw({
								apply({ rects }) {
									floating.style.minWidth = `${rects.reference.width}px`;
								}
							})
						]
					: [])
			]
		});
		Object.assign(floating.style, { left: `${x}px`, top: `${y}px` });
		const side = placement.split('-')[0];
		let resolved = sideToPlacement[side];
		if (rtl && (resolved === 'start' || resolved === 'end')) resolved = resolved === 'start' ? 'end' : 'start';
		floating.dataset.placement = resolved;
	};
	return autoUpdate(anchor, floating, update);
}
