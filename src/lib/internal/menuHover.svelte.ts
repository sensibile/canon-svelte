// Hover-to-open controller for nav flyouts. A reduced port of Astryx's useMenuHover
// (packages/core/src/hooks/useMenuHover.ts), MIT, Meta Platforms, Inc.
// Hover opens after `showDelay` and closes `hideDelay` after the pointer leaves both the trigger
// and the flyout. A click soon after a hover-open keeps the flyout open instead of closing it;
// otherwise a click toggles. A click-opened flyout stays until dismissed.
// Port change: no safe-triangle tracking; the hide delay covers the trip to the flyout.

export interface MenuHoverOptions {
	isEnabled: () => boolean;
	showDelay?: number;
	hideDelay?: number;
	clickGuardMs?: number;
}

export interface MenuHover {
	readonly isOpen: boolean;
	/** True when the last open came from a click or key press, so the flyout takes focus. */
	readonly openedByClick: boolean;
	show(byClick?: boolean): void;
	hide(): void;
	onTriggerEnter(e: PointerEvent): void;
	onTriggerLeave(e: PointerEvent): void;
	onContentEnter(): void;
	onContentLeave(e: PointerEvent): void;
	onTriggerClick(): void;
	destroy(): void;
}

export function createMenuHover(options: MenuHoverOptions): MenuHover {
	const { isEnabled, showDelay = 150, hideDelay = 200, clickGuardMs = 500 } = options;
	let open = $state(false);
	let openedByClick = $state(false);
	let showTimer: ReturnType<typeof setTimeout> | undefined;
	let hideTimer: ReturnType<typeof setTimeout> | undefined;
	let hoverMode = false;
	let hoverOpenedAt = 0;

	const canHover = () => typeof matchMedia === 'function' && matchMedia('(hover: hover)').matches;
	function clear() {
		clearTimeout(showTimer);
		clearTimeout(hideTimer);
	}
	function set(next: boolean, byClick: boolean) {
		if (!next) hoverMode = false;
		openedByClick = next && byClick;
		open = next;
	}
	function scheduleHide() {
		clearTimeout(showTimer);
		if (!hoverMode) return;
		clearTimeout(hideTimer);
		hideTimer = setTimeout(() => set(false, false), hideDelay);
	}

	return {
		get isOpen() {
			return open;
		},
		get openedByClick() {
			return openedByClick;
		},
		show(byClick = false) {
			clear();
			set(true, byClick);
		},
		hide() {
			clear();
			set(false, false);
		},
		onTriggerEnter(e) {
			if (e.pointerType === 'touch' || !isEnabled() || !canHover()) return;
			clearTimeout(hideTimer);
			if (open) return;
			clearTimeout(showTimer);
			showTimer = setTimeout(() => {
				hoverMode = true;
				hoverOpenedAt = performance.now();
				set(true, false);
			}, showDelay);
		},
		onTriggerLeave(e) {
			if (e.pointerType === 'touch') return;
			scheduleHide();
		},
		onContentEnter() {
			clearTimeout(hideTimer);
		},
		onContentLeave(e) {
			if (e.pointerType === 'touch') return;
			scheduleHide();
		},
		onTriggerClick() {
			if (!isEnabled()) return;
			clear();
			if (open && hoverMode) {
				// The click confirms a hover-open; past the guard it closes, as a toggle.
				hoverMode = false;
				if (performance.now() - hoverOpenedAt < clickGuardMs) return;
				set(false, false);
				return;
			}
			set(!open, true);
		},
		destroy: clear
	};
}
