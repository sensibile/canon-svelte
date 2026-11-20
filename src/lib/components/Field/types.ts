export type FieldStatusType = 'warning' | 'error' | 'success';
/** Where a status message renders: under the input, joined to it, or as its own box. */
export type FieldStatusPlacement = 'attached' | 'detached';

export interface FieldStatusInput {
	type: FieldStatusType;
	message?: string;
	messageID?: string;
}
