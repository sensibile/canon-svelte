<!--
  Port of Astryx `Overlay` and `OverlayScrim` (packages/core/src/Overlay), MIT, Meta Platforms, Inc.
  Lays `content` over its children (an image, a card), on a dark or light scrim that gives the
  content a matching media theme. `showOn` reveals it always, on hover, on focus inside, or both;
  `isOpen` controls it instead (a closed overlay is inert). `position` fills the area or slides in a
  bar from the bottom or top; `align` places the content. On devices without hover, a tap that
  doesn't land on a control toggles a hover overlay. The container takes its first child's radius.
  Not yet ported: the useOverlay hook, and the media theme's dark-page attribute.
-->
<script lang="ts" module>
	export type OverlayScrimMode = 'dark' | 'light' | false;
	export type OverlayPosition = 'fill' | 'bottom' | 'top';
	export type OverlayAlign = 'start' | 'center' | 'end';
	export type OverlayShowOn = 'hover' | 'always' | 'focus' | 'hover-or-focus';
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';

	interface Props extends HTMLAttributes<HTMLDivElement> {
		/** What the overlay lays over. */
		children?: Snippet;
		/** The overlay's content. */
		content: Snippet;
		showOn?: OverlayShowOn;
		/** Controlled visibility; overrides `showOn`. */
		isOpen?: boolean;
		scrim?: OverlayScrimMode;
		position?: OverlayPosition;
		align?: OverlayAlign;
	}

	let {
		children,
		content,
		showOn = 'always',
		isOpen,
		scrim = 'dark',
		position = 'fill',
		align = 'end',
		class: className,
		onclick,
		...rest
	}: Props = $props();

	let container: HTMLDivElement | undefined = $state();

	let isTouchDevice = $state(false);
	$effect(() => {
		const query = window.matchMedia('(hover: none)');
		isTouchDevice = query.matches;
		const onChange = () => (isTouchDevice = query.matches);
		query.addEventListener('change', onChange);
		return () => query.removeEventListener('change', onChange);
	});
	let touchOpen = $state(false);
	const needsTouchToggle = $derived(isTouchDevice && (showOn === 'hover' || showOn === 'hover-or-focus'));
	const effectiveIsOpen = $derived(isOpen !== undefined ? isOpen : needsTouchToggle ? touchOpen : undefined);
	const isControlled = $derived(effectiveIsOpen !== undefined);
	const reveal = $derived(
		isControlled ? (effectiveIsOpen ? 'visible' : 'hidden') : showOn === 'always' ? 'visible' : showOn === 'focus' ? 'focus' : 'hover'
	);

	// Take the first child's corner radius so the scrim follows rounded media.
	$effect(() => {
		const el = container;
		const first = el?.firstElementChild as HTMLElement | null;
		if (!el || !first) return;
		const radius = getComputedStyle(first).borderRadius;
		if (radius && radius !== '0px') el.style.borderRadius = radius;
	});

	const INTERACTIVE = 'a[href],button,input,select,textarea,summary,label,[role=button],[role=link],[tabindex]:not([tabindex="-1"]),[contenteditable]:not([contenteditable="false"])';
	function handleClick(e: MouseEvent & { currentTarget: EventTarget & HTMLDivElement }) {
		if (needsTouchToggle && !e.defaultPrevented) {
			const target = e.target as Element | null;
			const control = target?.closest(INTERACTIVE);
			// A tap on a control inside runs that control instead.
			if (control == null || !e.currentTarget.contains(control) || control === e.currentTarget) touchOpen = !touchOpen;
		}
		onclick?.(e);
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
<div {...rest} bind:this={container} class={['astryx-overlay', 'overlay', className]} onclick={handleClick}>
	{@render children?.()}
	<div
		class="astryx-overlay-scrim scrim"
		data-position={position}
		data-align={align}
		data-scrim={scrim || undefined}
		data-reveal={reveal}
		inert={isControlled && !effectiveIsOpen ? true : undefined}
	>
		{#if scrim}
			<div class="media" data-astryx-media={scrim}>{@render content()}</div>
		{:else}
			{@render content()}
		{/if}
	</div>
</div>

<style>
	@layer astryx-base {
		.overlay { position: relative; overflow: clip; }
		.scrim {
			position: absolute;
			display: flex;
			flex-direction: column;
			gap: var(--spacing-2);
			padding: var(--spacing-3);
			pointer-events: none;
			transition-property: opacity, visibility, transform;
			transition-duration: var(--duration-fast);
			transition-timing-function: var(--ease-standard);
		}
		@media (prefers-reduced-motion: reduce) {
			.scrim { transition-duration: 0s; }
		}
		.scrim[data-position='fill'] { inset: 0; }
		.scrim[data-position='bottom'] { inset-inline: 0; bottom: 0; }
		.scrim[data-position='top'] { inset-inline: 0; top: 0; }
		.scrim[data-align='start'] { align-items: flex-start; justify-content: flex-start; }
		.scrim[data-align='center'] { align-items: center; justify-content: center; }
		.scrim[data-align='end'] { align-items: flex-end; justify-content: flex-start; }
		.scrim[data-scrim='dark'] { background-color: var(--color-overlay); }
		.scrim[data-scrim='light'] { background-color: color-mix(in srgb, white 60%, transparent); }
		.media { display: contents; color: var(--color-text-primary); }

		.scrim[data-reveal='hidden'] { opacity: 0; visibility: hidden; }
		.scrim[data-reveal='hidden'][data-position='bottom'] { transform: translateY(100%); }
		.scrim[data-reveal='hidden'][data-position='top'] { transform: translateY(-100%); }
		.scrim[data-reveal='visible'] {
			opacity: 1;
			visibility: visible;
			pointer-events: auto;
			transform: translateY(0);
		}

		.scrim[data-reveal='hover'],
		.scrim[data-reveal='focus'] { opacity: 0; visibility: hidden; pointer-events: none; }
		.scrim[data-reveal='hover'][data-position='bottom'],
		.scrim[data-reveal='focus'][data-position='bottom'] { transform: translateY(100%); }
		.scrim[data-reveal='hover'][data-position='top'],
		.scrim[data-reveal='focus'][data-position='top'] { transform: translateY(-100%); }
		.overlay:focus-within > .scrim[data-reveal='hover'],
		.overlay:focus-within > .scrim[data-reveal='focus'] {
			opacity: 1;
			visibility: visible;
			pointer-events: auto;
			transform: translateY(0);
		}
		@media (hover: hover) {
			.overlay:hover > .scrim[data-reveal='hover'] {
				opacity: 1;
				visibility: visible;
				pointer-events: auto;
				transform: translateY(0);
			}
		}

		@starting-style {
			.scrim[data-reveal='visible'] { opacity: 0; }
			.scrim[data-reveal='visible'][data-position='bottom'] { transform: translateY(100%); }
			.scrim[data-reveal='visible'][data-position='top'] { transform: translateY(-100%); }
		}
	}
</style>
