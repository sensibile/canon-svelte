<!--
  Port of Astryx `Banner` (packages/core/src/Banner/Banner.tsx), MIT, Meta Platforms, Inc.
  A status message with optional description, end content, dismiss button and collapsible body
  (`children`). With role="alert", the alert role goes on the message so only it is announced.
-->
<script lang="ts" module>
	export type BannerStatus = 'info' | 'warning' | 'error' | 'success';
	export interface CollapsibleConfig {
		isOpen?: boolean;
		defaultIsOpen?: boolean;
		onOpenChange?: (isOpen: boolean) => void;
	}
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLAttributes } from 'svelte/elements';
	import Button from '../Button/Button.svelte';
	import Icon from '../Icon/Icon.svelte';

	interface Props extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
		status: BannerStatus;
		title: string | Snippet;
		description?: string | Snippet;
		/** Replaces the default status icon. */
		icon?: Snippet;
		isDismissable?: boolean;
		onDismiss?: () => void;
		dismissLabel?: string;
		endContent?: Snippet;
		container?: 'card' | 'section';
		elevation?: 'none' | 'low' | 'med' | 'high';
		/** Body collapses behind a toggle (closed by default). false keeps it always shown. */
		collapsible?: boolean | CollapsibleConfig;
		children?: Snippet;
	}

	let {
		status,
		title,
		description,
		icon,
		isDismissable = false,
		onDismiss,
		dismissLabel,
		endContent,
		container = 'card',
		elevation = 'none',
		collapsible = true,
		children,
		class: className,
		role,
		...rest
	}: Props = $props();

	const config = $derived(typeof collapsible === 'object' ? collapsible : {});
	const isCollapsible = $derived(collapsible !== false);
	let internalOpen = $state(untrackDefault());
	function untrackDefault() {
		return typeof collapsible === 'object' ? (collapsible.defaultIsOpen ?? false) : false;
	}
	const isExpanded = $derived(config.isOpen ?? internalOpen);
	function toggle() {
		const next = !isExpanded;
		if (config.isOpen === undefined) internalOpen = next;
		config.onOpenChange?.(next);
	}

	let isDismissed = $state(false);
	let focusOrigin: HTMLElement | null = null;
	function remember(candidate: EventTarget | null, root: Node) {
		if (candidate instanceof HTMLElement && candidate !== document.body && !root.contains(candidate)) {
			focusOrigin = candidate;
		}
	}
	function dismiss() {
		const origin = focusOrigin;
		isDismissed = true;
		onDismiss?.();
		if (origin?.isConnected) origin.focus();
	}

	const contentId = $props.id();
	const hasChildren = $derived(children != null);
	const hasToggle = $derived(isCollapsible && hasChildren);
	const hasActions = $derived(endContent != null || isDismissable);
	const showEndArea = $derived(hasActions || hasToggle);
	const isSingleLine = $derived(description == null && hasActions);
	const showContent = $derived(hasChildren && (!isCollapsible || isExpanded));
	const isCard = $derived(container === 'card');
	const isAlert = $derived(role === 'alert');
	const dismissName = $derived(dismissLabel ?? (typeof title === 'string' ? `Dismiss ${title}` : 'Dismiss'));

	// With role="alert", aria-* props describe the alert message rather than the frame.
	const ariaProps = $derived(
		isAlert ? Object.fromEntries(Object.entries(rest).filter(([k]) => k.startsWith('aria-'))) : {}
	);
	const frameProps = $derived(
		isAlert ? Object.fromEntries(Object.entries(rest).filter(([k]) => !k.startsWith('aria-'))) : rest
	);
</script>

