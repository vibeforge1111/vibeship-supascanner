/**
 * Results Store - Session-only storage for breach test results
 * SECURITY: Results are NOT persisted to localStorage or any storage
 * They only exist in memory for the current browser session
 */

import type { BreachReport } from '$lib/types/attacks';

// In-memory only - no persistence
let results = $state<BreachReport[]>([]);

/**
 * Add a new breach report (session only)
 */
export function addResult(report: BreachReport): void {
	results = [report, ...results];
}

/**
 * Get all results (current session only)
 */
export function getResults(): BreachReport[] {
	return results;
}

/**
 * Get results for a specific project
 */
export function getProjectResults(projectId: string): BreachReport[] {
	return results.filter((r) => r.projectId === projectId);
}

/**
 * Get a specific result by ID
 */
export function getResult(reportId: string): BreachReport | undefined {
	return results.find((r) => r.id === reportId);
}

/**
 * Delete a result
 */
export function deleteResult(reportId: string): boolean {
	const index = results.findIndex((r) => r.id === reportId);
	if (index === -1) return false;
	results = [...results.slice(0, index), ...results.slice(index + 1)];
	return true;
}

/**
 * Clear all results
 */
export function clearResults(): void {
	results = [];
}

/**
 * Get latest result for a project
 */
export function getLatestResult(projectId: string): BreachReport | undefined {
	return results.find((r) => r.projectId === projectId);
}

// Export reactive getter
export const resultsStore = {
	get results() {
		return results;
	},
	get count() {
		return results.length;
	}
};
