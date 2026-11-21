// Port of Astryx hooks/useGridFocus.ts, MIT, Meta Platforms, Inc. Keyboard movement over a
// grid (WAI-ARIA grid pattern) with an optional roving tab stop. The hook becomes a factory:
// the component passes a getter for its grid element and calls `sync()` after each update.

export interface GridFocusOptions {
	/** Number of columns; Up/Down move by this many cells. */
	columns: number;
	/** Matches every cell position in DOM order, disabled and empty ones too. */
	cellSelector?: string;
	/** Whether a matched cell can take focus. Default: every cell. */
	isCellFocusable?: (cell: HTMLElement) => boolean;
	/** The element to focus for a cell, such as a button inside a gridcell wrapper. */
	getFocusTarget?: (cell: HTMLElement) => HTMLElement | null;
	/** Movement ran off the start of the grid. */
	onNavigateBefore?: (column: number, offset: number) => void;
	/** Movement ran off the end of the grid. */
	onNavigateAfter?: (column: number, offset: number) => void;
	onPageUp?: (event: KeyboardEvent) => void;
	onPageDown?: (event: KeyboardEvent) => void;
	/** Keep exactly one focus target tabbable, moving with navigation. */
	hasRovingTabIndex?: boolean;
}

function isRtl(el: Element | null): boolean {
	return el != null && getComputedStyle(el).direction === 'rtl';
}

