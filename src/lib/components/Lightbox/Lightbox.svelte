<!--
  Port of Astryx `Lightbox` (packages/core/src/Lightbox/Lightbox.tsx, useZoomCore.ts and useZoomStage.ts),
  MIT, Meta Platforms, Inc.
  A fullscreen modal viewer for one image or video, or a gallery of them (pass an array). A gallery
  has previous/next buttons, the arrow keys, a counter and, on touch, a swipe between items.
  `hasZoom` (images only): double-click or double-tap zooms in at that point and back, pinch or
  ctrl+wheel zooms continuously, Enter/Space/+/- zoom 2× about the centre and back, and 0 returns to
  the fitted size. When zoomed, drag or scroll to pan, or use the arrow keys. On touch, dragging a
  photo down from its fitted size dismisses the viewer. Captions show two lines with a More toggle.
  Escape, the Close button, or a press beside the media closes it.
  Port change: gestures run on pointer events with CSS transitions, not Astryx's gesture
  recognizers and springs (so no pan momentum); `caption` is a string or a snippet.
  Not yet ported: the screen-reader announcements of position and zoom, the caption toggle's
  float placement beside the last line (it sits at the end of the band), the animated dismissal
  of a dragged photo (it closes at release), and focus-ring tracking by input modality.
-->
<script lang="ts" module>
	import type { Snippet } from 'svelte';

	export type LightboxMediaType = 'image' | 'video';
	export interface LightboxMedia {
		src: string;
		alt: string;
		caption?: string | Snippet;
		type?: LightboxMediaType;
	}
</script>

