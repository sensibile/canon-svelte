// Port of Astryx utils/characters.ts, MIT, Meta Platforms, Inc.
// Counts user-perceived characters (grapheme clusters), so an emoji counts as one.
const segmenter = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;

export function characterCount(str: string): number {
	if (str === '') return 0;
	if (segmenter) {
		let n = 0;
		for (const _ of segmenter.segment(str)) n++;
		return n;
	}
	return [...str].length;
}

/** The first user-perceived character, so a capital never splits an emoji or a combining mark. */
export function firstCharacter(str: string): string {
	if (str === '') return '';
	if (segmenter) {
		for (const { segment } of segmenter.segment(str)) return segment;
	}
	return [...str][0] ?? '';
}

function splitCharacters(str: string): string[] {
	if (segmenter) return [...segmenter.segment(str)].map((s) => s.segment);
	return [...str];
}

/** Cut a string to `max` user-perceived characters, ending with `ellipsis` when cut. */
export function truncateCharacters(str: string, max: number, ellipsis = '…'): string {
	const characters = splitCharacters(str);
	if (characters.length <= max) return str;
	const keep = Math.max(max - characterCount(ellipsis), 0);
	return characters.slice(0, keep).join('') + ellipsis;
}
