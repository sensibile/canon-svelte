// Port of Astryx's URL guard (packages/core/src/utils/safeUrl.ts), MIT, Meta Platforms, Inc.
// Rejects script-running URLs (javascript:, vbscript:, data:text/html) in data-driven links.
function normalizeUrl(url: string): string {
	// eslint-disable-next-line no-control-regex
	return url.replace(/[\x00-\x1f\x7f]/g, '').trim();
}

export function sanitizeUrl(url: string): string | null {
	const normalized = normalizeUrl(url);
	const lower = normalized.toLowerCase().replace(/^([a-z][a-z\d+.-]*:) +/, '$1');
	if (lower.startsWith('javascript:') || lower.startsWith('vbscript:') || lower.startsWith('data:text/html')) {
		return null;
	}
	return normalized;
}

export function isSafeUrl(url: string): boolean {
	return sanitizeUrl(url) !== null;
}
