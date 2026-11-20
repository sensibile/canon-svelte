// Reference-counted page scroll lock shared by every open modal.
let count = 0;
let saved = '';

/** Lock page scroll; returns the release function. The original overflow comes back when the last lock is released. */
export function lockScroll(doc: Document = document): () => void {
	const root = doc.documentElement;
	if (count === 0) {
		saved = root.style.overflow;
		root.style.overflow = 'hidden';
	}
	count += 1;
	let released = false;
	return () => {
		if (released) return;
		released = true;
		count -= 1;
		if (count === 0) root.style.overflow = saved;
	};
}
