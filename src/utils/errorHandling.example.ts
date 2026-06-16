/**
 * Example usage of error handling utilities
 * This file demonstrates how to use the centralized error handling system
 */

import {
  AppError,
  ValidationError,
  AuthenticationError,
  NetworkError,
  DatabaseError,
  ErrorCode,
  ErrorSeverity,
  formatErrorForUser,
  formatErrorForAPI,
  logError,
  logAndFormatError,
  parseSupabaseError,
  parseNetworkError,
  createValidationError,
  withErrorHandling,
  LogLevel,
} from './errorHandling';

// ── EXAMPLE 1: Creating and throwing custom errors ───────────

async function validateUserInput(email: string, year: number) {
  // Validate email
  if (!email.includes('@')) {
    throw new ValidationError(
      'Email must contain @ symbol',
      'email',
      email,
      ErrorCode.VALIDATION_INVALID_FORMAT
    );
  }

  // Validate year
  if (year < 2020 || year > 2030) {
    throw new ValidationError(
      `Year must be between 2020 and 2030`,
      'year',
      year,
      ErrorCode.VALIDATION_INVALID_YEAR
    );
  }
}

// ── EXAMPLE 2: Handling authentication errors ────────────────

async function checkUserPermissions(userId: string, action: string) {
  const hasPermission = false; // Simulated permission check

  if (!hasPermission) {
    throw new AuthenticationError(
      `User ${userId} does not have permission to ${action}`,
      ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS,
      { userId, action }
    );
  }
}

// ── EXAMPLE 3: Handling database errors ──────────────────────

async function fetchUserFromDatabase(userId: string) {
  try {
    // Simulated Supabase query
    const error = { message: 'Record not found', code: 'PGRST116' };
    
    if (error) {
      throw parseSupabaseError(error);
    }
  } catch (error) {
    // Log the error
    logError(error, LogLevel.ERROR, { userId });
    
    // Re-throw or handle
    throw error;
  }
}

// ── EXAMPLE 4: Handling network errors ────────────────────────

async function makeAPIRequest(endpoint: string) {
  try {
    const response = await fetch(endpoint);
    
    if (!response.ok) {
      throw parseNetworkError(
        { message: response.statusText, status: response.status },
        endpoint
      );
    }
    
    return await response.json();
  } catch (error) {
    // Log and format error for user
    const userMessage = logAndFormatError(error, { endpoint });
    console.error('User will see:', userMessage);
    throw error;
  }
}

// ── EXAMPLE 5: Using error wrapper for async functions ───────

const safeAPICall = withErrorHandling(
  async (url: string) => {
    const response = await fetch(url);
    return response.json();
  },
  (error) => {
    console.error('API call failed:', formatErrorForUser(error));
  }
);

// ── EXAMPLE 6: Formatting errors for different contexts ──────

function handleError(error: unknown) {
  // For displaying to users
  const userMessage = formatErrorForUser(error);
  console.log('Show to user:', userMessage);

  // For API responses
  const apiResponse = formatErrorForAPI(error);
  console.log('Send in API:', apiResponse);

  // For logging
  logError(error, LogLevel.ERROR);
}

// ── EXAMPLE 7: Creating business logic errors ────────────────

async function submitReport(reportData: any) {
  // Check if report period is valid
  const currentYear = new Date().getFullYear();
  if (reportData.year > currentYear) {
    throw new AppError(
      'Cannot submit reports for future years',
      ErrorCode.BUSINESS_INVALID_OPERATION,
      ErrorSeverity.MEDIUM,
      'You cannot submit a report for a year that has not yet occurred.',
      { reportYear: reportData.year, currentYear }
    );
  }

  // Check if report already exists
  const reportExists = true; // Simulated check
  if (reportExists) {
    throw new DatabaseError(
      'A report for this period already exists',
      ErrorCode.DB_DUPLICATE_ENTRY,
      undefined,
      'toolkit_reports',
      { reportData }
    );
  }
}

// ── EXAMPLE 8: Comprehensive error handling in a service ─────

async function userService_updateProfile(userId: string, updates: any) {
  try {
    // Validate input
    if (!updates.email?.includes('@')) {
      throw createValidationError(
        'email',
        'Invalid email format',
        updates.email
      );
    }

    // Check permissions
    await checkUserPermissions(userId, 'update_profile');

    // Make database update
    // const result = await supabase.from('profiles').update(updates)...
    
    return { success: true };
  } catch (error) {
    // Log the error with context
    logError(error, LogLevel.ERROR, { userId, updates });

    // Format for API response
    const apiError = formatErrorForAPI(error);
    
    // Return error response
    return {
      success: false,
      error: apiError.error,
      code: apiError.code,
    };
  }
}

// ── EXAMPLE 9: Using error codes for specific handling ───────

function handleSpecificErrors(error: unknown) {
  if (error instanceof AppError) {
    switch (error.code) {
      case ErrorCode.AUTH_UNAUTHORIZED:
        // Redirect to login
        console.log('Redirecting to login...');
        break;
      
      case ErrorCode.AUTH_ACCOUNT_SUSPENDED:
        // Show suspension notice
        console.log('Account suspended:', error.userMessage);
        break;
      
      case ErrorCode.VALIDATION_INVALID_YEAR:
        // Highlight year field
        console.log('Invalid year entered');
        break;
      
      case ErrorCode.NETWORK_TIMEOUT:
        // Offer retry
        console.log('Request timed out, retry?');
        break;
      
      default:
        // Generic error handling
        console.log('Error:', error.userMessage);
    }
  }
}

// ── EXAMPLE 10: Error handling in React components ───────────

/*
// In a React component:

import { formatErrorForUser, logError, LogLevel } from '@/utils/errorHandling';

function MyComponent() {
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: any) => {
    try {
      setError(null);
      await submitReport(data);
    } catch (err) {
      // Log the error
      logError(err, LogLevel.ERROR, { component: 'MyComponent', action: 'submit' });
      
      // Show user-friendly message
      setError(formatErrorForUser(err));
    }
  };

  return (
    <div>
      {error && <div className="error-message">{error}</div>}
      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
}
*/

// ── EXAMPLE 11: Integrating with existing authService ────────

/*
// Update existing authService.ts functions to use error handling:

import { parseSupabaseError, logError, LogLevel } from './utils/errorHandling';

export async function signIn(credentials: LoginCredentials) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email.trim().toLowerCase(),
      password: credentials.password,
    });

    if (error) {
      const appError = parseSupabaseError(error);
      logError(appError, LogLevel.WARN, { email: credentials.email });
      return { data: null, error: appError.userMessage };
    }

    // ... rest of the function
  } catch (error) {
    logError(error, LogLevel.ERROR, { function: 'signIn' });
    return { data: null, error: formatErrorForUser(error) };
  }
}
*/

export {
  validateUserInput,
  checkUserPermissions,
  fetchUserFromDatabase,
  makeAPIRequest,
  safeAPICall,
  handleError,
  submitReport,
  userService_updateProfile,
  handleSpecificErrors,
};
