/**
 * Error Handling Utilities for NBSAP Monitoring Dashboard
 * Provides centralized error management with consistent error types,
 * formatting, logging, and user-friendly message generation
 */

// ── ERROR TYPE DEFINITIONS ───────────────────────────────────

/**
 * Error codes for tracking and categorization
 */
export enum ErrorCode {
  // Authentication & Authorization
  AUTH_UNAUTHORIZED = 'AUTH_001',
  AUTH_INVALID_CREDENTIALS = 'AUTH_002',
  AUTH_SESSION_EXPIRED = 'AUTH_003',
  AUTH_ACCOUNT_DEACTIVATED = 'AUTH_004',
  AUTH_ACCOUNT_SUSPENDED = 'AUTH_005',
  AUTH_INSUFFICIENT_PERMISSIONS = 'AUTH_006',
  
  // Validation
  VALIDATION_INVALID_INPUT = 'VAL_001',
  VALIDATION_REQUIRED_FIELD = 'VAL_002',
  VALIDATION_INVALID_FORMAT = 'VAL_003',
  VALIDATION_OUT_OF_RANGE = 'VAL_004',
  VALIDATION_INVALID_DATE = 'VAL_005',
  VALIDATION_INVALID_YEAR = 'VAL_006',
  
  // Network & API
  NETWORK_CONNECTION_ERROR = 'NET_001',
  NETWORK_TIMEOUT = 'NET_002',
  NETWORK_SERVER_ERROR = 'NET_003',
  API_REQUEST_FAILED = 'API_001',
  API_RESPONSE_INVALID = 'API_002',
  API_RATE_LIMIT = 'API_003',
  
  // Database
  DB_QUERY_FAILED = 'DB_001',
  DB_RECORD_NOT_FOUND = 'DB_002',
  DB_DUPLICATE_ENTRY = 'DB_003',
  DB_CONSTRAINT_VIOLATION = 'DB_004',
  DB_CONNECTION_ERROR = 'DB_005',
  
  // File Operations
  FILE_NOT_FOUND = 'FILE_001',
  FILE_UPLOAD_FAILED = 'FILE_002',
  FILE_INVALID_TYPE = 'FILE_003',
  FILE_SIZE_EXCEEDED = 'FILE_004',
  FILE_DOWNLOAD_FAILED = 'FILE_005',
  
  // Business Logic
  BUSINESS_INVALID_OPERATION = 'BIZ_001',
  BUSINESS_WORKFLOW_ERROR = 'BIZ_002',
  BUSINESS_STATE_CONFLICT = 'BIZ_003',
  
  // Unknown/Generic
  UNKNOWN_ERROR = 'ERR_000',
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

/**
 * Base application error class
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly severity: ErrorSeverity;
  public readonly timestamp: Date;
  public readonly context?: Record<string, unknown>;
  public readonly userMessage: string;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.UNKNOWN_ERROR,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    userMessage?: string,
    context?: Record<string, unknown>,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.severity = severity;
    this.timestamp = new Date();
    this.context = context;
    this.userMessage = userMessage || this.getDefaultUserMessage();
    this.isOperational = isOperational;

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Get default user-friendly message based on error code
   */
  private getDefaultUserMessage(): string {
    return getUserFriendlyMessage(this.code, this.message);
  }

  /**
   * Convert error to JSON for logging
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      severity: this.severity,
      timestamp: this.timestamp.toISOString(),
      userMessage: this.userMessage,
      context: this.context,
      stack: this.stack,
    };
  }
}

/**
 * Validation error - for input validation failures
 */
export class ValidationError extends AppError {
  public readonly field?: string;
  public readonly value?: unknown;

  constructor(
    message: string,
    field?: string,
    value?: unknown,
    code: ErrorCode = ErrorCode.VALIDATION_INVALID_INPUT,
    context?: Record<string, unknown>
  ) {
    super(
      message,
      code,
      ErrorSeverity.LOW,
      undefined,
      { ...context, field, value },
      true
    );
    this.field = field;
    this.value = value;
  }
}

/**
 * Authentication error - for auth-related failures
 */
export class AuthenticationError extends AppError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.AUTH_UNAUTHORIZED,
    context?: Record<string, unknown>
  ) {
    super(
      message,
      code,
      ErrorSeverity.MEDIUM,
      undefined,
      context,
      true
    );
  }
}

/**
 * Network error - for network and connectivity issues
 */