<script lang="ts">
	import { tick, untrack } from 'svelte';
	import type { HTMLDialogAttributes } from 'svelte/elements';
	import IconButton from '../IconButton/IconButton.svelte';
	import { lockScroll } from '../../internal/scrollLock.js';
	import { pushLayer } from '../../internal/layerStack.js';
	import {
		IDENTITY,
		dismissBackdropAlpha,
		dismissChromeAlpha,
		dismissCommits,
		dismissTransform,
		doubleClickTarget,
		doubleTapScaleFor,
		doubleTapTarget,
		draggedTransform,
		isZoomed as isZoomedFor,
		maxScaleFor,
		overshootScale,
		pannedBy,
		releaseTarget,
		releasedZoomTarget,
		restRange,
		restingTransform,
		transformForResize,
		transformKeepingPoint,
		zoomMedia,
		type StagePoint,
		type ZoomGeometry,
		type ZoomTransform
	} from './zoomStage.js';

	interface Props extends Omit<HTMLDialogAttributes, 'open'> {
		isOpen: boolean;
		onOpenChange: (isOpen: boolean) => void;
		media: LightboxMedia | LightboxMedia[];
		index?: number;
		defaultIndex?: number;
		onIndexChange?: (index: number) => void;
		hasZoom?: boolean;
		hasAutoPlay?: boolean;
	}

	let {
		isOpen,
		onOpenChange,
		media,
		index: controlledIndex,
		defaultIndex = 0,
		onIndexChange,
		hasZoom = false,
		hasAutoPlay = false,
		class: className,
		onkeydown: onkeydownProp,
		onclick: onclickProp,
		...rest
	}: Props = $props();

	const PAGE_GAP = zoomMedia.viewer.pageGap;
	const KEYBOARD_PAN_STEP = 50;
	const VIDEO_CONTROLS_BAND = 48;
	const DOUBLE_TAP_MS = 300;
	const DOUBLE_TAP_SLOP = 30;
	const ZOOM_ANIMATION = 'translate 0.3s var(--ease-standard), scale 0.3s var(--ease-standard)';

	let uncontrolledIndex = $state(untrack(() => defaultIndex));
	const mediaArray = $derived(Array.isArray(media) ? media : [media]);
	const isGallery = $derived(mediaArray.length > 1);
	const requestedIndex = $derived(controlledIndex !== undefined ? controlledIndex : uncontrolledIndex);
	const index = $derived(
		Math.max(0, Math.min(Number.isNaN(requestedIndex) ? 0 : Math.round(requestedIndex), mediaArray.length - 1))
	);
	const currentItem = $derived(mediaArray.length > 0 ? mediaArray[index] : null);
	const isVideo = $derived((currentItem?.type ?? 'image') === 'video');
	const isZoomTarget = $derived(hasZoom && !isVideo);
	const canPrev = $derived(isGallery && index > 0);
	const canNext = $derived(isGallery && index < mediaArray.length - 1);
	const pageIndexes = $derived([index - 1, index, index + 1].filter((i) => i >= 0 && i < mediaArray.length));
	const hasCaptionBand = $derived(mediaArray.some((item) => item.caption != null && item.caption !== ''));
	const uid = $props.id();
	const captionId = `${uid}-caption`;
	const fullCaptionId = `${uid}-caption-full`;

	function setIndex(value: number) {
		if (controlledIndex === undefined) uncontrolledIndex = value;
		onIndexChange?.(value);
	}
	function close() {
		onOpenChange(false);
	}

	let dialog: HTMLDialogElement | undefined = $state();
	let container: HTMLDivElement | undefined = $state();
	let wrapper: HTMLDivElement | undefined = $state();
	let track: HTMLDivElement | undefined = $state();

	// ---- Opening and closing ----
	let trigger: HTMLElement | null = null;
	$effect(() => {
		const el = dialog;
		if (!el || !currentItem) return;
		if (isOpen && !el.open) {
			trigger = el.ownerDocument.activeElement as HTMLElement | null;
			resetView();
			el.showModal();
		} else if (!isOpen && el.open) {
			el.close();
			if (trigger?.isConnected) trigger.focus({ preventScroll: true });
			trigger = null;
		}
	});
	$effect(() => {
		const el = dialog;
		return () => {
			if (el?.open) {
				el.close();
				if (trigger?.isConnected) trigger.focus({ preventScroll: true });
			}
		};
	});
	$effect(() => {
		const el = dialog;
		if (!isOpen || !el) return;
		const layer = pushLayer();
		const unlock = lockScroll(el.ownerDocument);
		// A <form method="dialog"> closes the element natively; tell the owner.
		const onClose = () => {
			if (!isOpen || el.open) return;
			onOpenChange(false);
			if (trigger?.isConnected) trigger.focus({ preventScroll: true });
			trigger = null;
		};
		el.addEventListener('close', onClose);
		return () => {
			el.removeEventListener('close', onClose);
			layer.remove();
			unlock();
		};
	});
	function oncancel(e: Event) {
		if (e.target !== e.currentTarget) return;
		e.preventDefault();
		close();
	}

	// Pause videos that are off screen, and autoplay the current one when asked.
	$effect(() => {
		const root = container;
		void index;
		if (!root) return;
		if (!isOpen) {
			for (const video of root.querySelectorAll('video')) if (!video.paused) video.pause();
			return;
		}
		for (const video of root.querySelectorAll<HTMLVideoElement>('[data-lightbox-page]:not([data-current]) video')) {
			if (!video.paused) video.pause();
		}
		const current = root.querySelector<HTMLVideoElement>('[data-current] video');
		if (hasAutoPlay && current?.paused) void current.play()?.catch(() => {});
	});

	// ---- The current page ----
	function currentStage() {
		return track?.querySelector<HTMLElement>('[data-current] [data-lightbox-page-media]') ?? null;
	}
	function currentImg() {
		return track?.querySelector<HTMLImageElement>('[data-current] img') ?? null;
	}
	function geometry(): ZoomGeometry | null {
		const stage = currentStage();
		const img = currentImg();
		if (!stage || !img || !(img.offsetWidth > 0)) return null;
		const width = stage.clientWidth;
		const height = stage.clientHeight;
		const fit = { x: img.offsetLeft, y: img.offsetTop, width: img.offsetWidth, height: img.offsetHeight };
		const doubleTapScale = doubleTapScaleFor(width, height, fit.width, fit.height);
		const dpr = stage.ownerDocument.defaultView?.devicePixelRatio ?? 1;
		return {
			width,
			height,
			fit,
			minScale: 1,
			maxScale: maxScaleFor(img.naturalWidth, fit.width, dpr, doubleTapScale),
			doubleTapScale
		};
	}
	function stagePoint(clientX: number, clientY: number): StagePoint {
		const r = currentStage()?.getBoundingClientRect();
		return { x: clientX - (r?.left ?? 0), y: clientY - (r?.top ?? 0) };
	}

	// ---- Zoom ----
	let zoom: ZoomTransform = IDENTITY;
	let isZoomed = $state(false);
	let isPanning = $state(false);
	// The geometry the current transform was written against, to carry it through a resize.
	let zoomGeometry: ZoomGeometry | null = null;
	function writeZoom(t: ZoomTransform, animate: boolean) {
		zoom = t;
		const img = currentImg();
		if (img) {
			img.style.transition = animate ? ZOOM_ANIMATION : 'none';
			const identity = t.x === 0 && t.y === 0 && t.scale === 1;
			img.style.translate = identity ? '' : `${t.x}px ${t.y}px`;
			img.style.scale = identity ? '' : String(t.scale);
		}
		const g = geometry();
		zoomGeometry = g;
		isZoomed = g ? isZoomedFor(g, t) : t.scale > 1.001;
	}
	// A resized stage keeps the same part of a zoomed image in view, within the new bounds.
	$effect(() => {
		const el = track;
		if (!el || !isOpen || typeof ResizeObserver === 'undefined') return;
		const ro = new ResizeObserver(() => {
			const before = zoomGeometry;
			const after = geometry();
			if (!before || !after || gesture !== 'none') return;
			if (before.width === after.width && before.height === after.height && before.fit.width === after.fit.width) return;
			if (isZoomedFor(before, zoom)) writeZoom(transformForResize(before, after, zoom), false);
			else zoomGeometry = after;
		});
		ro.observe(el);
		return () => ro.disconnect();
	});
	function zoomTo(target: (g: ZoomGeometry) => ZoomTransform) {
		const g = geometry();
		if (g) writeZoom(target(g), true);
	}
	function toggleZoom() {
		zoomTo((g) => releasedZoomTarget(g, zoom));
	}
	function zoomIn() {
		if (!isZoomed) toggleZoom();
	}
	function zoomOut() {
		if (isZoomed) zoomTo((g) => restingTransform(g, { ...IDENTITY, scale: g.minScale }));
	}
	function resetView() {
		zoom = IDENTITY;
		isZoomed = false;
		for (const img of track?.querySelectorAll<HTMLImageElement>('img') ?? []) {
			img.style.transition = '';
			img.style.translate = '';
			img.style.scale = '';
		}
		setDismissFade(1, 1);
		if (track) track.style.removeProperty('--_lightbox-drag');
	}
	// A new item (or new src) starts at its fitted size.
	$effect(() => {
		void index;
		void currentItem?.src;
		untrack(resetView);
	});

	// ---- Paging ----
	function goToPrev() {
		if (canPrev) setIndex(index - 1);
	}
	function goToNext() {
		if (canNext) setIndex(index + 1);
	}
	function isRtl() {
		return !!dialog && getComputedStyle(dialog).direction === 'rtl';
	}
	// Focus left on a page that is now off screen moves to the new zoom stage or the Close button.
	$effect(() => {
		void index;
		const stage = untrack(() => (isZoomTarget ? currentStage() : null));
		const root = untrack(() => track);
		if (!root) return;
		const active = root.ownerDocument.activeElement;
		if (active && root.contains(active) && active.closest('[data-lightbox-page]:not([data-current])')) {
			(stage ?? dialog?.querySelector<HTMLElement>('[data-lightbox-close] button'))?.focus({ preventScroll: true });
		}
	});

	// ---- Keyboard ----
	function onkeydown(e: KeyboardEvent & { currentTarget: HTMLDialogElement }) {
		onkeydownProp?.(e);
		if (e.defaultPrevented) return;
		// Keys typed into an editable control in a caption, or into a video's native controls, stay with that control.
		const target = e.target as HTMLElement;
		if (target.closest?.('input, textarea, select, video[controls], audio[controls], [contenteditable]:not([contenteditable="false"])'))
			return;
		if (isZoomTarget) {
			if (e.key === '+' || e.key === '=') {
				e.preventDefault();
				zoomIn();
				return;
			}
			if (e.key === '-' || (e.key === '0' && !e.ctrlKey && !e.metaKey && !e.altKey)) {
				e.preventDefault();
				zoomOut();
				return;
			}
			const pan: Record<string, [number, number]> = {
				ArrowLeft: [KEYBOARD_PAN_STEP, 0],
				ArrowRight: [-KEYBOARD_PAN_STEP, 0],
				ArrowUp: [0, KEYBOARD_PAN_STEP],
				ArrowDown: [0, -KEYBOARD_PAN_STEP]
			};
			if (isZoomed && pan[e.key]) {
				e.preventDefault();
				const [dx, dy] = pan[e.key];
				zoomTo((g) => pannedBy(g, zoom, dx, dy));
				return;
			}
		}
		if (isGallery && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
			e.preventDefault();
			if ((e.key === 'ArrowRight') !== isRtl()) goToNext();
			else goToPrev();
		}
	}
	function onStageKeydown(e: KeyboardEvent) {
		if (e.target !== e.currentTarget) return;
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			toggleZoom();
		}
	}

	// ---- Presses beside the media close it ----
	let didDrag = false;
	let pressPoint: { x: number; y: number } | null = null;
	let pressPointerType = '';
	function isOnCurrentMedia(x: number, y: number) {
		const page = track?.querySelector('[data-current]');
		const sized = (el: Element | null | undefined) => {
			const r = el?.getBoundingClientRect();
			return r && r.width > 0 && r.height > 0 ? r : null;
		};
		const mediaBox = sized(page?.querySelector('img')) ?? sized(page?.querySelector('video'));
		const caption = sized(page?.querySelector('[data-lightbox-caption]'));
		const boxes = [mediaBox, caption].filter((r): r is DOMRect => r != null);
		const inRows = (r: DOMRect | null) => r != null && y >= r.top && y <= r.bottom;
		return (
			(inRows(caption) && caption != null && x >= caption.left && x <= caption.right) ||
			(inRows(mediaBox) && x >= Math.min(...boxes.map((r) => r.left)) && x <= Math.max(...boxes.map((r) => r.right)))
		);
	}
	function onContainerPointerDown(e: PointerEvent) {
		pressPointerType = e.pointerType;
		pressPoint = { x: e.clientX, y: e.clientY };
		const onStage = e.target instanceof Node && wrapper?.contains(e.target);
		if (e.pointerType !== 'touch' || onStage) didDrag = false;
	}
	function onclick(e: MouseEvent & { currentTarget: HTMLDialogElement }) {
		onclickProp?.(e);
		if (didDrag) {
			didDrag = false;
			return;
		}
		const target = e.target as Element;
		if (target.closest('button, a, video, [data-lightbox-caption]')) return;
		const outside =
			pressPointerType !== 'touch' &&
			!isOnCurrentMedia(e.clientX, e.clientY) &&
			(pressPoint == null || !isOnCurrentMedia(pressPoint.x, pressPoint.y));
		if (e.target === e.currentTarget || e.target === container || outside) close();
	}

	// ---- Pointer gestures on the stage ----
	type Gesture = 'pending' | 'pan' | 'page' | 'dismiss' | 'pinch' | 'none';
	const pointers = new Map<number, { x: number; y: number }>();
	let gesture: Gesture = 'none';
	let start = { x: 0, y: 0 };
	let startZoom: ZoomTransform = IDENTITY;
	let pinchStart = { distance: 1, centroid: { x: 0, y: 0 } as StagePoint };
	let samples: { t: number; x: number; y: number }[] = [];
	let lastTap: { t: number; x: number; y: number } | null = null;
	let gestureGeometry: ZoomGeometry | null = null;

	function pinchInfo() {
		const [a, b] = [...pointers.values()];
		return {
			distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
			centroid: stagePoint((a.x + b.x) / 2, (a.y + b.y) / 2)
		};
	}
	// Release velocity over the last 100ms, counting a pause before the release as rest.
	function velocity() {
		if (samples.length === 0) return { x: 0, y: 0 };
		const now = performance.now();
		const last = samples[samples.length - 1];
		const recent = [...samples.filter((sample) => now - sample.t <= 100), { t: now, x: last.x, y: last.y }];
		const a = recent[0];
		const b = recent[recent.length - 1];
		const dt = b.t - a.t;
		return dt > 0 ? { x: ((b.x - a.x) / dt) * 1000, y: ((b.y - a.y) / dt) * 1000 } : { x: 0, y: 0 };
	}
	function isAtEdge(dx: number, g: ZoomGeometry) {
		const range = restRange(g, zoom.scale);
		return dx > 0 ? zoom.x >= range.x.max - 0.5 : zoom.x <= range.x.min + 0.5;
	}
	function startsOnVideoControls(x: number, y: number) {
		const video = track?.querySelector('[data-current] video[controls]');
		if (!video) return false;
		const box = video.getBoundingClientRect();
		return x >= box.left && x <= box.right && y <= box.bottom && y >= box.bottom - VIDEO_CONTROLS_BAND;
	}
	function setDismissFade(backdrop: number, chrome: number) {
		dialog?.style.setProperty('--_lightbox-backdrop-opacity', String(backdrop));
		dialog?.style.setProperty('--_lightbox-chrome-opacity', String(chrome));
		dialog?.toggleAttribute('data-backdrop-moving', backdrop < 1);
	}
	function setPageDrag(px: number, animate: boolean) {
		if (!track) return;
		track.style.transition = animate ? 'transform 0.3s var(--ease-standard)' : 'none';
		if (px === 0) track.style.removeProperty('--_lightbox-drag');
		else track.style.setProperty('--_lightbox-drag', `${px}px`);
	}

	function onStagePointerDown(e: PointerEvent) {
		if (!isOpen) return;
		if (e.pointerType === 'mouse' && e.button !== 0) return;
		const target = e.target as Element;
		if (target.closest('[data-lightbox-caption], button, a')) return;
		if (startsOnVideoControls(e.clientX, e.clientY)) return;
		pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
		wrapper?.setPointerCapture?.(e.pointerId);
		if (pointers.size === 1) {
			gesture = 'pending';
			start = { x: e.clientX, y: e.clientY };
			startZoom = zoom;
			samples = [{ t: performance.now(), x: e.clientX, y: e.clientY }];
			gestureGeometry = geometry();
		} else if (pointers.size === 2 && isZoomTarget && e.pointerType === 'touch') {
			if (gesture === 'page') setPageDrag(0, true);
			if (gesture === 'dismiss') {
				// A pinch takes over a dismiss drag: the photo returns to its rest and the scrim and chrome come back.
				writeZoom(startZoom, true);
				setDismissFade(1, 1);
			}
			gesture = 'pinch';
			didDrag = true;
			gestureGeometry = geometry();
			startZoom = zoom;
			pinchStart = pinchInfo();
		}
	}
	function onStagePointerMove(e: PointerEvent) {
		if (isZoomTarget && e.pointerType === 'mouse' && e.buttons === 0) markOverPhoto(e);
		const p = pointers.get(e.pointerId);
		if (!p) return;
		p.x = e.clientX;
		p.y = e.clientY;
		const now = performance.now();
		samples.push({ t: now, x: e.clientX, y: e.clientY });
		while (samples.length > 2 && now - samples[0].t > 100) samples.shift();
		const dx = e.clientX - start.x;
		const dy = e.clientY - start.y;
		const g = gestureGeometry;
		if (gesture === 'pending') {
			const slop = e.pointerType === 'touch' ? 8 : 3;
			if (Math.hypot(dx, dy) < slop) return;
			const touch = e.pointerType === 'touch';
			const horizontal = Math.abs(dx) > Math.abs(dy);
			if (isZoomTarget && isZoomed && g) {
				gesture = touch && isGallery && horizontal && isAtEdge(dx, g) ? 'page' : 'pan';
			} else if (touch && isGallery && horizontal) {
				gesture = 'page';
			} else if (touch && !isVideo && dy > 0 && !horizontal) {
				gesture = 'dismiss';
			} else {
				gesture = 'none';
			}
			if (gesture !== 'none') didDrag = true;
			if (gesture === 'pan') isPanning = true;
		}
		if (gesture === 'pan' && g) {
			writeZoom(draggedTransform(g, { x: startZoom.x + dx, y: startZoom.y + dy, scale: startZoom.scale }), false);
		} else if (gesture === 'page') {
			// Past the first or last item the track resists.
			const towardPrev = (dx > 0) !== isRtl();
			const blocked = towardPrev ? !canPrev : !canNext;
			setPageDrag(blocked ? dx / 3 : dx, false);
		} else if (gesture === 'dismiss' && g) {
			const travel = Math.max(0, dy);
			writeZoom(dismissTransform(g, dx, dy), false);
			setDismissFade(dismissBackdropAlpha(travel), dismissChromeAlpha(travel));
		} else if (gesture === 'pinch' && g && pointers.size >= 2) {
			const now2 = pinchInfo();
			const scale = overshootScale(g, (startZoom.scale * now2.distance) / pinchStart.distance);
			writeZoom(transformKeepingPoint(g, startZoom, pinchStart.centroid, now2.centroid, scale), false);
		}
	}
	function onStagePointerUp(e: PointerEvent) {
		if (!pointers.has(e.pointerId)) return;
		const wasPinch = gesture === 'pinch' && pointers.size >= 2;
		const centroid = wasPinch ? pinchInfo().centroid : null;
		pointers.delete(e.pointerId);
		const g = gestureGeometry;
		const cancelled = e.type === 'pointercancel';
		if (wasPinch) {
			// Back within the scale limits, and the translation back within its range.
			if (g && centroid) writeZoom(restingTransform(g, releaseTarget(g, zoom, centroid)), true);
			// The finger left down does nothing more until it lifts.
			gesture = 'none';
			return;
		}
		if (pointers.size > 0) return;
		const dx = e.clientX - start.x;
		const dy = e.clientY - start.y;
		const v = velocity();
		isPanning = false;
		if (gesture === 'pan' && g) {
			writeZoom(restingTransform(g, zoom), true);
		} else if (gesture === 'page') {
			const width = wrapper?.clientWidth ?? 1;
			const forward = isRtl() ? dx > 0 : dx < 0;
			const flick = Math.abs(v.x) > 500 && Math.sign(v.x) === Math.sign(dx);
			const moves = !cancelled && (Math.abs(dx) > width / 2 || flick);
			setPageDrag(0, true);
			if (moves) {
				if (forward) goToNext();
				else goToPrev();
			}
		} else if (gesture === 'dismiss' && g) {
			if (!cancelled && dismissCommits(Math.max(0, dy), v.y)) {
				close();
				// A controlled owner can keep it open: then bring the photo and chrome back.
				tick().then(() => {
					if (isOpen) {
						writeZoom(IDENTITY, true);
						setDismissFade(1, 1);
					}
				});
			} else {
				writeZoom(IDENTITY, true);
				setDismissFade(1, 1);
			}
		} else if (gesture === 'pending' && e.pointerType === 'touch' && !cancelled) {
			onTouchTap(e.clientX, e.clientY);
		}
		gesture = 'none';
	}
	function onTouchTap(x: number, y: number) {
		const now = performance.now();
		const isDouble = lastTap && now - lastTap.t < DOUBLE_TAP_MS && Math.hypot(x - lastTap.x, y - lastTap.y) < DOUBLE_TAP_SLOP;
		if (isZoomTarget && isDouble) {
			lastTap = null;
			const point = stagePoint(x, y);
			zoomTo((g) => doubleTapTarget(g, zoom, point));
			return;
		}
		lastTap = { t: now, x, y };
		if (!isOnCurrentMedia(x, y)) close();
	}
	function onStageDblClick(e: MouseEvent) {
		if (!isZoomTarget || pressPointerType === 'touch') return;
		const point = stagePoint(e.clientX, e.clientY);
		zoomTo((g) => doubleClickTarget(g, zoom, point));
	}
	function onStageWheel(e: WheelEvent) {
		// A long open caption scrolls itself.
		if (!isZoomTarget || (e.target as Element).closest?.('[data-lightbox-caption]')) return;
		const g = geometry();
		if (!g) return;
		// A wheel's deltas in px: a line is 40px, a page the stage's height.
		const unit = e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? g.height : 1;
		if (e.ctrlKey) {
			e.preventDefault();
			const point = stagePoint(e.clientX, e.clientY);
			const scale = Math.min(g.maxScale, Math.max(g.minScale, zoom.scale * Math.exp((-e.deltaY * unit) / 100)));
			writeZoom(restingTransform(g, transformKeepingPoint(g, zoom, point, point, scale)), false);
		} else if (isZoomed) {
			e.preventDefault();
			writeZoom(pannedBy(g, zoom, -e.deltaX * unit, -e.deltaY * unit), false);
		}
	}
	$effect(() => {
		const el = wrapper;
		if (!el) return;
		el.addEventListener('wheel', onStageWheel, { passive: false });
		return () => el.removeEventListener('wheel', onStageWheel);
	});
	function markOverPhoto(e: PointerEvent) {
		const el = wrapper;
		const r = currentImg()?.getBoundingClientRect();
		el?.toggleAttribute(
			'data-lightbox-over-photo',
			r != null && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom
		);
	}

	// ---- Caption ----
	let openCaptionIndex = $state<number | null>(null);
	$effect.pre(() => {
		if (openCaptionIndex != null && openCaptionIndex !== index) openCaptionIndex = null;
	});
	const isCaptionOpen = $derived(openCaptionIndex === index);
	let captionText: HTMLElement | undefined = $state();
	let isCaptionClamped = $state(false);
	$effect(() => {
		const el = captionText;
		void index;
		if (!el || typeof ResizeObserver === 'undefined') {
			isCaptionClamped = false;
			return;
		}
		const check = () => {
			if (untrack(() => isCaptionOpen)) return;
			isCaptionClamped = el.scrollHeight > el.clientHeight + 1;
		};
		const ro = new ResizeObserver(check);
		ro.observe(el);
		check();
		return () => ro.disconnect();
	});
	const hasCaptionToggle = $derived(isCaptionClamped || isCaptionOpen);
