// Port of Astryx `snapOffsets` (packages/core/src/BottomSheet/snapOffsets.ts), MIT, Meta Platforms, Inc.
// Snap points are visible heights; offsets are how far the sheet sits below its full height.

export type BottomSheetSnapPoint = number | string;

/** Detents closer than this to one another collapse into one. */
export const DETENT_DEDUP_PX = 48;
/** A stop this share of the sheet or less is a peek: the scrim thins instead of clearing. */
export const PEEK_MAX_HEIGHT_RATIO = 0.25;
export const MIN_PEEK_SCRIM_OPACITY = 0.3;

const SNAP_POINT_PATTERN = /^(\d+(?:\.\d+)?|\.\d+)(px|%)$/i;

function parseSnapPoint(point: BottomSheetSnapPoint, viewportPx: number): number | null {
	if (typeof point === 'number') {
		return Number.isFinite(point) && point > 0 && point <= 1 ? point * viewportPx : null;
	}
	const match = SNAP_POINT_PATTERN.exec(point.trim());
	if (match === null) return null;
	const value = Number.parseFloat(match[1]);
	if (!(value > 0)) return null;
	return match[2].toLowerCase() === '%' ? (value / 100) * viewportPx : value;
}

export function isValidSnapPoint(point: BottomSheetSnapPoint): boolean {
	return parseSnapPoint(point, 1) !== null;
}

export function resolveSnapPoints(points: readonly BottomSheetSnapPoint[], viewportPx: number): number[] {
	const heights: number[] = [];
	for (const point of points) {
		const height = parseSnapPoint(point, viewportPx);
		if (height !== null) heights.push(height);
	}
	return heights;
}

/** Resting offsets, ascending: 0 (fully open) first, then each shorter detent. */
export function computeDetentOffsets(
	sheetHeight: number,
	detentHeights: readonly number[],
	dedupPx: number = DETENT_DEDUP_PX
): number[] {
	const collapsed = detentHeights.filter((h) => h > 0 && h < sheetHeight).map((h) => sheetHeight - h);
	const ascending = [0, ...collapsed].sort((a, b) => a - b);
	const deduped: number[] = [];
	for (const offset of ascending) {
		const last = deduped[deduped.length - 1];
		if (last === undefined || offset - last >= dedupPx) deduped.push(offset);
	}
	return deduped;
}

export function nearestOffset(value: number, offsets: readonly number[]): number {
	return offsets.reduce((best, o) => (Math.abs(o - value) < Math.abs(best - value) ? o : best), offsets[0]);
}

export function peekOffsetFor(offsets: readonly number[], visibleSheetHeight: number): number | null {
	if (offsets.length < 2 || visibleSheetHeight <= 0) return null;
	const shortest = offsets[offsets.length - 1];
	const heightAtShortest = visibleSheetHeight - shortest;
	return heightAtShortest <= PEEK_MAX_HEIGHT_RATIO * visibleSheetHeight ? shortest : null;
}

export function scrimOpacityForOffset(
	offset: number,
	offsets: readonly number[],
	dismissOffset: number,
	peekOffset: number | null
): number {
	const hasPeek = peekOffset !== null;
	const fadeStart = hasPeek ? offsets[offsets.length - 2] : offsets[offsets.length - 1];
	const fadeEnd = hasPeek ? peekOffset : dismissOffset;
	const floor = hasPeek ? MIN_PEEK_SCRIM_OPACITY : 0;
	if (offset <= fadeStart) return 1;
	if (offset >= fadeEnd) return floor;
	return 1 - (1 - floor) * ((offset - fadeStart) / (fadeEnd - fadeStart));
}

// UIKit sheet release constants (Astryx motion/uikit/sheet.ts), px/s and s.
export const SHEET_RELEASE = {
	fastSpeed: 1008,
	projectionSeconds: 0.1,
	minProjectionSpeed: 250,
	detentTolerance: 1
} as const;

/**
 * Where a release settles, among `positions` (ascending offsets, the dismissed position included
 * when the sheet can be swiped away). `velocity` is px/s, positive downward.
 */
export function resolveRelease(offset: number, velocity: number, positions: readonly number[]): number {
	const speed = Math.abs(velocity);
	if (speed < SHEET_RELEASE.minProjectionSpeed) return nearestOffset(offset, positions);
	const projected = offset + velocity * SHEET_RELEASE.projectionSeconds;
	if (speed < SHEET_RELEASE.fastSpeed) return nearestOffset(projected, positions);
	// A flick goes at least to the next position beyond, and on past it while its projection does.
	const dir = Math.sign(velocity);
	const beyond = positions
		.filter((p) => (dir > 0 ? p > offset + SHEET_RELEASE.detentTolerance : p < offset - SHEET_RELEASE.detentTolerance))
		.sort((a, b) => (a - b) * dir);
	if (beyond.length === 0) return nearestOffset(offset, positions);
	return beyond.find((p) => (dir > 0 ? p >= projected : p <= projected)) ?? beyond[beyond.length - 1];
}
