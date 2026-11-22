// Tracks whether the last interaction was a keyboard or a pointer, like Astryx's interaction
// modality tracking, so focus rings can show for keyboard focus only.
let modality: 'keyboard' | 'pointer' = 'keyboard';
let installed = false;

function install() {
	if (installed || typeof document === 'undefined') return;
	installed = true;
	document.addEventListener('pointerdown', () => (modality = 'pointer'), true);
	document.addEventListener(
		'keydown',
		(e) => {
			if (!e.metaKey && !e.ctrlKey && !e.altKey) modality = 'keyboard';
		},
		true
	);
}
install();

/** The modality of the latest interaction; listeners install when this module loads. */
export function readModality(): 'keyboard' | 'pointer' {
	install();
	return modality;
}
