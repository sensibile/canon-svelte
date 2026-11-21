// Port of Astryx utils/isApplePlatform.ts, MIT, Meta Platforms, Inc.
/** True on macOS / iOS, where shortcuts use ⌘ rather than Ctrl. */
export function isApplePlatform(): boolean {
	if (typeof navigator === 'undefined') return false;
	const uaData = (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData;
	const named = uaData?.platform?.trim();
	if (named) return /mac|ios|iphone|ipad/i.test(named);
	return /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent);
}