export class NetworkError extends AppError {
  public readonly statusCode?: number;
  public readonly endpoint?: string;

  constructor(
    message: string,
    statusCode?: number,
    endpoint?: string,
    code: ErrorCode = ErrorCode.NETWORK_CONNECTION_ERROR,
    context?: Record<string, unknown>
  ) {
    super(
      message,
      code,
      ErrorSeverity.MEDIUM,
      undefined,
      { ...context, statusCode, endpoint },
      true
    );
    this.statusCode = statusCode;
    this.endpoint = endpoint;
  }
}

/**
 * Database error - for database operation failures
 */
export class DatabaseError extends AppError {
  public readonly query?: string;
  public readonly table?: string;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.DB_QUERY_FAILED,
    query?: string,
    table?: string,
    context?: Record<string, unknown>
  ) {
    super(
      message,
      code,
      ErrorSeverity.HIGH,
      undefined,
      { ...context, query, table },
      true
    );
    this.query = query;
    this.table = table;
  }
}

/**
 * File operation error - for file-related failures
 */
export class FileError extends AppError {
  public readonly fileName?: string;
  public readonly fileSize?: number;

  constructor(
    message: string,
    code: ErrorCode = ErrorCode.FILE_UPLOAD_FAILED,
    fileName?: string,
    fileSize?: number,
    context?: Record<string, unknown>
  ) {
    super(
      message,
      code,
      ErrorSeverity.MEDIUM,
      undefined,
      { ...context, fileName, fileSize },
      true
    );
    this.fileName = fileName;
    this.fileSize = fileSize;
  }
}

/**
 * Business logic error - for business rule violations
 */
export class BusinessError extends AppError {
  constructor(
    message: string,
    code: ErrorCode = ErrorCode.BUSINESS_INVALID_OPERATION,
    context?: Record<string, unknown>
  ) {
    super(
      message,
      code,
      ErrorSeverity.MEDIUM,
      undefined,
      context,
      true
    );
  }
}

// ── ERROR FORMATTING FUNCTIONS ───────────────────────────────

/**
 * Format error for display to users
 */