{#if !isDismissed}
	<div
		{...frameProps}
		role={isAlert ? undefined : role}
		class={['astryx-banner-frame', 'frame', className]}
		class:elevated-card={isCard && elevation !== 'none'}
		data-container={container}
		data-elevation={elevation}
		onfocuscapture={(e) => remember(e.relatedTarget, e.currentTarget)}
		onpointerdowncapture={(e) => remember(document.activeElement, e.currentTarget)}
	>
		<div
			class="astryx-banner header"
			class:centered={isSingleLine}
			class:card-standalone={isCard && !showContent}
			class:card-with-content={isCard && showContent}
			data-container={container}
			data-status={status}
		>
			{#if icon}
				<div class="astryx-banner-icon icon-wrapper" data-status={status} aria-hidden="true">{@render icon()}</div>
			{:else}
				<Icon icon={status} size="md" color="inherit" class="astryx-banner-icon icon" data-status={status} />
			{/if}
			<div
				{...ariaProps}
				role={isAlert ? 'alert' : undefined}
				class="astryx-banner-message message"
				class:with-end={endContent != null}
			>
				<div class="astryx-banner-title title">
					{#if typeof title === 'function'}{@render title()}{:else}{title}{/if}
				</div>
				{#if description != null}
					{' '}
					<div class="astryx-banner-description description">
						{#if typeof description === 'function'}{@render description()}{:else}{description}{/if}
					</div>
				{/if}
			</div>
			{#if showEndArea}
				<div class="end">
					{@render endContent?.()}
					{#if hasToggle}
						<Button
							variant="ghost"
							size="sm"
							label={isExpanded ? 'Collapse' : 'Expand'}
							tooltip={isExpanded ? 'Collapse' : 'Expand'}
							icon="chevronDown"
							isIconOnly
							class={['banner-control', 'banner-toggle', isExpanded && 'expanded']}
							aria-expanded={isExpanded}
							aria-controls={showContent ? contentId : undefined}
							onclick={toggle}
						/>
					{/if}
					{#if isDismissable}
						<Button
							variant="ghost"
							size="sm"
							label={dismissName}
							tooltip={dismissLabel ?? 'Dismiss'}
							icon="close"
							isIconOnly
							class="astryx-banner-close banner-control"
							onclick={dismiss}
						/>
					{/if}
				</div>
			{/if}
		</div>
		{#if showContent}
			<div
				id={hasToggle ? contentId : undefined}
				class="astryx-banner-content content"
				class:card={isCard}
				data-container={container}
				data-status={status}
			>
				{@render children?.()}
			</div>
		{/if}
	</div>
{/if}

<style>
	@layer astryx-base {
		.frame { display: flex; flex-direction: column; font-family: inherit; }
		.frame[data-elevation='low'] { box-shadow: var(--shadow-low); }
		.frame[data-elevation='med'] { box-shadow: var(--shadow-med); }
		.frame[data-elevation='high'] { box-shadow: var(--shadow-high); }
		.elevated-card { border-radius: var(--_banner-radius, var(--radius-container)); }

		.header {
			display: flex;
			align-items: flex-start;
			flex-wrap: wrap;
			column-gap: var(--spacing-2);
			row-gap: var(--spacing-3);
			padding-block: var(--spacing-3);
			padding-inline: var(--spacing-4);
		}
		.centered { align-items: center; }
		.card-standalone { border-radius: var(--_banner-radius, var(--radius-container)); }
		.card-with-content {
			border-start-start-radius: var(--_banner-radius, var(--radius-container));
			border-start-end-radius: var(--_banner-radius, var(--radius-container));
		}
		.header[data-status='info'] { background-color: var(--color-info-muted); color: var(--color-on-info-muted); }
		.header[data-status='warning'] { background-color: var(--color-warning-muted); color: var(--color-on-warning-muted); }
		.header[data-status='error'] { background-color: var(--color-error-muted); color: var(--color-on-error-muted); }
		.header[data-status='success'] { background-color: var(--color-success-muted); color: var(--color-on-success-muted); }
		@media (forced-colors: active) {
			.header { outline: 1px solid CanvasText; outline-offset: -1px; }
		}
		.header[data-status='info'] :global(.banner-control) { --color-text-primary: var(--color-on-info-muted); }
		.header[data-status='warning'] :global(.banner-control) { --color-text-primary: var(--color-on-warning-muted); }
		.header[data-status='error'] :global(.banner-control) { --color-text-primary: var(--color-on-error-muted); }
		.header[data-status='success'] :global(.banner-control) { --color-text-primary: var(--color-on-success-muted); }

		.icon-wrapper { display: flex; align-items: center; flex-shrink: 0; }
		.header :global(.icon) { flex-shrink: 0; }
		.message { display: flex; flex-direction: column; gap: 0; flex: 1; min-width: 0; }
		.with-end { flex-basis: 8rem; }
		.title {
			margin: 0;
			font-family: inherit;
			font-size: var(--text-label-size);
			font-weight: var(--font-weight-semibold);
			line-height: var(--text-label-leading);
			color: inherit;
			overflow-wrap: anywhere;
			--_astryx-text-overflow-wrap: anywhere;
		}
		.description {
			margin: 0;
			font-family: inherit;
			font-size: var(--text-supporting-size);
			font-weight: var(--font-weight-normal);
			line-height: var(--text-supporting-leading);
			color: inherit;
			overflow-wrap: anywhere;
			--_astryx-text-overflow-wrap: anywhere;
		}
		.end {
			display: flex;
			align-items: center;
			flex-wrap: wrap;
			justify-content: flex-end;
			gap: var(--spacing-2);
			flex-shrink: 0;
			color: var(--color-text-primary);
			max-width: 100%;
			margin-inline-start: auto;
			margin-block: calc(-1 * (var(--spacing-3) - var(--spacing-2)));
			margin-inline-end: calc(-1 * var(--spacing-2));
		}
		.end :global(.banner-toggle svg) {
			transition: transform var(--duration-fast) var(--ease-standard);
		}
		.end :global(.banner-toggle.expanded svg) { transform: rotate(180deg); }
		@media (prefers-reduced-motion: reduce) {
			.end :global(.banner-toggle svg) { transition-duration: 0s; }
		}
		.content {
			background-color: var(--color-background-card);
			padding-block: var(--spacing-3);
			padding-inline: var(--spacing-4);
			border: var(--border-width) solid var(--color-border);
			border-block-start: none;
		}
		.content.card {
			border-end-start-radius: var(--_banner-radius, var(--radius-container));
			border-end-end-radius: var(--_banner-radius, var(--radius-container));
		}
	}
</style>
