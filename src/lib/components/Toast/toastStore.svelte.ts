// Toast queue shared by showToast()/useToast() and ToastViewport.
// Port of the queue in Astryx ToastViewport/useToast (packages/core/src/Toast), MIT, Meta Platforms, Inc.
import { mount, type Snippet } from 'svelte';

export type ToastType = 'info' | 'error';
export type ToastPosition = 'topEnd' | 'topStart' | 'bottomEnd' | 'bottomStart';
export type ToastCollisionBehavior = 'overwrite' | 'ignore';
export type ToastDismissReason = 'auto' | 'manual';

export interface ToastOptions {
	body: string | Snippet;
	type?: ToastType;
	/** Defaults to true for info and false for error. */
	isAutoHide?: boolean;
	/** ms, default 5000. */
	autoHideDuration?: number;
	endContent?: Snippet;
	/** At most one visible toast per uniqueID. */
	uniqueID?: string;
	/** For a repeated uniqueID: replace the visible toast ("overwrite") or drop the new one ("ignore"). */
	collisionBehavior?: ToastCollisionBehavior;
	onHide?: (reason: ToastDismissReason) => void;
}
export type ToastDismissFn = () => void;
export type ShowToastFn = (options: ToastOptions) => ToastDismissFn;

export interface ToastEntry {
	id: string;
	options: ToastOptions;
	isExiting: boolean;
}

class ToastQueue {
	entries = $state<ToastEntry[]>([]);
	viewports = 0;
	#seq = 0;
	#fallbackMounted = false;

	add(options: ToastOptions): ToastDismissFn {
		this.#ensureViewport();
		const { uniqueID, collisionBehavior = 'overwrite' } = options;
		if (uniqueID) {
			const existing = this.entries.find((t) => t.options.uniqueID === uniqueID && !t.isExiting);
			if (existing) {
				if (collisionBehavior === 'ignore') return () => this.remove(existing.id, 'manual');
				existing.options = options;
				return () => this.remove(existing.id, 'manual');
			}
		}
		const id = `astryx-toast-${++this.#seq}`;
		this.entries.push({ id, options, isExiting: false });
		return () => this.remove(id, 'manual');
	}

	remove(id: string, reason: ToastDismissReason) {
		const entry = this.entries.find((t) => t.id === id);
		if (!entry || entry.isExiting) return;
		entry.isExiting = true;
		entry.options.onHide?.(reason);
		// Leave time for the exit transition, then unmount.
		setTimeout(() => this.drop(id), 300);
	}

	drop(id: string) {
		this.entries = this.entries.filter((t) => t.id !== id);
	}

	#ensureViewport() {
		if (this.viewports > 0 || this.#fallbackMounted || typeof document === 'undefined') return;
		this.#fallbackMounted = true;
		const target = document.createElement('div');
		target.setAttribute('data-astryx-toast-fallback', '');
		document.body.appendChild(target);
		// Lazy import keeps the viewport out of bundles that never show a toast.
		import('./ToastViewport.svelte').then(({ default: ToastViewport }) => mount(ToastViewport, { target }));
	}
}

export const toastQueue = new ToastQueue();

/** Show a toast. Returns a function that dismisses it. */
export const showToast: ShowToastFn = (options) => toastQueue.add(options);

/** Astryx-style hook name; returns `showToast`. */
export function useToast(): ShowToastFn {
	return showToast;
}
