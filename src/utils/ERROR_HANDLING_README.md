# Error Handling Utilities

Centralized error handling system for the NBSAP Monitoring Dashboard.

## Overview

The error handling utilities provide a consistent approach to managing errors across the application, including:

- **Type-safe error classes** for different error categories
- **Error codes** for tracking and categorization
- **User-friendly messages** for displaying errors to users
- **Logging utilities** for debugging and monitoring
- **Error parsing** for Supabase and network errors
- **TypeScript support** for type safety

## Quick Start

```typescript
import {
  ValidationError,
  ErrorCode,
  formatErrorForUser,
  logError,
  LogLevel,
} from '@/utils/errorHandling';

// Create and throw an error
throw new ValidationError(
  'Year must be between 2020 and 2030',
  'year',
  2031,
  ErrorCode.VALIDATION_INVALID_YEAR
);

// Handle and display error
try {
  await someOperation();
} catch (error) {
  logError(error, LogLevel.ERROR);
  const message = formatErrorForUser(error);
  showToast(message); // Display to user
}
```

## Error Classes

### AppError (Base Class)

Base class for all application errors.

```typescript
const error = new AppError(
  'Technical error message',
  ErrorCode.UNKNOWN_ERROR,
  ErrorSeverity.MEDIUM,
  'User-friendly message',
  { contextData: 'value' }
);
```

**Properties:**

- `message`: Technical error message
- `code`: Error code for tracking
- `severity`: Error severity level
- `userMessage`: User-friendly message
- `context`: Additional context data
- `timestamp`: When the error occurred
- `isOperational`: Whether error is expected (true) or programming error (false)

### ValidationError

For input validation failures.

```typescript
throw new ValidationError(
  'Invalid email format',
  'email',
  'invalid-email',
  ErrorCode.VALIDATION_INVALID_FORMAT
);
```

**Additional Properties:**

- `field`: Field name that failed validation
- `value`: Invalid value

### AuthenticationError

For authentication and authorization failures.

```typescript
throw new AuthenticationError('User not authorized', ErrorCode.AUTH_UNAUTHORIZED, {
  userId: '123',
});
```

### NetworkError

For network and API request failures.

```typescript
throw new NetworkError('Request failed', 500, '/api/users', ErrorCode.NETWORK_SERVER_ERROR);
```

**Additional Properties:**

- `statusCode`: HTTP status code
- `endpoint`: API endpoint

### DatabaseError

For database operation failures.

```typescript
throw new DatabaseError('Query failed', ErrorCode.DB_QUERY_FAILED, 'SELECT * FROM users', 'users');
```

**Additional Properties:**

- `query`: SQL query (optional)
- `table`: Table name (optional)

### FileError

For file operation failures.

```typescript
throw new FileError('Upload failed', ErrorCode.FILE_UPLOAD_FAILED, 'document.pdf', 1024000);
```

**Additional Properties:**

- `fileName`: Name of the file
- `fileSize`: Size in bytes

### BusinessError

For business logic violations.

```typescript
throw new BusinessError('Cannot submit future reports', ErrorCode.BUSINESS_INVALID_OPERATION, {
  year: 2031,
});
```

## Error Codes

Error codes are organized by category:

### Authentication & Authorization

- `AUTH_UNAUTHORIZED` - User not authenticated
- `AUTH_INVALID_CREDENTIALS` - Invalid login credentials
- `AUTH_SESSION_EXPIRED` - Session has expired
- `AUTH_ACCOUNT_DEACTIVATED` - Account deactivated
- `AUTH_ACCOUNT_SUSPENDED` - Account suspended
- `AUTH_INSUFFICIENT_PERMISSIONS` - Insufficient permissions

### Validation

- `VALIDATION_INVALID_INPUT` - Invalid input
- `VALIDATION_REQUIRED_FIELD` - Required field missing
- `VALIDATION_INVALID_FORMAT` - Invalid format
- `VALIDATION_OUT_OF_RANGE` - Value out of range
- `VALIDATION_INVALID_DATE` - Invalid date
- `VALIDATION_INVALID_YEAR` - Invalid year