export function formatErrorForUser(error: unknown): string {
  if (error instanceof AppError) {
    return error.userMessage;
  }

  if (error instanceof Error) {
    return getUserFriendlyMessage(ErrorCode.UNKNOWN_ERROR, error.message);
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Format error for logging (detailed)
 */
export function formatErrorForLogging(error: unknown): string {
  if (error instanceof AppError) {
    return JSON.stringify(error.toJSON(), null, 2);
  }

  if (error instanceof Error) {
    return JSON.stringify({
      name: error.name,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    }, null, 2);
  }

  return JSON.stringify({
    error: String(error),
    timestamp: new Date().toISOString(),
  }, null, 2);
}

/**
 * Format error for API response
 */
export function formatErrorForAPI(error: unknown): {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
} {
  if (error instanceof AppError) {
    return {
      error: error.userMessage,
      code: error.code,
      details: error.context,
    };
  }

  if (error instanceof Error) {
    return {
      error: error.message,
      code: ErrorCode.UNKNOWN_ERROR,
    };
  }

  return {
    error: String(error),
    code: ErrorCode.UNKNOWN_ERROR,
  };
}

// ── USER-FRIENDLY ERROR MESSAGES ──────────────────────────────

/**
 * Get user-friendly error message based on error code
 */
export function getUserFriendlyMessage(code: ErrorCode, technicalMessage?: string): string {
  const messages: Record<ErrorCode, string> = {
    // Authentication & Authorization
    [ErrorCode.AUTH_UNAUTHORIZED]: 'You are not authorized to perform this action. Please log in.',
    [ErrorCode.AUTH_INVALID_CREDENTIALS]: 'Invalid email or password. Please try again.',
    [ErrorCode.AUTH_SESSION_EXPIRED]: 'Your session has expired. Please log in again.',
    [ErrorCode.AUTH_ACCOUNT_DEACTIVATED]: 'Your account has been deactivated. Please contact an administrator.',
    [ErrorCode.AUTH_ACCOUNT_SUSPENDED]: 'Your account is currently suspended. Please contact an administrator.',
    [ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS]: 'You do not have permission to perform this action.',
    
    // Validation
    [ErrorCode.VALIDATION_INVALID_INPUT]: 'Please check your input and try again.',
    [ErrorCode.VALIDATION_REQUIRED_FIELD]: 'Please fill in all required fields.',
    [ErrorCode.VALIDATION_INVALID_FORMAT]: 'The format of your input is invalid. Please check and try again.',
    [ErrorCode.VALIDATION_OUT_OF_RANGE]: 'The value you entered is out of the acceptable range.',
    [ErrorCode.VALIDATION_INVALID_DATE]: 'Please enter a valid date between 2020-01-01 and 2030-12-31.',
    [ErrorCode.VALIDATION_INVALID_YEAR]: 'Please enter a year between 2020 and 2030.',
    
    // Network & API
    [ErrorCode.NETWORK_CONNECTION_ERROR]: 'Unable to connect to the server. Please check your internet connection.',
    [ErrorCode.NETWORK_TIMEOUT]: 'The request took too long to complete. Please try again.',
    [ErrorCode.NETWORK_SERVER_ERROR]: 'The server encountered an error. Please try again later.',
    [ErrorCode.API_REQUEST_FAILED]: 'The request failed. Please try again.',
    [ErrorCode.API_RESPONSE_INVALID]: 'Received an invalid response from the server. Please try again.',
    [ErrorCode.API_RATE_LIMIT]: 'Too many requests. Please wait a moment and try again.',
    
    // Database
    [ErrorCode.DB_QUERY_FAILED]: 'A database error occurred. Please try again.',
    [ErrorCode.DB_RECORD_NOT_FOUND]: 'The requested record was not found.',
    [ErrorCode.DB_DUPLICATE_ENTRY]: 'This record already exists.',
    [ErrorCode.DB_CONSTRAINT_VIOLATION]: 'The operation violates data constraints. Please check your input.',
    [ErrorCode.DB_CONNECTION_ERROR]: 'Unable to connect to the database. Please try again later.',
    
    // File Operations
    [ErrorCode.FILE_NOT_FOUND]: 'The requested file was not found.',
    [ErrorCode.FILE_UPLOAD_FAILED]: 'File upload failed. Please try again.',
    [ErrorCode.FILE_INVALID_TYPE]: 'Invalid file type. Please upload a supported file format.',
    [ErrorCode.FILE_SIZE_EXCEEDED]: 'File size exceeds the maximum allowed limit.',
    [ErrorCode.FILE_DOWNLOAD_FAILED]: 'File download failed. Please try again.',
    
    // Business Logic
    [ErrorCode.BUSINESS_INVALID_OPERATION]: 'This operation is not allowed.',
    [ErrorCode.BUSINESS_WORKFLOW_ERROR]: 'Unable to complete the workflow. Please contact support.',
    [ErrorCode.BUSINESS_STATE_CONFLICT]: 'The current state does not allow this operation.',
    
    // Unknown/Generic
    [ErrorCode.UNKNOWN_ERROR]: technicalMessage || 'An unexpected error occurred. Please try again.',
  };

  return messages[code] || messages[ErrorCode.UNKNOWN_ERROR];
}

// ── ERROR LOGGING UTILITIES ───────────────────────────────────

/**
 * Log levels for error logging
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

/**
 * Logger configuration
 */
interface LoggerConfig {
  enableConsole: boolean;
  enableRemote: boolean;
  minLevel: LogLevel;
}

const defaultLoggerConfig: LoggerConfig = {
  enableConsole: true,
  enableRemote: false,
  minLevel: LogLevel.INFO,
};

let loggerConfig = { ...defaultLoggerConfig };

/**
 * Configure error logger
 */
export function configureLogger(config: Partial<LoggerConfig>): void {
  loggerConfig = { ...loggerConfig, ...config };
}

/**
 * Log error with appropriate level
 */
export function logError(
  error: unknown,
  level: LogLevel = LogLevel.ERROR,
  context?: Record<string, unknown>
): void {
  const logLevels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.FATAL];
  const minLevelIndex = logLevels.indexOf(loggerConfig.minLevel);
  const currentLevelIndex = logLevels.indexOf(level);

  // Skip if below minimum level
  if (currentLevelIndex < minLevelIndex) {
    return;
  }

  const logEntry = {
    level,
    timestamp: new Date().toISOString(),
    error: error instanceof AppError ? error.toJSON() : {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    },
    context,
  };

  // Console logging
  if (loggerConfig.enableConsole) {
    const consoleMethod = level === LogLevel.FATAL || level === LogLevel.ERROR ? 'error' :
                         level === LogLevel.WARN ? 'warn' :
                         level === LogLevel.INFO ? 'info' : 'log';
    
    console[consoleMethod]('[NBSAP Error]', logEntry);
  }

  // Remote logging (placeholder for future implementation)
  if (loggerConfig.enableRemote) {
    // TODO: Implement remote logging service integration
    // This could send errors to a service like Sentry, LogRocket, etc.
  }
}

/**
 * Log error and return formatted message for user
 */
export function logAndFormatError(error: unknown, context?: Record<string, unknown>): string {
  logError(error, LogLevel.ERROR, context);
  return formatErrorForUser(error);
}

// ── ERROR HANDLING HELPERS ────────────────────────────────────

/**
 * Wrap async function with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  errorHandler?: (error: unknown) => void
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      logError(error);
      if (errorHandler) {
        errorHandler(error);
      } else {
        throw error;
      }
    }
  }) as T;
}

/**
 * Check if error is operational (expected) or programming error
 */
export function isOperationalError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

/**
 * Parse Supabase error and convert to AppError
 */
export function parseSupabaseError(error: any): AppError {
  const message = error?.message || 'Database operation failed';
  const code = error?.code;

  // Map Supabase error codes to our error codes
  if (code === '23505') {
    return new DatabaseError(
      message,
      ErrorCode.DB_DUPLICATE_ENTRY,
      undefined,
      undefined,
      { supabaseCode: code }
    );
  }

  if (code === '23503') {
    return new DatabaseError(
      message,
      ErrorCode.DB_CONSTRAINT_VIOLATION,
      undefined,
      undefined,
      { supabaseCode: code }
    );
  }

  if (code === 'PGRST116') {
    return new DatabaseError(
      message,
      ErrorCode.DB_RECORD_NOT_FOUND,
      undefined,
      undefined,
      { supabaseCode: code }
    );
  }

  return new DatabaseError(
    message,
    ErrorCode.DB_QUERY_FAILED,
    undefined,
    undefined,
    { supabaseCode: code }
  );
}

/**
 * Parse network/fetch error and convert to AppError
 */
export function parseNetworkError(error: any, endpoint?: string): AppError {
  const message = error?.message || 'Network request failed';
  const statusCode = error?.status || error?.statusCode;

  if (statusCode === 401) {
    return new AuthenticationError(
      message,
      ErrorCode.AUTH_UNAUTHORIZED,
      { statusCode, endpoint }
    );
  }

  if (statusCode === 403) {
    return new AuthenticationError(
      message,
      ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS,
      { statusCode, endpoint }
    );
  }

  if (statusCode === 404) {
    return new NetworkError(
      message,
      statusCode,
      endpoint,
      ErrorCode.DB_RECORD_NOT_FOUND
    );
  }

  if (statusCode === 429) {
    return new NetworkError(
      message,
      statusCode,
      endpoint,
      ErrorCode.API_RATE_LIMIT
    );
  }

  if (statusCode >= 500) {
    return new NetworkError(
      message,
      statusCode,
      endpoint,
      ErrorCode.NETWORK_SERVER_ERROR
    );
  }

  if (error?.name === 'AbortError' || message.includes('timeout')) {
    return new NetworkError(
      message,
      statusCode,
      endpoint,
      ErrorCode.NETWORK_TIMEOUT
    );
  }

  return new NetworkError(
    message,
    statusCode,
    endpoint,
    ErrorCode.NETWORK_CONNECTION_ERROR
  );
}

/**
 * Create validation error from validation result
 */
export function createValidationError(
  field: string,
  message: string,
  value?: unknown
): ValidationError {
  return new ValidationError(
    message,
    field,
    value,
    ErrorCode.VALIDATION_INVALID_INPUT
  );
}

// ── EXPORTS ───────────────────────────────────────────────────

export default {
  // Error classes
  AppError,
  ValidationError,
  AuthenticationError,
  NetworkError,
  DatabaseError,
  FileError,
  BusinessError,
  
  // Error codes and severity
  ErrorCode,
  ErrorSeverity,
  
  // Formatting functions
  formatErrorForUser,
  formatErrorForLogging,
  formatErrorForAPI,
  getUserFriendlyMessage,
  
  // Logging utilities
  LogLevel,
  configureLogger,
  logError,
  logAndFormatError,
  
  // Helper functions
  withErrorHandling,
  isOperationalError,
  parseSupabaseError,
  parseNetworkError,
  createValidationError,
};
