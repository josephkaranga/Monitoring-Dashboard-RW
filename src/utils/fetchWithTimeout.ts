// ══════════════════════════════════════════════════════════════════════════════
// Fetch with Timeout Utility
// ══════════════════════════════════════════════════════════════════════════════
// Utility function for making HTTP requests with timeout handling
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch with timeout
 * Makes an HTTP request with a configurable timeout
 *
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param timeout - Timeout in milliseconds (default: 30000 = 30 seconds)
 * @returns Promise resolving to Response
 * @throws Error if request times out or fails
 *
 * @example
 * ```typescript
 * try {
 *   const response = await fetchWithTimeout('https://api.example.com/data', {}, 10000);
 *   const data = await response.json();
 * } catch (error) {
 *   if (error.message.includes('timeout')) {
 *     console.error('Request timed out');
 *   }
 * }
 * ```
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout = 30000
): Promise<Response> {
  // Create an AbortController for timeout
  const controller = new AbortController();
  const { signal } = controller;

  // Set up timeout
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeout);

  try {
    // Make the fetch request with abort signal
    const response = await fetch(url, {
      ...options,
      signal,
    });

    // Clear timeout on success
    clearTimeout(timeoutId);

    return response;
  } catch (error) {
    // Clear timeout on error
    clearTimeout(timeoutId);

    // Check if error is due to abort (timeout)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout: ${url} exceeded ${timeout}ms`);
    }

    // Re-throw other errors
    throw error;
  }
}

/**
 * Fetch JSON with timeout
 * Convenience function for fetching JSON data with timeout
 *
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param timeout - Timeout in milliseconds (default: 30000 = 30 seconds)
 * @returns Promise resolving to parsed JSON data
 * @throws Error if request times out, fails, or response is not JSON
 *
 * @example
 * ```typescript
 * try {
 *   const data = await fetchJSONWithTimeout<MyDataType>('https://api.example.com/data');
 *   console.log(data);
 * } catch (error) {
 *   console.error('Failed to fetch data:', error);
 * }
 * ```
 */
export async function fetchJSONWithTimeout<T = any>(
  url: string,
  options: RequestInit = {},
  timeout = 30000
): Promise<T> {
  const response = await fetchWithTimeout(url, options, timeout);

  if (!response.ok) {
    throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
  }

  try {
    const data = await response.json();
    return data as T;
  } catch (error) {
    throw new Error(`Failed to parse JSON response from ${url}`);
  }
}

/**
 * Retry configuration for exponential backoff
 */
export interface RetryConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay in milliseconds (default: 1000) */
  initialDelay?: number;
  /** Maximum delay in milliseconds (default: 10000) */
  maxDelay?: number;
  /** Backoff multiplier (default: 2) */
  backoffMultiplier?: number;
  /** Timeout per request in milliseconds (default: 30000) */
  timeout?: number;
}

/**
 * Fetch with retry and exponential backoff
 * Automatically retries failed requests with increasing delays
 *
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param config - Retry configuration
 * @returns Promise resolving to Response
 * @throws Error if all retry attempts fail
 *
 * @example
 * ```typescript
 * try {
 *   const response = await fetchWithRetry('https://api.example.com/data', {}, {
 *     maxRetries: 3,
 *     initialDelay: 1000,
 *     timeout: 10000,
 *   });
 *   const data = await response.json();
 * } catch (error) {
 *   console.error('All retry attempts failed:', error);
 * }
 * ```
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  config: RetryConfig = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    timeout = 30000,
  } = config;

  let lastError: Error | null = null;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Attempt fetch with timeout
      const response = await fetchWithTimeout(url, options, timeout);

      // Return successful response
      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Log retry attempt
      console.warn(
        `Fetch attempt ${attempt + 1}/${maxRetries + 1} failed for ${url}. Retrying in ${delay}ms...`,
        lastError.message
      );

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));

      // Increase delay with exponential backoff
      delay = Math.min(delay * backoffMultiplier, maxDelay);
    }
  }

  // All retries failed
  throw new Error(
    `Failed to fetch ${url} after ${maxRetries + 1} attempts: ${lastError?.message || 'Unknown error'}`
  );
}

/**
 * Fetch JSON with retry and exponential backoff
 * Convenience function for fetching JSON data with retry logic
 *
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param config - Retry configuration
 * @returns Promise resolving to parsed JSON data
 * @throws Error if all retry attempts fail
 *
 * @example
 * ```typescript
 * try {
 *   const data = await fetchJSONWithRetry<MyDataType>('https://api.example.com/data', {}, {
 *     maxRetries: 3,
 *     initialDelay: 1000,
 *   });
 *   console.log(data);
 * } catch (error) {
 *   console.error('All retry attempts failed:', error);
 * }
 * ```
 */
export async function fetchJSONWithRetry<T = any>(
  url: string,
  options: RequestInit = {},
  config: RetryConfig = {}
): Promise<T> {
  const response = await fetchWithRetry(url, options, config);

  if (!response.ok) {
    throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
  }

  try {
    const data = await response.json();
    return data as T;
  } catch (error) {
    throw new Error(`Failed to parse JSON response from ${url}`);
  }
}