### Network & API

- `NETWORK_CONNECTION_ERROR` - Connection failed
- `NETWORK_TIMEOUT` - Request timeout
- `NETWORK_SERVER_ERROR` - Server error
- `API_REQUEST_FAILED` - API request failed
- `API_RESPONSE_INVALID` - Invalid API response
- `API_RATE_LIMIT` - Rate limit exceeded

### Database

- `DB_QUERY_FAILED` - Query failed
- `DB_RECORD_NOT_FOUND` - Record not found
- `DB_DUPLICATE_ENTRY` - Duplicate entry
- `DB_CONSTRAINT_VIOLATION` - Constraint violation
- `DB_CONNECTION_ERROR` - Connection error

### File Operations

- `FILE_NOT_FOUND` - File not found
- `FILE_UPLOAD_FAILED` - Upload failed
- `FILE_INVALID_TYPE` - Invalid file type
- `FILE_SIZE_EXCEEDED` - File too large
- `FILE_DOWNLOAD_FAILED` - Download failed

### Business Logic

- `BUSINESS_INVALID_OPERATION` - Invalid operation
- `BUSINESS_WORKFLOW_ERROR` - Workflow error
- `BUSINESS_STATE_CONFLICT` - State conflict

## Formatting Functions

### formatErrorForUser()

Format error for display to users.

```typescript
const userMessage = formatErrorForUser(error);
// Returns: "You are not authorized to perform this action. Please log in."
```

### formatErrorForAPI()

Format error for API responses.

```typescript
const apiResponse = formatErrorForAPI(error);
// Returns: { error: "...", code: "AUTH_001", details: {...} }
```

### formatErrorForLogging()

Format error for detailed logging.

```typescript
const logMessage = formatErrorForLogging(error);
// Returns: JSON string with full error details
```

## Logging Utilities

### logError()

Log error with specified level.

```typescript
logError(error, LogLevel.ERROR, { userId: '123', action: 'submit' });
```

**Log Levels:**

- `DEBUG` - Debug information
- `INFO` - Informational messages
- `WARN` - Warning messages
- `ERROR` - Error messages
- `FATAL` - Fatal errors

### logAndFormatError()

Log error and return user-friendly message.

```typescript
const message = logAndFormatError(error, { context: 'data' });
// Logs error and returns formatted message
```

### configureLogger()

Configure logging behavior.

```typescript
configureLogger({
  enableConsole: true,
  enableRemote: false,
  minLevel: LogLevel.INFO,
});
```

## Error Parsing

### parseSupabaseError()

Parse Supabase errors into AppError instances.

```typescript
try {
  const { data, error } = await supabase.from('users').select();
  if (error) throw parseSupabaseError(error);
} catch (error) {
  // error is now an AppError with appropriate code
}
```

**Mapped Codes:**

- `23505` → `DB_DUPLICATE_ENTRY`
- `23503` → `DB_CONSTRAINT_VIOLATION`
- `PGRST116` → `DB_RECORD_NOT_FOUND`

### parseNetworkError()

Parse network/fetch errors into AppError instances.

```typescript
try {
  const response = await fetch('/api/users');
  if (!response.ok) {
    throw parseNetworkError(
      { message: response.statusText, status: response.status },
      '/api/users'
    );
  }
} catch (error) {
  // error is now an AppError with appropriate code
}
```

**Mapped Status Codes:**

- `401` → `AUTH_UNAUTHORIZED`
- `403` → `AUTH_INSUFFICIENT_PERMISSIONS`
- `404` → `DB_RECORD_NOT_FOUND`
- `429` → `API_RATE_LIMIT`
- `500+` → `NETWORK_SERVER_ERROR`

## Helper Functions

### createValidationError()

Create a validation error quickly.

```typescript
const error = createValidationError('email', 'Invalid format', 'test@');
```

### isOperationalError()

Check if error is operational (expected) or programming error.

