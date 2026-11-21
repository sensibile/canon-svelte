# canon-svelte

A Svelte 5 port of the [Astryx](https://astryx.atmeta.com) design system
([source](https://github.com/meta/astryx), MIT). Component names, props and visuals follow Astryx;
styles are written as Svelte scoped CSS on top of Astryx's CSS custom-property tokens instead of StyleX.

## Use

```svelte
<script>
	import 'canon-svelte/astryx.css'; // reset + default tokens
	import 'canon-svelte/themes/neutral.css'; // theme tokens + Figtree font
	import { Theme } from 'canon-svelte';
</script>

<Theme theme="neutral" mode="system">
	<!-- your app -->
</Theme>
```

Themes: `neutral`, `butter`, `chocolate`, `matcha`, `stone`, `gothic`, `y2k`. Import each theme you
use (`canon-svelte/themes/<name>.css`, which brings its fonts) and pass its name to `Theme`. Themes
can be nested; a nested `Theme` applies to its subtree only. Theme icon sets are not ported yet.

`mode` is `"light"`, `"dark"` or `"system"`. The outermost `Theme` also sets `data-astryx-theme`
and `data-theme` on `<html>` so portaled content and browser chrome follow it.

## Components

Ported so far (props follow Astryx; see each file's header for what isn't ported yet):

- Content: `Text`, `Heading`, `Icon`, `Badge`, `Spinner`, `VisuallyHidden`, `Avatar` (`AvatarStatusDot`),
  `AvatarGroup` (`AvatarGroupOverflow`), `Banner`, `Blockquote`, `Code`, `EmptyState`, `Kbd`,
  `MetadataList` (`MetadataListItem`), `ProgressBar`, `Skeleton`, `StatusDot`, `Thumbnail`, `Timestamp`, `Token`
- Action: `Button`, `IconButton`, `Link`, `ClickableCard`
- Layout: `Stack`, `HStack`, `VStack`, `Divider`, `AspectRatio`, `Card`, `Center`, `Collapsible`
  (`CollapsibleGroup`), `Grid` (`GridSpan`), `Section`
- Form: `Field`, `FieldLabel`, `FieldStatus`, `TextInput`, `TextArea`, `NumberInput`, `CheckboxInput`, `Switch`,
  `RadioList` (`RadioListItem`), `CheckboxList` (`CheckboxListItem`), `InputGroup` (`InputGroupText`),
  `FileInput`, `Slider`, `Item`, `CheckboxIndicator`, `RadioIndicator`, `Selector`, `MultiSelector`,
  `Typeahead` (`TypeaheadItem`, `createStaticSource`), `Tokenizer`
- Overlay: `Tooltip`, `InfoTip`, `Popover`, `Dialog`, `DialogHeader`, `DropdownMenu`
  (`DropdownMenuItem`, `DropdownMenuGroup`, `DropdownMenuDivider`), `Toast` (`showToast`, `ToastViewport`)
- Navigation: `TabList`, `Tab`

Anchored overlays render in the browser top layer (the `popover` attribute) and are positioned with
`@floating-ui/dom`. `Dialog` is a native `<dialog>`. Call `showToast({ body })` anywhere; mount a
`ToastViewport` near the app root to choose the corner, or one is mounted on first use.

Form controls support `bind:value` as well as Astryx's `value` + `onChange(value, event)`.
Component styles live in `@layer astryx-base` and keep Astryx's `astryx-*` class names and `data-*`
attributes, so theme CSS (`@layer astryx-theme`) overrides them the same way it does in Astryx.

## Develop

```sh
pnpm install
pnpm dev          # docs site at localhost:5173 (tokens and component gallery)
pnpm check        # svelte-check
pnpm build        # docs build + package to dist/
pnpm sync:astryx  # re-pull reset, tokens and all theme CSS from the Astryx npm packages
```

## What comes from Astryx

- `src/lib/styles/reset.css`, `src/lib/themes/<name>/*`: copied verbatim from
  `@astryxdesign/core` and `@astryxdesign/theme-<name>` (currently 0.7.17), fonts and their
  licenses included.
- `src/lib/styles/tokens.css`: default token values extracted from `@astryxdesign/core/dist/astryx.css`.
- Components: re-implemented in Svelte, ported from the React sources.

See [LICENSE](./LICENSE) for attribution.
