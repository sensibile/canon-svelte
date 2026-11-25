<!--
  Port of Astryx `MonthYearWheels` (packages/core/src/DateInput/MonthYearWheels.tsx), MIT, Meta Platforms, Inc.
  A month wheel and a year wheel for jumping the bottom-sheet calendar. Months outside the bounds
  are disabled; a year that lands outside them clamps to the nearest month inside.
  Port change: Gregorian only, so a year never spans eras.
-->
<script lang="ts">
	import Wheel from './Wheel.svelte';
	import type { WheelOption } from './wheelOptions.js';
	import { clampIndex, fromMonthIndex, toMonthIndex } from './monthGeometry.js';

	interface Props {
		monthIndex: number;
		minMonthIndex: number;
		maxMonthIndex: number;
		onChange: (monthIndex: number) => void;
		locale: string;
		isActive?: boolean;
	}

	let { monthIndex, minMonthIndex, maxMonthIndex, onChange, locale, isActive = true }: Props = $props();

	const current = $derived(fromMonthIndex(monthIndex));
	const monthFormat = $derived(new Intl.DateTimeFormat(locale, { month: 'long', timeZone: 'UTC' }));
	const monthOptions: WheelOption[] = $derived(
		Array.from({ length: 12 }, (_, i) => {
			const candidate = toMonthIndex(current.year, i + 1);
			return {
				value: i + 1,
				label: monthFormat.format(new Date(Date.UTC(2000, i, 1))),
				isDisabled: candidate < minMonthIndex || candidate > maxMonthIndex
			};
		})
	);
	const yearOptions: WheelOption[] = $derived.by(() => {
		const first = fromMonthIndex(minMonthIndex).year;
		const last = fromMonthIndex(maxMonthIndex).year;
		const years: WheelOption[] = [];
		for (let year = first; year <= last; year++) years.push({ value: year, label: String(year) });
		return years;
	});
</script>

<div class="astryx-month-year-wheels wheels">
	<Wheel
		label="Month"
		options={monthOptions}
		value={current.month}
		{isActive}
		onChange={(month) => onChange(toMonthIndex(current.year, month))}
	/>
	<Wheel
		label="Year"
		options={yearOptions}
		value={current.year}
		{isActive}
		onChange={(year) => onChange(clampIndex(monthIndex + (year - current.year) * 12, minMonthIndex, maxMonthIndex))}
	/>
</div>

<style>
	@layer astryx-base {
		.wheels {
			display: flex;
			block-size: calc(6 * 44px);
			gap: var(--spacing-2);
		}
	}
</style>
