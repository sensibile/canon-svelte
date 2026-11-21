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
