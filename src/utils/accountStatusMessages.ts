/**
 * Account Status Messages for NBSAP Monitoring Dashboard
 * Provides centralized account status message management with consistent
 * formatting and user-friendly message generation for account status changes
 */

// ── TYPE DEFINITIONS ──────────────────────────────────────────

/**
 * Account status types
 */
export enum AccountStatus {
  ACTIVE = 'active',
  DEACTIVATED = 'deactivated',
  SUSPENDED = 'suspended',
  REACTIVATED = 'reactivated',
}

/**
 * Account status message types
 */
export enum AccountStatusMessageType {
  ACCOUNT_SUSPENDED = 'account_suspended',
  ACCOUNT_DEACTIVATED = 'account_deactivated',
  ACCOUNT_REACTIVATED = 'account_reactivated',
  SUSPENSION_EXPIRING_SOON = 'suspension_expiring_soon',
  AUTO_REACTIVATION = 'auto_reactivation',
  SUSPENSION_INDEFINITE = 'suspension_indefinite',
  SUSPENSION_TEMPORARY = 'suspension_temporary',
}

/**
 * Parameters for account suspended message
 */
export interface AccountSuspendedParams {
  reason: string;
  endDate?: Date;
  suspendedBy?: string;
  contactEmail?: string;
}

/**
 * Parameters for account deactivated message
 */
export interface AccountDeactivatedParams {
  reason?: string;
  deactivatedBy?: string;
  contactEmail?: string;
}

/**
 * Parameters for account reactivated message
 */
export interface AccountReactivatedParams {
  reactivatedBy?: string;
  previousStatus: 'suspended' | 'deactivated';
}

/**
 * Parameters for suspension expiring soon message
 */
export interface SuspensionExpiringSoonParams {
  endDate: Date;
  daysRemaining: number;
  reason?: string;
}

/**
 * Parameters for auto-reactivation message
 */
export interface AutoReactivationParams {
  suspensionEndDate: Date;
  originalReason?: string;
}

// ── MESSAGE GENERATION FUNCTIONS ──────────────────────────────

/**
 * Generate message for suspended account
 */
export function getAccountSuspendedMessage(params: AccountSuspendedParams): string {
  const { reason, endDate, suspendedBy, contactEmail } = params;

  let message = `Your account has been suspended. Reason: ${reason}.`;

  if (endDate) {
    const endDateStr = endDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    message += ` Your account will be automatically reactivated on ${endDateStr}.`;
  } else {
    message += ' This suspension is indefinite.';
  }

  if (suspendedBy) {
    message += ` Suspended by: ${suspendedBy}.`;
  }

  if (contactEmail) {
    message += ` If you have questions, please contact ${contactEmail}.`;
  } else {
    message += ' Please contact an administrator for more information.';
  }

  return message;
}

/**
 * Generate message for deactivated account
 */
export function getAccountDeactivatedMessage(params: AccountDeactivatedParams): string {
  const { reason, deactivatedBy, contactEmail } = params;

  let message = 'Your account has been deactivated and you no longer have access to the system.';

  if (reason) {
    message += ` Reason: ${reason}.`;
  }

  if (deactivatedBy) {
    message += ` Deactivated by: ${deactivatedBy}.`;
  }

  if (contactEmail) {
    message += ` To request reactivation or for more information, please contact ${contactEmail}.`;
  } else {
    message += ' Please contact an administrator to request reactivation.';
  }

  return message;
}

/**
 * Generate message for reactivated account
 */
export function getAccountReactivatedMessage(params: AccountReactivatedParams): string {
  const { reactivatedBy, previousStatus } = params;

  let message =
    'Good news! Your account has been reactivated and you now have full access to the system.';

  if (previousStatus === 'suspended') {
    message += ' Your suspension has been lifted.';
  } else if (previousStatus === 'deactivated') {
    message += ' Your account has been restored.';
  }

  if (reactivatedBy) {
    message += ` Reactivated by: ${reactivatedBy}.`;
  }

  message += ' You can now log in and resume your activities.';

  return message;
}

/**
 * Generate message for suspension expiring soon
 */
