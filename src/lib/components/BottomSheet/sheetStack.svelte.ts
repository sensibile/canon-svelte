// Port of the visible part of Astryx `bottomSheetStack` (packages/core/src/BottomSheet/bottomSheetStack.ts),
// MIT, Meta Platforms, Inc. Open scrim sheets in open order: the last is on top, the ones beneath
// recede, and only the first one's backdrop dims the page.

const order: symbol[] = $state([]);

export interface SheetStackView {
	/** More than one scrim sheet is open. */
	readonly isStacked: boolean;
	/** 0 on top, 1 just beneath it, and so on. */
	readonly depth: number;
	/** This sheet's backdrop is the one that dims the page. */
	readonly ownsScrim: boolean;
}

export function joinSheetStack(): { view: SheetStackView; leave: () => void } {
	const key = Symbol('sheet');
	order.push(key);
	return {
		view: {
			get isStacked() {
				return order.length > 1;
			},
			get depth() {
				const i = order.indexOf(key);
				return i < 0 ? 0 : order.length - 1 - i;
			},
			get ownsScrim() {
				return order[0] === key;
			}
		},
		leave: () => {
			const i = order.indexOf(key);
			if (i >= 0) order.splice(i, 1);
		}
	};
}
