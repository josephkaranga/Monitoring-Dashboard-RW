// ══════════════════════════════════════════════════════════════════════════════
// RBIS Filters Utility
// ══════════════════════════════════════════════════════════════════════════════
// Filter functions for searching and filtering RBIS indicators, targets, and goals
// ══════════════════════════════════════════════════════════════════════════════

import type {
  GBFGoal,
  GBFGoalFilter,
  IndicatorStatus,
  RBISLinkageStatus,
  SearchFilters,
} from '../types/rbis';

/**
 * Filter goals by search term
 * Searches across indicator titles, numbers, target titles, and descriptions
 * 
 * @param goals - Array of GBF goals to filter
 * @param searchTerm - Search term to match against
 * @returns Filtered goals with only matching targets and indicators
 */
export function filterBySearch(goals: GBFGoal[], searchTerm: string): GBFGoal[] {
  // Early return for empty search
  if (!searchTerm.trim()) {
    return goals;
  }

  const term = searchTerm.toLowerCase().trim();

  return goals
    .map((goal) => ({
      ...goal,
      targets: goal.targets
        .map((target) => ({
          ...target,
          indicators: target.indicators.filter(
            (indicator) =>
              indicator.title.toLowerCase().includes(term) ||
              indicator.number.toLowerCase().includes(term) ||
              indicator.definition.toLowerCase().includes(term) ||
              target.title.toLowerCase().includes(term) ||
              target.description.toLowerCase().includes(term)
          ),
        }))
        .filter((target) => target.indicators.length > 0),
    }))
    .filter((goal) => goal.targets.length > 0);
}

/**
 * Filter goals by GBF goal ID
 * 
 * @param goals - Array of GBF goals to filter
 * @param goalFilter - Goal ID to filter by ('all' returns all goals)
 * @returns Filtered goals matching the goal ID
 */
export function filterByGoal(goals: GBFGoal[], goalFilter: GBFGoalFilter): GBFGoal[] {
  // Early return for 'all' filter
  if (goalFilter === 'all') {
    return goals;
  }

  return goals.filter((goal) => goal.id === goalFilter);
}

/**
 * Filter indicators by status
 * 
 * @param goals - Array of GBF goals to filter
 * @param statusFilter - Status to filter by ('all' returns all statuses)
 * @returns Filtered goals with only matching indicators
 */
export function filterByStatus(
  goals: GBFGoal[],
  statusFilter: IndicatorStatus | 'all'
): GBFGoal[] {
  // Early return for 'all' filter
  if (statusFilter === 'all') {
    return goals;
  }

  return goals
    .map((goal) => ({
      ...goal,
      targets: goal.targets
        .map((target) => ({
          ...target,
          indicators: target.indicators.filter(
            (indicator) => indicator.status === statusFilter
          ),
        }))
        .filter((target) => target.indicators.length > 0),
    }))
    .filter((goal) => goal.targets.length > 0);
}

/**
 * Filter indicators by RBIS linkage status
 * 
 * @param goals - Array of GBF goals to filter
 * @param linkageFilter - Linkage status to filter by ('all' returns all statuses)
 * @returns Filtered goals with only matching indicators
 */
export function filterByLinkage(
  goals: GBFGoal[],
  linkageFilter: RBISLinkageStatus | 'all'
): GBFGoal[] {
  // Early return for 'all' filter
  if (linkageFilter === 'all') {
    return goals;
  }

  return goals
    .map((goal) => ({
      ...goal,
      targets: goal.targets
        .map((target) => ({
          ...target,
          indicators: target.indicators.filter(
            (indicator) => indicator.rbisLinkage.status === linkageFilter
          ),
        }))
        .filter((target) => target.indicators.length > 0),
    }))
    .filter((goal) => goal.targets.length > 0);
}

/**
 * Apply all filters to goals
 * Combines search, goal, status, and linkage filters
 * 
 * @param goals - Array of GBF goals to filter
 * @param filters - Filter criteria to apply
 * @returns Filtered goals matching all criteria
 */
export function applyFilters(goals: GBFGoal[], filters: SearchFilters): GBFGoal[] {
  let filtered = goals;

  // Apply goal filter first (most restrictive)
  if (filters.goalFilter && filters.goalFilter !== 'all') {
    filtered = filterByGoal(filtered, filters.goalFilter);
  }

  // Apply search filter
  if (filters.searchTerm && filters.searchTerm.trim()) {
    filtered = filterBySearch(filtered, filters.searchTerm);
  }

  // Apply status filter
  if (filters.statusFilter && filters.statusFilter !== 'all') {
    filtered = filterByStatus(filtered, filters.statusFilter);
  }

  // Apply linkage filter
  if (filters.linkageFilter && filters.linkageFilter !== 'all') {
    filtered = filterByLinkage(filtered, filters.linkageFilter);
  }

  return filtered;
}

/**
 * Filter goals (simplified version used by IndicatorsMatrix)
 * 
 * @param goals - Array of GBF goals to filter
 * @param filters - Filter criteria with searchTerm and goalFilter
 * @returns Filtered goals
 */
export function filterGoals(
  goals: GBFGoal[],
  filters: { searchTerm: string; goalFilter: GBFGoalFilter }
): GBFGoal[] {
  return applyFilters(goals, {
    searchTerm: filters.searchTerm,
    goalFilter: filters.goalFilter,
  });
}