export function getSuspensionExpiringSoonMessage(params: SuspensionExpiringSoonParams): string {
  const { endDate, daysRemaining, reason } = params;

  const endDateStr = endDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let message = `Your account suspension will expire soon. `;

  if (daysRemaining === 1) {
    message += `Your account will be automatically reactivated tomorrow (${endDateStr}).`;
  } else if (daysRemaining === 0) {
    message += `Your account will be automatically reactivated today (${endDateStr}).`;
  } else {
    message += `Your account will be automatically reactivated in ${daysRemaining} days on ${endDateStr}.`;
  }

  if (reason) {
    message += ` Original suspension reason: ${reason}.`;
  }

  message += ' You will regain full access once the suspension period ends.';

  return message;
}

/**
 * Generate message for auto-reactivation after suspension period
 */
export function getAutoReactivationMessage(params: AutoReactivationParams): string {
  const { suspensionEndDate, originalReason } = params;

  const endDateStr = suspensionEndDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let message = `Your account has been automatically reactivated. Your suspension period ended on ${endDateStr}.`;

  if (originalReason) {
    message += ` Original suspension reason: ${originalReason}.`;
  }

  message += ' You now have full access to the system. Welcome back!';

  return message;
}

// ── NOTIFICATION TITLE GENERATION ─────────────────────────────

/**
 * Get notification title for account status change
 */
export function getAccountStatusNotificationTitle(type: AccountStatusMessageType): string {
  const titles: Record<AccountStatusMessageType, string> = {
    [AccountStatusMessageType.ACCOUNT_SUSPENDED]: 'Account Suspended',
    [AccountStatusMessageType.ACCOUNT_DEACTIVATED]: 'Account Deactivated',
    [AccountStatusMessageType.ACCOUNT_REACTIVATED]: 'Account Reactivated',
    [AccountStatusMessageType.SUSPENSION_EXPIRING_SOON]: 'Suspension Ending Soon',
    [AccountStatusMessageType.AUTO_REACTIVATION]: 'Account Reactivated',
    [AccountStatusMessageType.SUSPENSION_INDEFINITE]: 'Account Suspended Indefinitely',
    [AccountStatusMessageType.SUSPENSION_TEMPORARY]: 'Account Temporarily Suspended',
  };

  return titles[type];
}

// ── NOTIFICATION TYPE MAPPING ─────────────────────────────────

/**
 * Get notification type (for styling) based on account status message type
 */
export function getNotificationType(
  type: AccountStatusMessageType
): 'success' | 'warning' | 'error' | 'info' {
  const typeMap: Record<AccountStatusMessageType, 'success' | 'warning' | 'error' | 'info'> = {
    [AccountStatusMessageType.ACCOUNT_SUSPENDED]: 'error',
    [AccountStatusMessageType.ACCOUNT_DEACTIVATED]: 'error',
    [AccountStatusMessageType.ACCOUNT_REACTIVATED]: 'success',
    [AccountStatusMessageType.SUSPENSION_EXPIRING_SOON]: 'warning',
    [AccountStatusMessageType.AUTO_REACTIVATION]: 'success',
    [AccountStatusMessageType.SUSPENSION_INDEFINITE]: 'error',
    [AccountStatusMessageType.SUSPENSION_TEMPORARY]: 'warning',
  };

  return typeMap[type];
}

// ── HELPER FUNCTIONS ──────────────────────────────────────────

/**
 * Calculate days remaining until suspension end date
 */
