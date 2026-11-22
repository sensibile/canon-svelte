// Port of Astryx `generatePageRange` (packages/core/src/Pagination/Pagination.tsx), MIT, Meta Platforms, Inc.

/** The page numbers to show around `currentPage`, with '...' where pages are skipped. */
export function generatePageRange(currentPage: number, totalPages: number, siblingCount: number): (number | '...')[] {
	const totalSlots = 5 + 2 * siblingCount;
	if (totalPages <= totalSlots) return Array.from({ length: totalPages }, (_, i) => i + 1);
	const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
	const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);
	const showLeftEllipsis = leftSiblingIndex > 2;
	const showRightEllipsis = rightSiblingIndex < totalPages - 1;
	if (!showLeftEllipsis && showRightEllipsis) {
		const leftRange = 3 + 2 * siblingCount;
		const pages: (number | '...')[] = Array.from({ length: leftRange }, (_, i) => i + 1);
		pages.push('...', totalPages);
		return pages;
	}
	if (showLeftEllipsis && !showRightEllipsis) {
		const rightRange = 3 + 2 * siblingCount;
		const pages: (number | '...')[] = [1, '...'];
		for (let i = totalPages - rightRange + 1; i <= totalPages; i++) pages.push(i);
		return pages;
	}
	const pages: (number | '...')[] = [1, '...'];
	for (let i = leftSiblingIndex; i <= rightSiblingIndex; i++) pages.push(i);
	pages.push('...', totalPages);
	return pages;
}
