// Port of Astryx DateInput/useTypedDate.ts (useTypedDate, useTypedDateField), MIT, Meta Platforms,
// Inc. The typed entry of a date text field: reading text as a date, committing it on Enter or
// blur, and the rejection it shows. Gregorian only, so there is no format hint or calendar
// description. The hook becomes a class whose options are read through a getter.
import type { FieldStatusInput } from '../Field/types.js';
import type { ISODateString, PlainDate } from '../../internal/date/dateTypes.js';
import {
	type CalendarDateParseResult,
	formatCalendarDateText,
	getCalendarDateLexicon,
	parseCalendarDate
} from '../../internal/date/calendarDateParser.js';
import { parseDateInput } from '../../internal/date/dateParser.js';
import {
	type SharedDateFormat,
	plainDateFromISO,
	plainDateIsAfter,
	plainDateIsBefore,
	plainDateToISO
} from '../../internal/date/plainDate.js';

/** When a field shows its own entry error: as soon as a typed date is complete, or at Enter/blur. */
export type EntryErrorBehavior = 'complete' | 'blur-or-enter';

/** Why a date field rejects typed text, as `onEntryErrorChange` reports it. */
export interface DateInputEntryError {
	/**
	 * - `'unreadable'`: text that is not a date
	 * - `'incomplete'`: part of a date that Enter or blur cannot finish
	 * - `'nonexistent'`: a date the calendar does not have
	 * - `'outOfRange'`: a date before `min` or after `max`
	 * - `'unavailable'`: a date that `dateConstraints` rules out
	 */
	kind: 'unreadable' | 'incomplete' | 'nonexistent' | 'outOfRange' | 'unavailable';
	/** The typed text. */
	text: string;
	/** The ISO date the text names, for `outOfRange` and `unavailable`. */
	date?: ISODateString;
}

export type DateFormat = SharedDateFormat | ((value: ISODateString) => string);
type TypedDateError = 'unreadable' | 'nonexistent' | 'outOfRange';

function isOutsideBounds(date: PlainDate, min: ISODateString | undefined, max: ISODateString | undefined): boolean {
	return (
		(min != null && plainDateIsBefore(date, plainDateFromISO(min))) ||
		(max != null && plainDateIsAfter(date, plainDateFromISO(max)))
	);
}

/**
 * The rejection a result shows: the error of text that Enter or blur committed, or, under
 * `'complete'`, of a complete date. Text that is not a date waits for the commit.
 */
function typedDateError(
	result: CalendarDateParseResult | null,
	isCommitted: boolean,
	behavior: EntryErrorBehavior
): TypedDateError | null {
	if (result == null) return null;
	if ((result.kind === 'unreadable' || result.kind === 'incomplete') && isCommitted) return 'unreadable';
	if (
		(result.kind === 'nonexistent' || result.kind === 'outOfRange') &&
		(isCommitted || (result.isComplete && behavior === 'complete'))
	) {
		return result.kind;
	}
	return null;
}

const isAcceptedDate = (result: CalendarDateParseResult) => result.kind === 'value' && result.isComplete;

function dateEntryError(
	result: CalendarDateParseResult | null,
	isCommitted: boolean,
	text: string,
	min: ISODateString | undefined,
	max: ISODateString | undefined,
	behavior: EntryErrorBehavior
): DateInputEntryError | null {
	const error = typedDateError(result, isCommitted, behavior);
	if (error == null || result == null) return null;
	if (result.kind === 'incomplete') return { kind: 'incomplete', text };
	if (result.kind === 'outOfRange') {
		return {
			kind: isOutsideBounds(result.date, min, max) ? 'outOfRange' : 'unavailable',
			text,
			date: plainDateToISO(result.date)
		};
	}
	return { kind: error, text };
}

export function isSameEntryError(a: DateInputEntryError | null, b: DateInputEntryError | null): boolean {
	return a === b || (a != null && b != null && a.kind === b.kind && a.text === b.text && a.date === b.date);
}

export interface TypedDateOptions {
	format: DateFormat;
	locale: string;
	min?: ISODateString;
	max?: ISODateString;
	isDateDisabled: (date: PlainDate) => boolean;
}

/** Reads typed text as a date and writes committed text, in the field's locale. */
export function parseTypedDate(text: string, o: TypedDateOptions): CalendarDateParseResult {
	const result = parseCalendarDate(text, getCalendarDateLexicon(o.locale, 'gregory'), {
		isoIsGregorian: o.format === 'system_date',
		isDateDisabled: o.isDateDisabled
	});
	if (result.kind !== 'unreadable' && result.kind !== 'nonexistent') return result;
	// Gregorian text that only the looser parser reads (such as a day-first date in a month-first
	// locale) still commits, on Enter or blur only: it is never complete while typing.
	const date = parseDateInput(text, o.locale);
	if (date == null) return result;
	return o.isDateDisabled(date) ? { kind: 'outOfRange', date, isComplete: false } : { kind: 'value', date, isComplete: false };
}

