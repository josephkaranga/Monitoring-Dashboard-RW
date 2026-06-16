/**
 * Validation utilities for NBSAP Monitoring Dashboard
 * Handles date and year validation for reporting period 2020-2030
 */

/**
 * Reporting period configuration for NBSAP 2020-2030 monitoring
 * Includes baseline year 2020 through final target year 2030
 */
export const REPORTING_PERIOD = {
  START_YEAR: 2020,
  END_YEAR: 2030,
} as const;

/**
 * Minimum date for reporting period (January 1, 2020)
 */
export const MIN_DATE = new Date(REPORTING_PERIOD.START_YEAR, 0, 1);

/**
 * Maximum date for reporting period (December 31, 2030)
 */
export const MAX_DATE = new Date(REPORTING_PERIOD.END_YEAR, 11, 31);

/**
 * Validation result interface
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates that a year falls within the acceptable reporting period (2020-2030)
 * 
 * @param year - The year to validate
 * @returns ValidationResult with valid flag and optional error message
 * 
 * @example
 * validateYear(2025) // { valid: true }
 * validateYear(2031) // { valid: false, error: "Year must be between 2020 and 2030" }
 */
export function validateYear(year: number): ValidationResult {
  if (!Number.isInteger(year)) {
    return {
      valid: false,
      error: 'Year must be a valid integer',
    };
  }

  if (year < REPORTING_PERIOD.START_YEAR || year > REPORTING_PERIOD.END_YEAR) {
    return {
      valid: false,
      error: `Year must be between ${REPORTING_PERIOD.START_YEAR} and ${REPORTING_PERIOD.END_YEAR}`,
    };
  }

  return { valid: true };
}

/**
 * Validates that a date falls within the acceptable reporting period (2020-01-01 to 2030-12-31)
 * 
 * @param date - The date to validate (Date object or ISO string)
 * @returns ValidationResult with valid flag and optional error message
 * 
 * @example
 * validateDate(new Date('2025-06-15')) // { valid: true }
 * validateDate('2031-01-01') // { valid: false, error: "Date must be between 2020-01-01 and 2030-12-31" }
 */
export function validateDate(date: Date | string): ValidationResult {
  let dateObj: Date;

  // Convert string to Date if necessary
  if (typeof date === 'string') {
    dateObj = new Date(date);
  } else {
    dateObj = date;
  }

  // Check if date is valid
  if (isNaN(dateObj.getTime())) {
    return {
      valid: false,
      error: 'Invalid date format',
    };
  }

  // Check if date is within reporting period
  if (dateObj < MIN_DATE || dateObj > MAX_DATE) {
    return {
      valid: false,
      error: `Date must be between ${REPORTING_PERIOD.START_YEAR}-01-01 and ${REPORTING_PERIOD.END_YEAR}-12-31`,
    };
  }

  return { valid: true };
}

/**
 * Generates an array of years within the reporting period
 * Useful for populating year dropdown selectors
 * 
 * @returns Array of years from START_YEAR to END_YEAR (inclusive)
 * 
 * @example
 * getReportingYears() // [2020, 2021, 2022, ..., 2030]
 */
export function getReportingYears(): number[] {
  const years: number[] = [];
  for (let year = REPORTING_PERIOD.START_YEAR; year <= REPORTING_PERIOD.END_YEAR; year++) {
    years.push(year);
  }
  return years;
}

/**
 * Formats a date to ISO date string (YYYY-MM-DD)
 * 
 * @param date - The date to format
 * @returns ISO date string or empty string if invalid
 */
export function formatDateISO(date: Date | string): string {
  let dateObj: Date;

  if (typeof date === 'string') {
    dateObj = new Date(date);
  } else {
    dateObj = date;
  }

  if (isNaN(dateObj.getTime())) {
    return '';
  }

  return dateObj.toISOString().split('T')[0];
}
