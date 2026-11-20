// Svelte port of Astryx (https://github.com/meta/astryx), MIT.
export * from './theme/index.js';
export * from './types.js';

export { default as Badge, type BadgeVariant } from './components/Badge/Badge.svelte';
export {
	default as Button,
	type ButtonSize,
	type ButtonVariant,
	type Elevation
} from './components/Button/Button.svelte';
export {
	default as CheckboxInput,
	type CheckboxInputSize,
	type CheckboxValue
} from './components/CheckboxInput/CheckboxInput.svelte';
export { default as Divider } from './components/Divider/Divider.svelte';
export { default as Field } from './components/Field/Field.svelte';
export { default as FieldLabel } from './components/Field/FieldLabel.svelte';
export { default as FieldStatus } from './components/Field/FieldStatus.svelte';
export type {
	FieldStatusInput,
	FieldStatusPlacement,
	FieldStatusType
} from './components/Field/types.js';
export { default as Heading, type HeadingLevel, type HeadingType } from './components/Heading/Heading.svelte';
export {
	default as Icon,
	type IconColor,
	type IconComponent,
	type IconSize
} from './components/Icon/Icon.svelte';
export { defaultIcons, type IconName } from './components/Icon/defaultIcons.js';
export { default as IconButton } from './components/IconButton/IconButton.svelte';
export { default as Link } from './components/Link/Link.svelte';
export { default as Spinner, type SpinnerShade, type SpinnerSize } from './components/Spinner/Spinner.svelte';
export {
	default as Stack,
	type StackAlignment,
	type StackCrossAlignment,
	type StackDirection,
	type StackMainAlignment,
	type StackWrap
} from './components/Stack/Stack.svelte';
export { default as HStack } from './components/Stack/HStack.svelte';
export { default as VStack } from './components/Stack/VStack.svelte';
export {
	default as Switch,
	type SwitchLabelPosition,
	type SwitchLabelSpacing,
	type SwitchSize
} from './components/Switch/Switch.svelte';
export { default as Text } from './components/Text/Text.svelte';
export {
	default as TextInput,
	type TextInputSize,
	type TextInputType
} from './components/TextInput/TextInput.svelte';
export { default as VisuallyHidden } from './components/VisuallyHidden/VisuallyHidden.svelte';