export function formatCommittedDate(value: ISODateString, o: TypedDateOptions): string {
	return typeof o.format === 'function'
		? o.format(value)
		: formatCalendarDateText(plainDateFromISO(value), o.format, o.locale, 'gregory');
}

/** The message for a rejected result. */
export function typedDateErrorMessage(result: CalendarDateParseResult, o: TypedDateOptions): string {
	if (result.kind === 'nonexistent') return 'Enter a real date';
	if (result.kind === 'outOfRange') {
		const boundFormat = typeof o.format === 'function' ? 'date_long' : o.format;
		const write = (bound: ISODateString) =>
			formatCalendarDateText(plainDateFromISO(bound), boundFormat, o.locale, 'gregory');
		const { min, max } = o;
		if (!isOutsideBounds(result.date, min, max)) return 'Enter an available date';
		if (min != null && max != null) return `Enter a date from ${write(min)} to ${write(max)}`;
		if (min != null) return `Enter a date on or after ${write(min)}`;
		return `Enter a date on or before ${write(max!)}`;
	}
	return 'Invalid date';
}

export interface TypedDateFieldOptions extends TypedDateOptions {
	/** The committed date. */
	value: ISODateString | undefined;
	/** Reports a typed date. */
	onChange: (value: ISODateString) => void;
	/** Runs when Enter or blur commits emptied text. */
	onClear: () => void;
	/** Runs when typing completes a new date, such as to show its month. */
	onTypedDate?: (value: ISODateString) => void;
	/** A disabled or busy field ignores typing, Enter and blur, and hides a typed rejection. */
	isDisabled: boolean;
	/** The caller's status. */
	status?: FieldStatusInput;
	/** Whether a Field around the input announces the status (false inside an InputGroup). */
	isStatusAnnounced: boolean;
	onEntryErrorChange?: (error: DateInputEntryError | null) => void;
	entryErrorBehavior: EntryErrorBehavior;
}

/** The typed entry of a date text field: its text, rejections, and commits. */
export class TypedDateField {
	/** Typed text, or null when the field shows the committed value. */
	pendingInput = $state<string | null>(null);
	/** Set when Enter or blur keeps rejected text so it can be corrected. */
	isRejectionCommitted = $state(false);
	/** Rejected text whose rejection stays shown while an edit leaves the entry rejected. */
	keptText = $state<string | null>(null);
	isFocused = $state(false);
	/** The date typing last reported, so one typing session reports each date once. */
	#lastFired: ISODateString | undefined = undefined;
	#reported: DateInputEntryError | null = null;
	/** Set while an Enter or blur that keeps rejected text runs, so a value it brings keeps the text. */
	#isKeeping = false;
	#o: () => TypedDateFieldOptions;

	constructor(options: () => TypedDateFieldOptions) {
		this.#o = options;
	}

	get options() {
		return this.#o();
	}

	typedResult = $derived.by(() =>
		this.pendingInput !== null && this.pendingInput.trim() ? parseTypedDate(this.pendingInput, this.options) : null
	);

	/** The rejection the field shows. A locked field hides it but keeps its state. */
	shown = $derived.by(() => {
		const o = this.options;
		if (o.isDisabled) return null;
		const result = this.typedResult;
		const ownError = typedDateError(result, this.isRejectionCommitted, o.entryErrorBehavior);
		if (ownError != null && result != null && this.pendingInput !== null) return { text: this.pendingInput, result };
		const kept = this.keptText;
		if (kept !== null && result != null && !isAcceptedDate(result)) {
			const keptResult = parseTypedDate(kept, o);
			if (typedDateError(keptResult, true, o.entryErrorBehavior) != null) return { text: kept, result: keptResult };
		}
		return null;
	});

	entryError = $derived.by(() => {
		const s = this.shown;
		const o = this.options;
		return s ? dateEntryError(s.result, true, s.text, o.min, o.max, o.entryErrorBehavior) : null;
	});

	/** The field's own message for the shown rejection. */
	rejectionMessage = $derived(this.shown ? typedDateErrorMessage(this.shown.result, this.options) : null);

