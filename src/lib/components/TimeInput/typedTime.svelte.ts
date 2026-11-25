// Port of Astryx TimeInput/useTypedTime.ts and Field/useEntryErrorReport.ts, MIT, Meta Platforms,
// Inc. The typed draft of a time field and its rejection, shared by TimeInput and DateTimeInput.
// A rejection shows at Enter or blur, or under 'complete' once the draft is complete, and stays
// through edits that leave the draft rejected or unfinished. The hook becomes a class whose
// options are read through a getter. A native time control reports its own rejection through
// `surfaceRejection`.
import type { FieldStatusInput } from '../Field/types.js';
import type { EntryErrorBehavior } from '../DateInput/typedDate.svelte.js';
import { isTimeInRange, type ISOTimeString } from '../../internal/date/timeParser.js';
import { isLocaleTimeComplete, parseLocaleTime, type HourFormat } from '../../internal/date/timeFormat.js';

/** Why a time field rejects typed text, as `onEntryErrorChange` reports it. */
export interface TimeInputEntryError {
	/** `'unreadable'`: text that is not a time. `'outOfRange'`: a time before `min` or after `max`. */
	kind: 'unreadable' | 'outOfRange';
	/** The typed text. */
	text: string;
	/** The ISO time the text names, for `outOfRange`. */
	value?: ISOTimeString;
}

interface Draft {
	time: ISOTimeString | null;
	rejection: TimeInputEntryError | null;
	/** Under 'complete', a complete rejected time shows its rejection while the person types. */
	isComplete: boolean;
}

const EMPTY_DRAFT: Draft = { time: null, rejection: null, isComplete: false };

export function isSameTimeEntryError(a: TimeInputEntryError | null, b: TimeInputEntryError | null): boolean {
	return a === b || (a != null && b != null && a.kind === b.kind && a.text === b.text && a.value === b.value);
}

export interface TypedTimeOptions {
	/** The committed time. A change from outside drops the draft. */
	value: ISOTimeString | undefined;
	locale: string;
	hourFormat: HourFormat;
	hasSeconds: boolean;
	min: ISOTimeString | undefined;
	max: ISOTimeString | undefined;
	/** Becoming disabled drops the draft; while disabled, typing and commits do nothing. */
	isDisabled: boolean;
	/** A disabled or busy field hides its rejection and reports null. */
	isLocked: boolean;
	errorMessage: string;
	/** Whether a Field around the input announces the status (false inside an InputGroup). */
	isStatusAnnounced: boolean;
	status?: FieldStatusInput;
	onEntryErrorChange?: (error: TimeInputEntryError | null) => void;
	entryErrorBehavior: EntryErrorBehavior;
}

export class TypedTimeField {
	/** Typed text, or null when the field shows the committed value. */
	pendingInput = $state<string | null>(null);
	/** How the draft was last committed. After blur, a hidden input carries the name until the next edit. */
	committedBy = $state<'enter' | 'blur' | null>(null);
	/** The rejection last revealed; an edit that leaves the draft rejected keeps it. */
	keptRejection = $state<TimeInputEntryError | null>(null);
	/** A native control's edit outside `min` or `max`: it shows at once, until an accepted edit or a new value. */
	surfaceRejection = $state<TimeInputEntryError | null>(null);
	/** The time typing last committed, so its echo through `value` keeps the draft. */
	#lastCommitted: { time: ISOTimeString | undefined } | null = null;
	#reported: TimeInputEntryError | null = null;
	/** Set while a commit that keeps a rejected draft runs, so a value it brings keeps the draft. */
	#isKeeping = false;
	#o: () => TypedTimeOptions;

	constructor(options: () => TypedTimeOptions) {
		this.#o = options;
	}

	get options() {
		return this.#o();
	}

	readDraft(text: string): Draft {
		if (!text.trim()) return EMPTY_DRAFT;
		const { locale, hasSeconds, min, max, hourFormat } = this.options;
		const time = parseLocaleTime(text, locale, hasSeconds);
		// Complete text that names no time, such as "25:00", shows its rejection under 'complete' too.
		if (time == null) {
			return {
				time: null,
				rejection: { kind: 'unreadable', text },
				isComplete: isLocaleTimeComplete(text, locale, hourFormat, hasSeconds)
			};
		}
		if (!isTimeInRange(time, min, max)) {
			return {
				time: null,
				rejection: { kind: 'outOfRange', text, value: time },
				isComplete: isLocaleTimeComplete(text, locale, hourFormat, hasSeconds)
			};
		}
		return { time, rejection: null, isComplete: true };
	}