export function calculateDaysRemaining(endDate: Date): number {
  const now = new Date();
  const diffTime = endDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

/**
 * Check if suspension has expired
 */
export function isSuspensionExpired(endDate: Date): boolean {
  return new Date() >= endDate;
}

/**
 * Check if suspension is expiring soon (within specified days)
 */
export function isSuspensionExpiringSoon(endDate: Date, thresholdDays: number = 3): boolean {
  const daysRemaining = calculateDaysRemaining(endDate);
  return daysRemaining > 0 && daysRemaining <= thresholdDays;
}

/**
 * Format account status for display
 */
export function formatAccountStatus(status: AccountStatus): string {
  const statusLabels: Record<AccountStatus, string> = {
    [AccountStatus.ACTIVE]: 'Active',
    [AccountStatus.DEACTIVATED]: 'Deactivated',
    [AccountStatus.SUSPENDED]: 'Suspended',
    [AccountStatus.REACTIVATED]: 'Reactivated',
  };

  return statusLabels[status];
}

/**
 * Get account status badge color
 */
export function getAccountStatusBadgeColor(status: AccountStatus): string {
  const colorMap: Record<AccountStatus, string> = {
    [AccountStatus.ACTIVE]: 'green',
    [AccountStatus.DEACTIVATED]: 'red',
    [AccountStatus.SUSPENDED]: 'orange',
    [AccountStatus.REACTIVATED]: 'blue',
  };

  return colorMap[status];
}

/**
 * Generate admin action message for audit log
 */
export function getAdminActionMessage(
  action: 'suspend' | 'deactivate' | 'reactivate',
  targetUserName: string,
  targetUserEmail: string,
  reason?: string
): string {
  let message = '';

  switch (action) {
    case 'suspend':
      message = `Suspended account for ${targetUserName} (${targetUserEmail}).`;
      break;
    case 'deactivate':
      message = `Deactivated account for ${targetUserName} (${targetUserEmail}).`;
      break;
    case 'reactivate':
      message = `Reactivated account for ${targetUserName} (${targetUserEmail}).`;
      break;
  }

  if (reason) {
    message += ` Reason: ${reason}`;
  }

  return message;
}

/**
 * Generate user notification message for account status change
 */
export function getUserNotificationMessage(
  type: AccountStatusMessageType,
  params:
    | AccountSuspendedParams
    | AccountDeactivatedParams
    | AccountReactivatedParams
    | SuspensionExpiringSoonParams
    | AutoReactivationParams
): string {
  switch (type) {
    case AccountStatusMessageType.ACCOUNT_SUSPENDED:
    case AccountStatusMessageType.SUSPENSION_INDEFINITE:
    case AccountStatusMessageType.SUSPENSION_TEMPORARY:
      return getAccountSuspendedMessage(params as AccountSuspendedParams);

    case AccountStatusMessageType.ACCOUNT_DEACTIVATED:
      return getAccountDeactivatedMessage(params as AccountDeactivatedParams);

    case AccountStatusMessageType.ACCOUNT_REACTIVATED:
      return getAccountReactivatedMessage(params as AccountReactivatedParams);

    case AccountStatusMessageType.SUSPENSION_EXPIRING_SOON:
      return getSuspensionExpiringSoonMessage(params as SuspensionExpiringSoonParams);

    case AccountStatusMessageType.AUTO_REACTIVATION:
      return getAutoReactivationMessage(params as AutoReactivationParams);

    default:
      return 'Your account status has been updated. Please contact an administrator for details.';
  }
}

// ── ACCOUNT STATUS MESSAGES CONSTANT ──────────────────────────

/**
 * Centralized account status messages for consistent messaging throughout the application
 * Includes account status messages and validation error messages
 */
export const ACCOUNT_STATUS_MESSAGES = {
  // Account status login error messages
  ACCOUNT_DEACTIVATED:
    'Your account has been deactivated. Please contact an administrator to request reactivation.',
  ACCOUNT_SUSPENDED:
    'Your account is currently suspended. Please contact an administrator for more information.',
  ACCOUNT_SUSPENDED_WITH_END_DATE: (endDate: string) =>
    `Your account is suspended until ${endDate}. Please contact an administrator if you have questions.`,

  // Account status change notifications
  DEACTIVATION_NOTIFICATION: (reason?: string) =>
    `Your account has been deactivated and you no longer have access to the system.${reason ? ` Reason: ${reason}` : ''} Please contact an administrator to request reactivation.`,

  SUSPENSION_NOTIFICATION: (reason: string, endDate?: string) =>
    `Your account has been suspended. Reason: ${reason}.${endDate ? ` Your account will be automatically reactivated on ${endDate}.` : ' This suspension is indefinite.'} Please contact an administrator if you have questions.`,

  REACTIVATION_NOTIFICATION:
    'Good news! Your account has been reactivated and you now have full access to the system. You can now log in and resume your activities.',

  // Year validation error messages (Requirements 7.10, 7.11)
  INVALID_YEAR: 'Please enter a valid year between 2020 and 2030.',
  YEAR_OUT_OF_RANGE: (year: number) =>
    `Year ${year} is outside the allowed reporting period. Please enter a year between 2020 and 2030.`,
  YEAR_REQUIRED: 'Year is required. Please select a year between 2020 and 2030.',

  // Date validation error messages (Requirements 7.10, 7.11)
  INVALID_DATE: 'Please enter a valid date between January 1, 2020 and December 31, 2030.',
  DATE_OUT_OF_RANGE: (date: string) =>
    `Date ${date} is outside the allowed reporting period. Please enter a date between January 1, 2020 and December 31, 2030.`,
  DATE_REQUIRED:
    'Date is required. Please enter a date between January 1, 2020 and December 31, 2030.',
  DATE_TOO_EARLY: 'Date cannot be earlier than January 1, 2020.',
  DATE_TOO_LATE: 'Date cannot be later than December 31, 2030.',

  // General validation messages
  FORM_VALIDATION_ERROR: 'Please correct the errors below before continuing.',
  SUBMISSION_ERROR:
    'An error occurred while submitting your request. Please try again or contact an administrator.',
  PERMISSION_DENIED: 'You do not have permission to perform this action.',

  // Admin action confirmation messages
  CONFIRM_DEACTIVATE: (userName: string) =>
    `Are you sure you want to deactivate the account for ${userName}? This will prevent them from logging in.`,

  CONFIRM_SUSPEND: (userName: string) =>
    `Are you sure you want to suspend the account for ${userName}? This will prevent them from accessing the system.`,

  CONFIRM_REACTIVATE: (userName: string) =>
    `Are you sure you want to reactivate the account for ${userName}? This will restore their access to the system.`,

  // Success messages for admin actions
  DEACTIVATION_SUCCESS: (userName: string) => `Successfully deactivated account for ${userName}.`,

  SUSPENSION_SUCCESS: (userName: string) => `Successfully suspended account for ${userName}.`,

  REACTIVATION_SUCCESS: (userName: string) => `Successfully reactivated account for ${userName}.`,
} as const;

// ── VALIDATION ERROR HELPER FUNCTIONS ────────────────────────

/**
 * Validate year is within reporting period (2020-2030)
 */
export function validateReportingYear(year: number): { isValid: boolean; message?: string } {
  if (!year) {
    return { isValid: false, message: ACCOUNT_STATUS_MESSAGES.YEAR_REQUIRED };
  }

  if (year < 2020 || year > 2030) {
    return { isValid: false, message: ACCOUNT_STATUS_MESSAGES.YEAR_OUT_OF_RANGE(year) };
  }

  return { isValid: true };
}

/**
 * Validate date is within reporting period (2020-01-01 to 2030-12-31)
 */
export function validateReportingDate(date: Date | string): { isValid: boolean; message?: string } {
  if (!date) {
    return { isValid: false, message: ACCOUNT_STATUS_MESSAGES.DATE_REQUIRED };
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return { isValid: false, message: ACCOUNT_STATUS_MESSAGES.INVALID_DATE };
  }

  const minDate = new Date('2020-01-01');
  const maxDate = new Date('2030-12-31');

  if (dateObj < minDate) {
    return { isValid: false, message: ACCOUNT_STATUS_MESSAGES.DATE_TOO_EARLY };
  }

  if (dateObj > maxDate) {
    return { isValid: false, message: ACCOUNT_STATUS_MESSAGES.DATE_TOO_LATE };
  }

  return { isValid: true };
}

/**
 * Get appropriate login error message based on account status
 */
export function getLoginErrorMessage(
  isActive: boolean,
  suspendedAt: string | null,
  suspensionEndDate: string | null
): string {
  if (!isActive) {
    return ACCOUNT_STATUS_MESSAGES.ACCOUNT_DEACTIVATED;
  }

  if (suspendedAt) {
    if (suspensionEndDate) {
      const endDate = new Date(suspensionEndDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
      return ACCOUNT_STATUS_MESSAGES.ACCOUNT_SUSPENDED_WITH_END_DATE(endDate);
    } else {
      return ACCOUNT_STATUS_MESSAGES.ACCOUNT_SUSPENDED;
    }
  }

  return 'Login failed. Please check your credentials and try again.';
}

// ── EXPORTS ───────────────────────────────────────────────────

export default {
  // Enums
  AccountStatus,
  AccountStatusMessageType,

  // Constants
  ACCOUNT_STATUS_MESSAGES,

  // Message generation functions
  getAccountSuspendedMessage,
  getAccountDeactivatedMessage,
  getAccountReactivatedMessage,
  getSuspensionExpiringSoonMessage,
  getAutoReactivationMessage,

  // Notification helpers
  getAccountStatusNotificationTitle,
  getNotificationType,
  getUserNotificationMessage,

  // Helper functions
  calculateDaysRemaining,
  isSuspensionExpired,
  isSuspensionExpiringSoon,
  formatAccountStatus,
  getAccountStatusBadgeColor,
  getAdminActionMessage,

  // Validation functions
  validateReportingYear,
  validateReportingDate,
  getLoginErrorMessage,
};
