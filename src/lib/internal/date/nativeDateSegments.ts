// Port of Astryx `nativeDateSegments` (packages/core/src/DateInput/nativeDateSegments.ts), MIT, Meta Platforms, Inc.
// Whether the browser's native date and time inputs edit in place (typed segments) or only open a picker.
// The field shows its own formatted text over a picker-only input, and the browser's segments otherwise.

const PROBE_ATTR = 'data-astryx-date-probe';
const PROBE_PADDING = 100;

type EngineKind = 'segmented' | 'picker-only' | 'unknown';

let cachedEngine: EngineKind | null = null;

// A pseudo-element that is a real box widens the input when padded.
function pseudoIsRealBox(input: HTMLInputElement, style: HTMLStyleElement, pseudo: string, baseWidth: number): boolean {
	style.textContent = `[${PROBE_ATTR}]${pseudo}{padding-inline-start:${PROBE_PADDING}px !important}`;
	return input.getBoundingClientRect().width > baseWidth + PROBE_PADDING / 2;
}

function probeEngine(): EngineKind {
	if (cachedEngine !== null) return cachedEngine;
	if (typeof document === 'undefined' || !document.body) return 'unknown';
	const input = document.createElement('input');
	input.setAttribute('type', 'date');
	input.setAttribute(PROBE_ATTR, '');
	input.style.cssText =
		'position:fixed;top:-9999px;left:0;width:auto;min-width:0;max-width:none;' +
		'padding:0;border:0;font-size:16px;box-sizing:content-box;';
	const style = document.createElement('style');
	let kind: EngineKind = 'unknown';
	try {
		document.body.appendChild(input);
		document.head.appendChild(style);
		const base = input.getBoundingClientRect().width;
		if (pseudoIsRealBox(input, style, '::-webkit-datetime-edit', base)) kind = 'segmented';
		else if (pseudoIsRealBox(input, style, '::-webkit-date-and-time-value', base)) kind = 'picker-only';
	} catch {
		// An engine that refuses the probe stays unknown.
	} finally {
		input.remove();
		style.remove();
	}
	cachedEngine = kind;
	return kind;
}

/** Whether the focused native input shows editable segments; unknown engines guess from the pointer. */
export function hasEditableDateSegments(isTouchPointer: boolean): boolean {
	const engine = probeEngine();
	return engine === 'unknown' ? !isTouchPointer : engine === 'segmented';
}
