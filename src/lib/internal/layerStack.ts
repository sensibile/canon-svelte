// Open dismissable layers, innermost last, so only the topmost one reacts to Escape.
const stack: symbol[] = [];

export function pushLayer(): { isTop: () => boolean; remove: () => void } {
	const id = Symbol('layer');
	stack.push(id);
	return {
		isTop: () => stack[stack.length - 1] === id,
		remove: () => {
			const i = stack.indexOf(id);
			if (i >= 0) stack.splice(i, 1);
		}
	};
}
