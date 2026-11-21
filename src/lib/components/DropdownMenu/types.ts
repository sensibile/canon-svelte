import type { IconComponent } from '../Icon/Icon.svelte';
import type { IconName } from '../Icon/defaultIcons.js';

export interface DropdownMenuItemData {
	id?: string;
	label: string;
	description?: string;
	icon?: IconName | IconComponent;
	onClick?: (e: MouseEvent) => void;
	href?: string;
	target?: '_blank' | '_self';
	rel?: string;
	isDisabled?: boolean;
	variant?: 'default' | 'destructive';
	/** Close the menu after this item is chosen. Default true. */
	hasCloseOnSelect?: boolean;
}
export interface DropdownMenuDividerData {
	type: 'divider';
}
export interface DropdownMenuSection {
	type: 'section';
	id?: string;
	title?: string;
	items: DropdownMenuItemData[];
}
export type DropdownMenuOption = DropdownMenuItemData | DropdownMenuDividerData | DropdownMenuSection;