	/** With `onEntryErrorChange`, the caller's error status words the rejection instead. */
	#callerErrorMessage = $derived.by(() => {
		const { status, onEntryErrorChange } = this.options;
		return onEntryErrorChange != null && status?.type === 'error' && status.message ? status.message : null;
	});

	/** The status the field shows. */
	fieldStatus: FieldStatusInput | undefined = $derived.by(() =>
		this.rejectionMessage == null || this.#callerErrorMessage != null
			? this.options.status
			: { type: 'error', message: this.rejectionMessage }
	);

	/** The rejection message that the field status does not announce. */
	alertMessage = $derived.by(() => {
		if (this.rejectionMessage == null) return '';
		const callerMessage = this.#callerErrorMessage;
		if (callerMessage == null) return this.options.isStatusAnnounced ? '' : this.rejectionMessage;
		return this.options.isStatusAnnounced ? '' : callerMessage;
	});

	/** Unreadable text that Enter or blur kept: the form posts the committed date instead. */
	#isKeptUnreadable = $derived(this.isRejectionCommitted && this.typedResult?.kind === 'unreadable');

	committedText = $derived.by(() => {
		const value = this.options.value;
		return value != null && /^\d{4}-\d{2}-\d{2}$/.test(value) ? formatCommittedDate(value, this.options) : '';
	});

	/** The text the input shows. */
	displayValue = $derived(this.pendingInput ?? this.committedText);
	/** Whether typed text waits to commit (Enter is held back from the form). */
	isPending = $derived(this.pendingInput !== null && !this.#isKeptUnreadable);
	/** What a hidden input posts while Enter or blur keeps unreadable text, or null. */
	hiddenFormValue = $derived(this.#isKeptUnreadable ? this.committedText : null);
	isInvalid = $derived(this.shown != null);

	reportEntryError(error: DateInputEntryError | null) {
		const { onEntryErrorChange } = this.options;
		if (onEntryErrorChange == null || isSameEntryError(error, this.#reported)) return;
		this.#reported = error;
		onEntryErrorChange(error);
	}

	/** Keeps the caller's entry error in step with a rejection a prop change starts or ends. */
	syncEntryError() {
		this.reportEntryError(this.entryError);
	}

	/** A new value from outside drops typed text, except one an Enter or blur brought with kept text. */
	valueChanged(value: ISODateString | undefined) {
		if (value === this.#lastFired) return;
		this.#lastFired = undefined;
		if (this.pendingInput !== null && !this.#isKeeping) this.reset();
	}

	/** The field became editable: text whose date typing already reported gives way to the value. */
	enabled() {
		const result = this.typedResult;
		if (!this.isFocused && result?.kind === 'value' && plainDateToISO(result.date) === this.#lastFired) {
			this.#lastFired = undefined;
			this.pendingInput = null;
			this.isRejectionCommitted = false;
			this.keptText = null;
		}
	}

	#report(date: ISODateString): boolean {
		if (date === this.options.value || date === this.#lastFired) return false;
		this.#lastFired = date;
		this.options.onChange(date);
		return true;
	}

	reset() {
		this.pendingInput = null;
		this.isRejectionCommitted = false;
		this.keptText = null;
		this.reportEntryError(null);
	}

	handleChange(text: string) {
		const o = this.options;
		if (o.isDisabled) return;
		// Report a date only once more typing cannot change it.
		const result = parseTypedDate(text, o);
		const isEmpty = !text.trim();
		const error = isEmpty ? null : dateEntryError(result, false, text, o.min, o.max, o.entryErrorBehavior);
		// An edit that leaves the entry rejected or unfinished keeps the shown rejection.
		const nextKeptText = error != null || isEmpty || isAcceptedDate(result) ? null : (this.shown?.text ?? null);
		const previousError = this.entryError;
		this.pendingInput = text;
		this.isRejectionCommitted = false;
		this.keptText = nextKeptText;
		this.reportEntryError(error ?? (nextKeptText !== null ? previousError : null));
		if (result.kind === 'value' && result.isComplete) {
			const date = plainDateToISO(result.date);
			if (this.#report(date)) o.onTypedDate?.(date);
		}
	}

	/** Commits typed text, on Enter or blur. */
	commit() {
		const o = this.options;
		if (this.pendingInput === null || o.isDisabled) return;
		if (!this.pendingInput.trim()) {
			o.onClear();
			this.reset();
			return;
		}
		const result = parseTypedDate(this.pendingInput, o);
		if (
			result.kind === 'unreadable' ||
			result.kind === 'incomplete' ||
			result.kind === 'nonexistent' ||
			result.kind === 'outOfRange'
		) {
			// Keep the text and show why it cannot commit; never finish or adjust the date.
			this.isRejectionCommitted = true;
			this.keptText = null;
			this.#isKeeping = true;
			try {
				this.reportEntryError(dateEntryError(result, true, this.pendingInput, o.min, o.max, o.entryErrorBehavior));
			} finally {
				// Effects that see the new value run before a timer does.
				setTimeout(() => (this.#isKeeping = false));
			}
			return;
		}
		if (result.kind === 'value') this.#report(plainDateToISO(result.date));
		// A new typing session reports a retyped date again.
		this.#lastFired = undefined;
		this.reset();
	}

	handleFocus() {
		this.isFocused = true;
	}

	handleBlur() {
		this.isFocused = false;
		this.commit();
	}

	/** The field leaves while a rejection stands: tell the caller it ended. */
	destroy() {
		if (this.#reported != null) {
			this.#reported = null;
			this.options.onEntryErrorChange?.(null);
		}
	}
}