```typescript
if (isOperationalError(error)) {
  // Handle gracefully
} else {
  // Log and alert developers
}
```

### withErrorHandling()

Wrap async function with error handling.

```typescript
const safeFunction = withErrorHandling(
  async (id: string) => {
    return await fetchData(id);
  },
  error => {
    console.error('Failed:', formatErrorForUser(error));
  }
);
```

## Usage Patterns

### In Services

```typescript
export async function updateProfile(userId: string, updates: any) {
  try {
    // Validate
    if (!updates.email?.includes('@')) {
      throw createValidationError('email', 'Invalid email', updates.email);
    }

    // Database operation
    const { data, error } = await supabase.from('profiles').update(updates).eq('id', userId);

    if (error) throw parseSupabaseError(error);

    return { data, error: null };
  } catch (error) {
    logError(error, LogLevel.ERROR, { userId });
    return { data: null, error: formatErrorForUser(error) };
  }
}
```

### In React Components

```typescript
function MyComponent() {
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: any) => {
    try {
      setError(null);
      await submitData(data);
    } catch (err) {
      logError(err, LogLevel.ERROR, { component: 'MyComponent' });
      setError(formatErrorForUser(err));
    }
  };

  return (
    <div>
      {error && <Alert variant="error">{error}</Alert>}
      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
}
```

### Error-Specific Handling

```typescript
try {
  await performOperation();
} catch (error) {
  if (error instanceof AppError) {
    switch (error.code) {
      case ErrorCode.AUTH_UNAUTHORIZED:
        redirectToLogin();
        break;
      case ErrorCode.VALIDATION_INVALID_YEAR:
        highlightYearField();
        break;
      default:
        showErrorToast(error.userMessage);
    }
  }
}
```

## Best Practices

1. **Use specific error classes** - Use ValidationError, AuthenticationError, etc. instead of generic AppError
2. **Include context** - Add relevant context data to help with debugging
3. **Log errors** - Always log errors with appropriate level
4. **User-friendly messages** - Use formatErrorForUser() for displaying to users
5. **Parse external errors** - Use parseSupabaseError() and parseNetworkError() for external errors
6. **Error codes** - Use error codes for programmatic error handling
7. **Operational vs Programming** - Mark programming errors as non-operational
8. **Don't swallow errors** - Always handle or re-throw errors

## Integration with Existing Code

The error handling utilities are designed to integrate seamlessly with existing code:

```typescript
// Before
export async function signIn(credentials: LoginCredentials) {
  const { data, error } = await supabase.auth.signInWithPassword({...});
  if (error) return { data: null, error: error.message };
  // ...
}

// After
import { parseSupabaseError, logError, LogLevel } from './utils/errorHandling';

export async function signIn(credentials: LoginCredentials) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({...});
    if (error) {
      const appError = parseSupabaseError(error);
      logError(appError, LogLevel.WARN);
      return { data: null, error: appError.userMessage };
    }
    // ...
  } catch (error) {
    logError(error, LogLevel.ERROR, { function: 'signIn' });
    return { data: null, error: formatErrorForUser(error) };
  }
}
```

## Error Severity Levels

- **LOW** - Minor issues, user can continue (validation errors)
- **MEDIUM** - Moderate issues, operation failed but system stable (auth errors, network errors)
- **HIGH** - Serious issues, may affect system stability (database errors)
- **CRITICAL** - Critical issues, system may be unstable (programming errors)

## Future Enhancements

The error handling system is designed to be extensible:

1. **Remote Logging** - Integration with services like Sentry, LogRocket
2. **Error Analytics** - Track error patterns and frequencies
3. **User Notifications** - Automatic user notifications for certain errors
4. **Error Recovery** - Automatic retry mechanisms for transient errors
5. **Error Reporting** - User-friendly error reporting interface

## See Also

- `errorHandling.example.ts` - Comprehensive usage examples
- `validation.ts` - Validation utilities that work with error handling
- `authService.ts` - Example of error handling in authentication service
