// Toast queue shared by showToast()/useToast() and ToastViewport.
// Port of the queue in Astryx ToastViewport/useToast (packages/core/src/Toast), MIT, Meta Platforms, Inc.
import { mount, unmount, type Snippet } from 'svelte';

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
	/** Explicitly rendered viewports; the auto-mounted fallback doesn't count. */
	viewports = 0;
	#seq = 0;
	#fallback: { target: HTMLElement; app?: Record<string, unknown> } | null = null;

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

	/** Called by an explicit ToastViewport; it takes over from the fallback. */
	attachViewport(): () => void {
		this.viewports += 1;
		this.#retireFallback();
		return () => {
			this.viewports -= 1;
		};
	}

	#ensureViewport() {
		if (this.viewports > 0 || this.#fallback || typeof document === 'undefined') return;
		const target = document.createElement('div');
		target.setAttribute('data-astryx-toast-fallback', '');
		document.body.appendChild(target);
		const fallback: { target: HTMLElement; app?: Record<string, unknown> } = { target };
		this.#fallback = fallback;
		// Lazy import keeps the viewport out of bundles that never show a toast.
		import('./ToastViewport.svelte').then(({ default: ToastViewport }) => {
			// Retired while the import was pending (an explicit viewport mounted).
			if (this.#fallback !== fallback) return;
			fallback.app = mount(ToastViewport, { target, props: { isFallback: true } });
		});
	}

	#retireFallback() {
		const fallback = this.#fallback;
		if (!fallback) return;
		this.#fallback = null;
		if (fallback.app) unmount(fallback.app);
		fallback.target.remove();
	}
}

export const toastQueue = new ToastQueue();

/** Show a toast. Returns a function that dismisses it. */
export const showToast: ShowToastFn = (options) => toastQueue.add(options);

/** Astryx-style hook name; returns `showToast`. */
export function useToast(): ShowToastFn {
	return showToast;
}
