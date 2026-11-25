// Port of Astryx `zoomStage` (packages/core/src/Lightbox/zoomStage.ts), with the constants of
// motion/uikit/zoomMedia.ts and the rubber band of motion/rubberBand.ts, MIT, Meta Platforms, Inc.
// Pure zoom geometry: a transform is the image's translate (from its fitted origin) and scale.

export const zoomMedia = {
	overshoot: { limitFactor: 2 },
	viewer: { maxPixelZoomMultiple: 6, pageGap: 40 },
	dismiss: {
		scalePerTravelSquared: 4.91e-6,
		backdropAlphaPerTravelSquared: 1.35e-5,
		chromeAlphaPerPoint: 0.00533,
		chromeFadeStart: 17.8,
		cancelTravel: 10,
		projectionRate: 0.998
	}
} as const;

const RUBBER_BAND_COEFFICIENT = 0.55;
function rubberBand(overflow: number, dimension: number): number {
	if (!(dimension > 0)) return 0;
	const x = Math.abs(overflow);
	const banded = (1 - 1 / ((x * RUBBER_BAND_COEFFICIENT) / dimension + 1)) * dimension;
	return overflow < 0 ? -banded : banded;
}
function rubberBandInverse(displayed: number, dimension: number): number {
	if (!(dimension > 0)) return 0;
	const b = Math.abs(displayed);
	if (b >= dimension) return displayed < 0 ? -Infinity : Infinity;
	const x = ((dimension / RUBBER_BAND_COEFFICIENT) * b) / (dimension - b);
	return displayed < 0 ? -x : x;
}
export function rubberBandClamp(value: number, min: number, max: number, dimension: number): number {
	if (value < min) return min + rubberBand(value - min, dimension);
	if (value > max) return max + rubberBand(value - max, dimension);
	return value;
}
function rubberBandUnclamp(displayed: number, min: number, max: number, dimension: number): number {
	if (displayed < min) return min + rubberBandInverse(displayed - min, dimension);
	if (displayed > max) return max + rubberBandInverse(displayed - max, dimension);
	return displayed;
}

