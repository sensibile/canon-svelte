export interface OutlineItem {
	/** The id of the heading element the item scrolls to. */
	id: string;
	label: string;
	/** Heading level, 1-6; levels past 1 indent. */
	level: number;
}