	#revealsComplete = $derived(this.options.entryErrorBehavior === 'complete');
	draft = $derived(this.pendingInput !== null ? this.readDraft(this.pendingInput) : EMPTY_DRAFT);
	#freshRejection = $derived(
		this.draft.rejection != null && (this.committedBy != null || (this.#revealsComplete && this.draft.isComplete))
			? this.draft.rejection
			: null
	);
	/** The rejection the field shows. A locked field hides it but keeps its state. */
	entryError = $derived(
		this.options.isLocked
			? null
			: (this.surfaceRejection ??
					(this.draft.rejection == null ? null : (this.#freshRejection ?? this.keptRejection)))
	);
	/** A rejection shows: it sets `aria-invalid`. */
	isRejected = $derived(this.entryError != null);

	/** A caller error with a message always shows in place of the field's own message. */
	#callerErrorMessage = $derived.by(() => {
		const { status } = this.options;
		return status?.type === 'error' && status.message ? status.message : null;
	});

	fieldStatus: FieldStatusInput | undefined = $derived.by(() =>
		!this.isRejected || this.#callerErrorMessage != null
			? this.options.status
			: { type: 'error', message: this.options.errorMessage }
	);

	/** The rejection message that the field status does not announce. */
	alertMessage = $derived.by(() => {
		if (!this.isRejected) return '';
		const { isStatusAnnounced, errorMessage, onEntryErrorChange } = this.options;
		const callerMessage = this.#callerErrorMessage;
		if (callerMessage == null) return isStatusAnnounced ? '' : errorMessage;
		// A caller that words the rejection: its status already shows; announce it where no Field does.
		if (onEntryErrorChange != null) return isStatusAnnounced ? '' : callerMessage;
		return errorMessage;
	});

	/** Blur kept a rejected draft: a hidden input posts the committed time. */
	isNameOnHiddenInput = $derived(this.committedBy === 'blur' && this.pendingInput !== null);

	reportEntryError(error: TimeInputEntryError | null) {
		const { onEntryErrorChange } = this.options;
		if (onEntryErrorChange == null || isSameTimeEntryError(error, this.#reported)) return;
		this.#reported = error;
		onEntryErrorChange(error);
	}

	/** Keeps the caller's entry error in step with a rejection a prop change starts or ends. */
	syncEntryError() {
		this.reportEntryError(this.entryError);
	}

	#reportIfEditable(error: TimeInputEntryError | null) {
		if (!this.options.isLocked) this.reportEntryError(error);
	}

	#drop() {
		this.pendingInput = null;
		this.committedBy = null;
		this.keptRejection = null;
	}

	/** A value from outside drops the draft; the echo of a time typing committed keeps it. */
	valueChanged(value: ISOTimeString | undefined) {
		if (this.#isKeeping) return;
		if (this.#lastCommitted !== null && value === this.#lastCommitted.time) return;
		this.#lastCommitted = null;
		this.surfaceRejection = null;
		if (this.pendingInput !== null) this.#drop();
	}

	/** Becoming disabled drops the draft. */
	disabled() {
		if (this.pendingInput !== null) this.#drop();
	}

	/** Drops the draft, as a picked or stepped time does. */
	reset() {
		this.#drop();
		this.reportEntryError(null);
	}

	/** Reads typed text. Returns the time to commit, or null for none. */
	handleChange(text: string): ISOTimeString | null {
		const o = this.options;
		if (o.isDisabled) return null;
		const shownBefore = this.entryError;
		const next = this.readDraft(text);
		const isFresh = next.rejection != null && this.#revealsComplete && next.isComplete;
		this.pendingInput = text;
		this.committedBy = null;
		this.keptRejection = next.rejection == null ? null : isFresh ? next.rejection : (shownBefore ?? this.keptRejection);
		if (next.rejection == null || isFresh) this.#reportIfEditable(next.rejection);
		// Unfinished text such as "2:3" reads as a time already: report it only once it is complete.
		if (next.time == null || next.time === o.value || !isLocaleTimeComplete(text, o.locale, o.hourFormat, o.hasSeconds)) {
			return null;
		}
		this.#lastCommitted = { time: next.time };
		return next.time;
	}

	/**
	 * Commits the draft on Enter or blur. Returns the time to commit: undefined for emptied text,
	 * null for none. A rejected draft stays in the field.
	 */
	commit(trigger: 'enter' | 'blur'): ISOTimeString | undefined | null {
		const o = this.options;
		if (this.pendingInput === null || o.isDisabled) return null;
		const current = this.readDraft(this.pendingInput);
		if (current.rejection != null) {
			// Keep the text and show why it cannot commit.
			if (this.committedBy !== 'blur') this.committedBy = trigger;
			this.keptRejection = current.rejection;
			this.#isKeeping = true;
			// Effects that see a new value run before a timer does.
			setTimeout(() => (this.#isKeeping = false));
			this.#reportIfEditable(current.rejection);
			return null;
		}
		if (trigger === 'blur') this.reset();
		const time = current.time ?? undefined;
		if (time === o.value) return null;
		this.#lastCommitted = { time };
		return time;
	}

	/** The field leaves while a rejection stands: tell the caller it ended. */
	destroy() {
		if (this.#reported != null) {
			this.#reported = null;
			this.options.onEntryErrorChange?.(null);
		}
	}
}