export function createGridFocus(getGrid: () => HTMLElement | null | undefined, getOptions: () => GridFocusOptions) {
	const opts = () => {
		const o = getOptions();
		return {
			...o,
			cellSelector: o.cellSelector ?? 'button:not([disabled]), [tabindex]:not([tabindex="-1"])'
		};
	};
	const getCells = (): HTMLElement[] => {
		const grid = getGrid();
		return grid ? Array.from(grid.querySelectorAll<HTMLElement>(opts().cellSelector)) : [];
	};
	const cellFocusable = (cell: HTMLElement | undefined): boolean => {
		if (!cell) return false;
		const { isCellFocusable } = opts();
		return isCellFocusable ? isCellFocusable(cell) : true;
	};
	const resolveFocusTarget = (cell: HTMLElement | undefined): HTMLElement | null => {
		if (!cell) return null;
		const { getFocusTarget } = opts();
		return getFocusTarget ? getFocusTarget(cell) : cell;
	};
	const setTabIndex = (el: HTMLElement, value: 0 | -1) => {
		if (el.getAttribute('tabindex') !== String(value)) el.setAttribute('tabindex', String(value));
	};
	const getFocusTargets = (): HTMLElement[] =>
		getCells()
			.filter((cell) => cellFocusable(cell))
			.map((cell) => resolveFocusTarget(cell))
			.filter((el): el is HTMLElement => el !== null);

	/** One tabbable target: the current one if still focusable, else the first. */
	function syncTabStops() {
		const targets = getFocusTargets();
		if (targets.length === 0) return;
		const current = targets.find((el) => el.getAttribute('tabindex') === '0');
		const tabbable = current ?? targets[0];
		for (const el of targets) setTabIndex(el, el === tabbable ? 0 : -1);
		// A cell that stopped being focusable can still hold the stop; it never stays tabbable.
		for (const cell of getCells()) {
			const el = cellFocusable(cell) ? null : resolveFocusTarget(cell);
			if (el != null) setTabIndex(el, -1);
		}
	}

	function focusTarget(target: HTMLElement | null) {
		if (!target) return;
		if (opts().hasRovingTabIndex) {
			for (const el of getFocusTargets()) setTabIndex(el, el === target ? 0 : -1);
		}
		target.focus();
	}
	const focusCellWithStop = (cell: HTMLElement | undefined) => focusTarget(resolveFocusTarget(cell));

	const getCurrentIndex = (): number => {
		const active = document.activeElement;
		return getCells().findIndex((cell) => cell === active || cell.contains(active));
	};
	const findFocusableInDirection = (cells: HTMLElement[], startIndex: number, step: number): number => {
		let index = startIndex;
		while (index >= 0 && index < cells.length) {
			if (cellFocusable(cells[index])) return index;
			index += step;
		}
		return -1;
	};
	function focusFirst() {
		const cells = getCells();
		const index = findFocusableInDirection(cells, 0, 1);
		if (index !== -1) focusCellWithStop(cells[index]);
	}
	function focusLast() {
		const cells = getCells();
		const index = findFocusableInDirection(cells, cells.length - 1, -1);
		if (index !== -1) focusCellWithStop(cells[index]);
	}

	function handleKeyDown(e: KeyboardEvent) {
		const cells = getCells();
		if (cells.length === 0) return;
		const currentIndex = getCurrentIndex();
		if (currentIndex === -1) return;
		const { columns, onNavigateAfter, onNavigateBefore, onPageUp, onPageDown } = opts();
		const currentRow = Math.floor(currentIndex / columns);
		const currentCol = currentIndex % columns;
		const totalRows = Math.ceil(cells.length / columns);
		let handled = true;
		// In RTL, Left/Right follow the visual direction.
		let key = e.key;
		if ((key === 'ArrowLeft' || key === 'ArrowRight') && isRtl(getGrid() ?? null)) {
			key = key === 'ArrowLeft' ? 'ArrowRight' : 'ArrowLeft';
		}
		switch (key) {
			case 'ArrowRight': {
				const target = findFocusableInDirection(cells, currentIndex + 1, 1);
				if (target !== -1) focusCellWithStop(cells[target]);
				else onNavigateAfter?.((currentCol + 1) % columns, 1);
				break;
			}
			case 'ArrowLeft': {
				const target = findFocusableInDirection(cells, currentIndex - 1, -1);
				if (target !== -1) focusCellWithStop(cells[target]);
				else onNavigateBefore?.(currentCol === 0 ? columns - 1 : currentCol - 1, 1);
				break;
			}
			case 'ArrowDown': {
				const target =
					currentRow < totalRows - 1 ? findFocusableInDirection(cells, currentIndex + columns, columns) : -1;
				if (target !== -1) focusCellWithStop(cells[target]);
				else onNavigateAfter?.(currentCol, columns);
				break;
			}
			case 'ArrowUp': {
				const target = currentRow > 0 ? findFocusableInDirection(cells, currentIndex - columns, -columns) : -1;
				if (target !== -1) focusCellWithStop(cells[target]);
				else onNavigateBefore?.(currentCol, columns);
				break;
			}
			case 'Home':
				if (e.ctrlKey || e.metaKey) focusFirst();
				else {
					const rowStart = currentRow * columns;
					const rowEnd = Math.min(rowStart + columns - 1, cells.length - 1);
					const target = findFocusableInDirection(cells, rowStart, 1);
					if (target !== -1 && target <= rowEnd) focusCellWithStop(cells[target]);
				}
				break;
			case 'End':
				if (e.ctrlKey || e.metaKey) focusLast();
				else {
					const rowStart = currentRow * columns;
					const rowEnd = Math.min(rowStart + columns - 1, cells.length - 1);
					const target = findFocusableInDirection(cells, rowEnd, -1);
					if (target !== -1 && target >= rowStart) focusCellWithStop(cells[target]);
				}
				break;
			case 'PageUp':
				onPageUp?.(e);
				break;
			case 'PageDown':
				onPageDown?.(e);
				break;
			default:
				handled = false;
		}
		if (handled) {
			e.preventDefault();
			e.stopPropagation();
		}
	}

	return {
		handleKeyDown,
		/** Attach to the container's focusin to keep the stop on whatever got focus. */
		handleFocus: () => {
			if (opts().hasRovingTabIndex) syncTabStops();
		},
		/** Repair the tab stop after the cells change. */
		sync: () => {
			if (opts().hasRovingTabIndex) syncTabStops();
		},
		focusFirst,
		focusLast
	};
}
