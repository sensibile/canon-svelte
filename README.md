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

`mode` is `"light"`, `"dark"` or `"system"`. The outermost `Theme` also sets `data-astryx-theme`
and `data-theme` on `<html>` so portaled content and browser chrome follow it.

## Components

Ported so far (props follow Astryx; see each file's header for what isn't ported yet):

- Content: `Text`, `Heading`, `Icon`, `Badge`, `Spinner`, `VisuallyHidden`
- Action: `Button`, `IconButton`, `Link`
- Layout: `Stack`, `HStack`, `VStack`, `Divider`
- Form: `Field`, `FieldLabel`, `FieldStatus`, `TextInput`, `CheckboxInput`, `Switch`

Form controls support `bind:value` as well as Astryx's `value` + `onChange(value, event)`.
Component styles live in `@layer astryx-base` and keep Astryx's `astryx-*` class names and `data-*`
attributes, so theme CSS (`@layer astryx-theme`) overrides them the same way it does in Astryx.

## Develop

```sh
pnpm install
pnpm dev          # docs site at localhost:5173 (tokens and component gallery)
pnpm check        # svelte-check
pnpm build        # docs build + package to dist/
pnpm sync:astryx  # re-pull reset/tokens/neutral theme CSS from the Astryx npm packages
```

## What comes from Astryx

- `src/lib/styles/reset.css`, `src/lib/themes/neutral/*`: copied verbatim from
  `@astryxdesign/core` and `@astryxdesign/theme-neutral` (currently 0.7.17).
- `src/lib/styles/tokens.css`: default token values extracted from `@astryxdesign/core/dist/astryx.css`.
- Components: re-implemented in Svelte, ported from the React sources.

See [LICENSE](./LICENSE) for attribution.