export interface StagePoint {
	readonly x: number;
	readonly y: number;
}
export interface ZoomTransform {
	readonly x: number;
	readonly y: number;
	readonly scale: number;
}
export interface ZoomGeometry {
	readonly width: number;
	readonly height: number;
	readonly fit: {
		readonly x: number;
		readonly y: number;
		readonly width: number;
		readonly height: number;
	};
	readonly minScale: number;
	readonly maxScale: number;
	readonly doubleTapScale: number;
}
export const IDENTITY: ZoomTransform = { x: 0, y: 0, scale: 1 };
export const ZOOMED_EPSILON = 0.001;
export const ZOOM_STEP = 2;
export function doubleTapScaleFor(width: number, height: number, fitWidth: number, fitHeight: number): number {
	if (!(fitWidth > 0) || !(fitHeight > 0)) {
		return ZOOM_STEP;
	}
	return Math.max(ZOOM_STEP, width / fitWidth, height / fitHeight);
}
export function maxScaleFor(
	naturalWidth: number,
	fitWidth: number,
	devicePixelRatio: number,
	doubleTapScale: number
): number {
	const { maxPixelZoomMultiple } = zoomMedia.viewer;
	if (!(fitWidth > 0) || !(naturalWidth > 0) || !(devicePixelRatio > 0)) {
		return doubleTapScale;
	}
	const pixelScale = naturalWidth / (fitWidth * devicePixelRatio);
	return Math.max(doubleTapScale, maxPixelZoomMultiple * pixelScale);
}
export function isZoomed(geometry: ZoomGeometry, transform: ZoomTransform): boolean {
	return transform.scale > geometry.minScale + ZOOMED_EPSILON;
}
interface AxisRange {
	readonly min: number;
	readonly max: number;
}
function axisRange(stageSize: number, fitStart: number, fitSize: number, scale: number): AxisRange {
	const size = fitSize * scale;
	if (size <= stageSize) {
		const centred = (stageSize - size) / 2 - fitStart;
		return { min: centred, max: centred };
	}
	return { min: stageSize - size - fitStart, max: 0 - fitStart };
}
export function restRange(geometry: ZoomGeometry, scale: number): { readonly x: AxisRange; readonly y: AxisRange } {
	const { fit } = geometry;
	return {
		x: axisRange(geometry.width, fit.x, fit.width, scale),
		y: axisRange(geometry.height, fit.y, fit.height, scale)
	};
}
export function restingTransform(geometry: ZoomGeometry, transform: ZoomTransform): ZoomTransform {
	const range = restRange(geometry, transform.scale);
	return {
		x: Math.min(range.x.max, Math.max(range.x.min, transform.x)),
		y: Math.min(range.y.max, Math.max(range.y.min, transform.y)),
		scale: transform.scale
	};
}
export function overshootScale(geometry: ZoomGeometry, scale: number): number {
	const f = zoomMedia.overshoot.limitFactor;
	const { minScale: m, maxScale: M } = geometry;
	if (scale > M) {
		return M * (f - ((f - 1) * M) / scale);
	}
	if (scale < m) {
		return m / (f - ((f - 1) * scale) / m);
	}
	return scale;
}
export function pinchScaleFor(geometry: ZoomGeometry, shown: number): number {
	const f = zoomMedia.overshoot.limitFactor;
	const { minScale: m, maxScale: M } = geometry;
	if (shown > M) {
		const gap = f * M - shown;
		return gap > 0 ? ((f - 1) * M * M) / gap : Number.POSITIVE_INFINITY;
	}
	if (shown < m) {
		return Math.max(0, ((f - m / shown) * m) / (f - 1));
	}
	return shown;
}
export function transformKeepingPoint(
	geometry: ZoomGeometry,
	from: ZoomTransform,
	anchor: StagePoint,
	point: StagePoint,
	scale: number
): ZoomTransform {
	const { fit } = geometry;
	const u = (anchor.x - fit.x - from.x) / from.scale;
	const v = (anchor.y - fit.y - from.y) / from.scale;
	return {
		x: point.x - fit.x - u * scale,
		y: point.y - fit.y - v * scale,
		scale
	};
}
export function draggedTransform(geometry: ZoomGeometry, raw: ZoomTransform): ZoomTransform {
	const range = restRange(geometry, raw.scale);
	return {
		x: range.x.min === range.x.max ? range.x.min : rubberBandClamp(raw.x, range.x.min, range.x.max, geometry.width),
		y: range.y.min === range.y.max ? range.y.min : rubberBandClamp(raw.y, range.y.min, range.y.max, geometry.height),
		scale: raw.scale
	};
}
export function rawForDragged(geometry: ZoomGeometry, shown: ZoomTransform): ZoomTransform {
	const range = restRange(geometry, shown.scale);
	return {
		x: range.x.min === range.x.max ? shown.x : rubberBandUnclamp(shown.x, range.x.min, range.x.max, geometry.width),
		y: range.y.min === range.y.max ? shown.y : rubberBandUnclamp(shown.y, range.y.min, range.y.max, geometry.height),
		scale: shown.scale
	};
}
export function doubleTapTarget(geometry: ZoomGeometry, from: ZoomTransform, point: StagePoint): ZoomTransform {
	if (isZoomed(geometry, from)) {
		return restingTransform(geometry, {
			...IDENTITY,
			scale: geometry.minScale
		});
	}
	const scale = Math.min(geometry.maxScale, Math.max(geometry.minScale, geometry.doubleTapScale));
	return restingTransform(geometry, transformKeepingPoint(geometry, from, point, point, scale));
}
export function releaseTarget(geometry: ZoomGeometry, shown: ZoomTransform, centroid: StagePoint): ZoomTransform {
	const limit = Math.min(geometry.maxScale, Math.max(geometry.minScale, shown.scale));
	if (limit === shown.scale) {
		return shown;
	}
	return restingTransform(geometry, transformKeepingPoint(geometry, shown, centroid, centroid, limit));
}
export function releasedZoomTarget(geometry: ZoomGeometry, from: ZoomTransform): ZoomTransform {
	return doubleClickTarget(geometry, from, {
		x: geometry.width / 2,
		y: geometry.height / 2
	});
}
export function doubleClickTarget(geometry: ZoomGeometry, from: ZoomTransform, point: StagePoint): ZoomTransform {
	return doubleTapTarget({ ...geometry, doubleTapScale: ZOOM_STEP }, from, point);
}
export function pannedBy(geometry: ZoomGeometry, from: ZoomTransform, dx: number, dy: number): ZoomTransform {
	return restingTransform(geometry, {
		x: from.x + dx,
		y: from.y + dy,
		scale: from.scale
	});
}
export function transformForResize(before: ZoomGeometry, after: ZoomGeometry, transform: ZoomTransform): ZoomTransform {
	if (!isZoomed(before, transform)) {
		return { ...IDENTITY, scale: after.minScale };
	}
	const ratio = after.fit.width > 0 ? before.fit.width / after.fit.width : 1;
	const scale = Math.min(after.maxScale, Math.max(after.minScale, transform.scale * ratio));
	const u = (before.width / 2 - before.fit.x - transform.x) / transform.scale / before.fit.width;
	const v = (before.height / 2 - before.fit.y - transform.y) / transform.scale / before.fit.height;
	return restingTransform(after, {
		x: after.width / 2 - after.fit.x - u * after.fit.width * scale,
		y: after.height / 2 - after.fit.y - v * after.fit.height * scale,
		scale
	});
}
export function dismissTransform(geometry: ZoomGeometry, dx: number, dy: number): ZoomTransform {
	const travel = Math.max(0, dy);
	const scale = Math.max(0, 1 - zoomMedia.dismiss.scalePerTravelSquared * travel * travel);
	return {
		x: dx + ((1 - scale) * geometry.fit.width) / 2,
		y: dy + ((1 - scale) * geometry.fit.height) / 2,
		scale
	};
}
export function dismissBackdropAlpha(travel: number): number {
	const t = Math.max(0, travel);
	return Math.min(1, Math.max(0, 1 - zoomMedia.dismiss.backdropAlphaPerTravelSquared * t * t));
}
export function dismissChromeAlpha(travel: number): number {
	const { chromeAlphaPerPoint, chromeFadeStart } = zoomMedia.dismiss;
	return Math.min(1, Math.max(0, 1 - chromeAlphaPerPoint * (travel - chromeFadeStart)));
}
export function dismissCommits(travel: number, velocityY: number): boolean {
	const { cancelTravel, projectionRate } = zoomMedia.dismiss;
	// Released moving back up: the drag is cancelled.
	if (velocityY < 0 && travel > 0) return false;
	// UIKit's deceleration projection: velocity (px/s) × rate / (1 − rate) / 1000.
	const projected = travel + (velocityY * projectionRate) / (1 - projectionRate) / 1000;
	return Math.abs(projected - 2 * cancelTravel) < Math.abs(projected);
}
export function dismissExitY(geometry: ZoomGeometry, shown: ZoomTransform, bottom: number = geometry.height): number {
	return Math.max(shown.y, Math.max(bottom, geometry.height) - geometry.fit.y) + 1;
}
