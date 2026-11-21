// Contexts shared by Avatar, AvatarStatusDot and AvatarGroup. Port of Astryx Avatar/AvatarGroup contexts, MIT.
import { getContext, setContext } from 'svelte';

export type AvatarNamedSize = 'xsm' | 'sm' | 'md' | 'lg' | 'xl';
export type AvatarNumericSize = 16 | 20 | 24 | 32 | 36 | 40 | 48 | 60 | 64 | 72 | 96 | 128 | 144 | 180;
export type AvatarSize = AvatarNamedSize | AvatarNumericSize;
export type AvatarShape = 'circle' | 'rounded' | 'square';

export function resolveAvatarSize(size: AvatarSize): number {
	if (typeof size === 'number') return size;
	return { xsm: 20, sm: 24, md: 36, lg: 48, xl: 128 }[size];
}

/** Set by Avatar for its status slot: the avatar's pixel size and a way to report the status label. */
export interface AvatarSlotContext {
	readonly size: number;
	setStatusLabel(label: string | undefined): void;
}
const SLOT = Symbol('astryx-avatar');
export const setAvatarSlotContext = (ctx: AvatarSlotContext) => setContext(SLOT, ctx);
export const getAvatarSlotContext = () => getContext<AvatarSlotContext | undefined>(SLOT);

export interface AvatarGroupContext {
	readonly size: AvatarSize;
	readonly shape: AvatarShape;
	readonly overlap: number;
	readonly numericSize: number;
}
const GROUP = Symbol('astryx-avatar-group');
export const setAvatarGroupContext = (ctx: AvatarGroupContext) => setContext(GROUP, ctx);
export const getAvatarGroupContext = () => getContext<AvatarGroupContext | undefined>(GROUP);