</script>

{#snippet control(place: string, icon: 'close' | 'chevronLeft' | 'chevronRight', label: string, onclick: () => void, isDisabled = false)}
	<span class={['control', place, hasZoom && 'backed']} data-lightbox-close={icon === 'close' || undefined}>
		<IconButton {icon} {label} variant="ghost" {isDisabled} {onclick} class={icon === 'close' ? undefined : 'mirrored'} />
	</span>
{/snippet}

{#if currentItem}
	<dialog
		{...rest}
		bind:this={dialog}
		class={['astryx-lightbox', 'lightbox', className]}
		aria-label={currentItem.alt || 'Media viewer'}
		aria-describedby={currentItem.caption ? captionId : undefined}
		{oncancel}
		{onkeydown}
		{onclick}
	>
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div bind:this={container} class="container" onpointerdown={onContainerPointerDown}>
			<div class="chrome" data-lightbox-chrome="">
				{@render control('close', 'close', 'Close', close)}
				{#if isGallery}{@render control('nav prev', 'chevronLeft', 'Previous', goToPrev, !canPrev)}{/if}
			</div>
			<div class="media-group" data-lightbox-media="">
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<div
					bind:this={wrapper}
					class="image-wrapper"
					class:zoomable={isZoomTarget && !isZoomed}
					class:zoomed={isZoomTarget && isZoomed}
					class:dragging={isPanning}
					class:touch-dismiss={!isZoomTarget && !isVideo}
					class:touch-page={!isZoomTarget && isVideo && isGallery}
					onpointerdown={onStagePointerDown}
					onpointermove={onStagePointerMove}
					onpointerup={onStagePointerUp}
					onpointercancel={onStagePointerUp}
					onpointerleave={(e) => {
						if (e.pointerType === 'mouse') wrapper?.removeAttribute('data-lightbox-over-photo');
					}}
					ondblclick={onStageDblClick}
				>
					<div
						bind:this={track}
						class="track"
						class:zoom-target={isZoomTarget}
						style:--_lightbox-index={isGallery ? index : 0}
					>
						{#each pageIndexes as i (i)}
							{@const item = mediaArray[i]}
							{@const isCurrent = i === index}
							<div
								class="page"
								data-lightbox-page={i}
								data-current={isCurrent ? '' : undefined}
								inert={!isCurrent || undefined}
								aria-hidden={!isCurrent || undefined}
								style:--_page={isGallery ? i : 0}
							>
								<!-- svelte-ignore a11y_no_static_element_interactions, a11y_no_noninteractive_tabindex (a button role while it zooms) -->
								<div
									class="page-media"
									class:zoom-stage={isZoomTarget}
									data-lightbox-page-media=""
									role={isZoomTarget && isCurrent ? 'button' : undefined}
									tabindex={isZoomTarget && isCurrent ? 0 : undefined}
									aria-pressed={isZoomTarget && isCurrent ? isZoomed : undefined}
									aria-label={isZoomTarget && isCurrent ? 'Zoom' : undefined}
									onkeydown={isZoomTarget && isCurrent ? onStageKeydown : undefined}
								>
									{#if (item.type ?? 'image') === 'video'}
										<!-- svelte-ignore a11y_media_has_caption (the caller's media; Astryx takes no tracks) -->
										<video
											src={item.src}
											aria-label={item.alt}
											controls
											autoplay={isOpen && isCurrent && hasAutoPlay}
											preload={isCurrent ? 'auto' : 'metadata'}
										></video>
									{:else}
										<img
											src={item.src}
											alt={isCurrent ? item.alt : ''}
											aria-hidden={!isCurrent || undefined}
											draggable="false"
										/>
									{/if}
								</div>
								{#if hasCaptionBand}
									{@const hasCaption = item.caption != null && item.caption !== ''}
									<div class="caption-band" class:bare={!hasCaption} class:under-open={isCurrent && isCaptionOpen}>
										{#if hasCaption}
											<div
												id={isCurrent ? fullCaptionId : undefined}
												class="caption"
												class:open={isCurrent && isCaptionOpen}
												data-lightbox-caption=""
											>
												<div class="caption-body">
												{#if isCurrent}
													<div
														bind:this={captionText}
														id={captionId}
														class="caption-text"
														class:clamped={!isCaptionOpen}
														class:beside-toggle={hasCaptionToggle}
													>
														{#if typeof item.caption === 'string'}{item.caption}{:else}{@render item.caption?.()}{/if}
													</div>
													{#if hasCaptionToggle}
														<button
															type="button"
															class="caption-toggle"
															aria-expanded={isCaptionOpen}
															aria-controls={fullCaptionId}
															onclick={() => (openCaptionIndex = isCaptionOpen ? null : index)}
														>
															{isCaptionOpen ? 'Less' : 'More'}
														</button>
													{/if}
												{:else}
													<div class="caption-text clamped">
														{#if typeof item.caption === 'string'}{item.caption}{:else}{@render item.caption?.()}{/if}
													</div>
												{/if}
												</div>
											</div>
										{/if}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			</div>
			<div class="chrome" data-lightbox-chrome="">
				{#if isGallery}{@render control('nav next', 'chevronRight', 'Next', goToNext, !canNext)}{/if}
				{#if isGallery}
					<div class="counter" class:backed={hasZoom}>{index + 1} / {mediaArray.length}</div>
				{/if}
			</div>
		</div>
	</dialog>
{/if}

<style>
	@layer astryx-base {
		.lightbox {
			position: fixed;
			inset: 0;
			width: 100vw;
			height: 100vh;
			height: 100dvh;
			max-width: none;
			max-height: none;
			margin: 0;
			padding: 0;
			border: 0 none;
			background-color: transparent;
			overflow: hidden;
			outline: none;
			font-family: var(--font-family-body);
			font-size: var(--text-body-size);
			line-height: var(--text-body-leading);
		}
		.lightbox::backdrop {
			background-color: var(--color-overlay);
			backdrop-filter: blur(2px);
			opacity: var(--_lightbox-backdrop-opacity, 1);
		}
		/* A moving backdrop drops the blur, which would cost a repaint each frame. */
		.lightbox[data-backdrop-moving]::backdrop { backdrop-filter: none; }
		.container {
			color-scheme: dark;
			color: var(--color-text-primary);
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			width: 100%;
			height: 100%;
			position: relative;
		}
		.chrome {
			position: absolute;
			inset: 0;
			z-index: 2;
			pointer-events: none;
			opacity: var(--_lightbox-chrome-opacity, 1);
		}
		.control { position: absolute; z-index: 1; pointer-events: auto; display: inline-flex; }
		.control.backed {
			background-color: color-mix(in srgb, var(--color-on-light) 75%, transparent);
			border-radius: var(--radius-full);
			color: var(--color-on-dark);
		}
		.control.backed :global(.astryx-button) { color: var(--color-on-dark); }
		.control.close { top: var(--spacing-3); inset-inline-end: var(--spacing-3); }
		.control.nav { top: 50%; translate: 0 -50%; }
		.control.prev { inset-inline-start: var(--spacing-3); }
		.control.next { inset-inline-end: var(--spacing-3); }
		.lightbox:dir(rtl) .control :global(.mirrored svg) { transform: scaleX(-1); }
		.counter {
			position: absolute;
			top: var(--spacing-3);
			inset-inline-start: var(--spacing-3);
			z-index: 1;
			pointer-events: auto;
			color: var(--color-text-primary);
		}
		.counter.backed {
			background-color: color-mix(in srgb, var(--color-on-light) 75%, transparent);
			border-radius: var(--radius-full);
			padding-inline: var(--spacing-2);
			color: var(--color-on-dark);
		}
		.media-group {
			display: flex;
			flex-direction: column;
			align-items: center;
			align-self: stretch;
			flex-grow: 1;
			min-height: 0;
			max-width: 100%;
			max-height: 100%;
			overflow: hidden;
		}
		.image-wrapper {
			display: flex;
			align-items: center;
			justify-content: center;
			align-self: stretch;
			flex: 1 1 0;
			position: relative;
			overflow: hidden;
			cursor: default;
			user-select: none;
			min-height: 0;
		}
		.image-wrapper.touch-dismiss { touch-action: pinch-zoom; }
		/* A video page keeps vertical scroll and native controls, but horizontal swipes page the gallery. */
		.image-wrapper.touch-page { touch-action: pan-y pinch-zoom; }
		.image-wrapper.zoomable[data-lightbox-over-photo] { cursor: zoom-in; }
		.image-wrapper.zoomed { cursor: grab; }
		.image-wrapper.zoomed.dragging { cursor: grabbing; }
		.track {
			position: absolute;
			inset: 0;
			display: grid;
			grid-template-columns: 100%;
			grid-template-rows: minmax(0, 1fr) auto;
			transform: translateX(
				calc(var(--_lightbox-index) * -1 * (100% + 40px) + var(--_lightbox-drag, 0px))
			);
		}
		.lightbox:dir(rtl) .track {
			transform: translateX(calc(var(--_lightbox-index) * (100% + 40px) + var(--_lightbox-drag, 0px)));
		}
		.track.zoom-target { touch-action: pinch-zoom; }
		.page {
			position: relative;
			grid-column: 1;
			grid-row: 1 / span 2;
			display: grid;
			grid-template-columns: 100%;
			grid-template-rows: subgrid;
			min-height: 0;
			inset-inline-start: calc(var(--_page) * (100% + 40px));
			will-change: transform;
		}
		.page-media {
			grid-row: 1;
			position: relative;
			min-height: 0;
			min-width: 0;
			display: flex;
			align-items: center;
			justify-content: center;
			overflow: hidden;
		}
		.page-media.zoom-stage { touch-action: none; cursor: inherit; outline: 0 none; }
		.page-media.zoom-stage:focus-visible {
			outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color);
			outline-offset: calc(-1 * var(--focus-outline-width));
		}
		img {
			max-width: 100%;
			max-height: 100%;
			object-fit: contain;
			pointer-events: none;
			transform-origin: 0 0;
		}
		video {
			max-width: 100%;
			max-height: 100%;
			object-fit: contain;
			outline: none;
		}
		.caption-band {
			grid-row: 2;
			position: relative;
			display: flex;
			justify-content: center;
			align-items: flex-start;
			min-width: 0;
			box-sizing: content-box;
			block-size: calc(var(--spacing-2) + 2lh);
			padding-block-end: calc(var(--spacing-3) + env(safe-area-inset-bottom, 0px));
			background-color: color-mix(in srgb, var(--color-on-light) 90%, transparent);
			opacity: var(--_lightbox-chrome-opacity, 1);
		}
		.caption-band.bare,
		.caption-band.under-open { background-color: transparent; }
		.caption {
			position: relative;
			display: flex;
			align-items: flex-start;
			min-width: 0;
			max-width: 100%;
		}
		.caption-body {
			position: relative;
			display: flex;
			align-items: flex-start;
			min-width: 0;
			max-width: 100%;
		}
		.caption.open {
			position: absolute;
			inset-inline: 0;
			inset-block-end: 0;
			justify-content: center;
			max-width: none;
			padding-block-end: calc(var(--spacing-3) + env(safe-area-inset-bottom, 0px));
			background-color: color-mix(in srgb, var(--color-on-light) 90%, transparent);
		}
		.caption-text {
			padding-block-start: var(--spacing-2);
			padding-inline: var(--spacing-3);
			max-width: 600px;
			min-width: 0;
			flex-shrink: 1;
			overflow-wrap: anywhere;
		}
		.caption-text.clamped {
			display: -webkit-box;
			-webkit-box-orient: vertical;
			-webkit-line-clamp: 2;
			line-clamp: 2;
			overflow: hidden;
		}
		.caption.open .caption-text {
			max-block-size: calc(60dvh - var(--spacing-3) - env(safe-area-inset-bottom, 0px));
			overflow-y: auto;
			touch-action: pan-y pinch-zoom;
			padding-block-end: 1lh;
		}
		.caption-text.beside-toggle { padding-inline-end: calc(var(--spacing-3) + 3em); }
		.caption-toggle {
			position: absolute;
			inset-inline-end: var(--spacing-3);
			inset-block-end: 0;
			padding: 0;
			border: 0 none;
			background: none;
			font: inherit;
			color: inherit;
			text-decoration: underline;
			cursor: pointer;
		}
		.caption-toggle:focus-visible {
			outline: var(--focus-outline-width) var(--focus-outline-style) var(--focus-outline-color);
			outline-offset: var(--focus-outline-offset);
		}
	}
</style>
