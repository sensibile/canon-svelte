import { getContext, setContext } from 'svelte';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemeState {
	readonly name: string;
	readonly mode: ThemeMode;
}

const KEY = Symbol('astryx-theme');

export function setThemeContext(state: ThemeState) {
	setContext(KEY, state);
}

/** The nearest Theme's name and mode, or undefined outside any Theme. */
export function getTheme(): ThemeState | undefined {
	return getContext<ThemeState | undefined>(KEY);
}
