/**
 * Shared Error Extraction Utility
 *
 * Extracts a human-readable error message from any error shape
 * encountered in the application:
 *   - RTK Query FetchBaseQueryError (numeric & string statuses)
 *   - AxiosError
 *   - Laravel API { success: false, message, errors? } shape
 *   - Plain Error / string
 *   - Fallback generic message
 */

import type { FetchBaseQueryError } from '@reduxjs/toolkit/query';

/** Shape returned by the Laravel backend on error responses. */
interface ApiErrorBody {
  success?: boolean;
  message?: string;
  errors?: Record<string, string[]>;
}

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  return (
    typeof value === 'object' &&
    value !== null &&
    'message' in value &&
    typeof (value as ApiErrorBody).message === 'string'
  );
}

/**
 * Extract a user-facing error message from an unknown error value.
 *
 * Handles:
 *   1. RTK Query `FetchBaseQueryError` (status number → body, string status → .error)
 *   2. AxiosError (`isAxiosError` flag, response.data)
 *   3. Plain `Error` instances
 *   4. Raw strings
 *   5. Fallback generic message
 */
export function extractErrorMessage(error: unknown): string {
  // 1. RTK Query FetchBaseQueryError
  //    - Numeric status with data body
  //    - String status (FETCH_ERROR, PARSING_ERROR, TIMEOUT_ERROR, CUSTOM_ERROR)
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const rtkError = error as FetchBaseQueryError;

    // Numeric HTTP status → data is the response body from the server
    if (typeof rtkError.status === 'number') {
      const body = (rtkError as { status: number; data: unknown }).data;

      if (isApiErrorBody(body)) {
        // Laravel validation errors (422): join the first message per field
        if (body.errors) {
          const messages = Object.values(body.errors).flat();
          if (messages.length) return messages.join('. ');
        }
        if (body.message) return body.message;
      }

      if (typeof body === 'string' && body.length > 0) return body;

      return `Request failed (${rtkError.status})`;
    }

    // String status (FETCH_ERROR, PARSING_ERROR, etc.)
    if ('error' in rtkError) {
      const stringErr = (rtkError as { error: string }).error;
      if (typeof stringErr === 'string' && stringErr.length > 0) return stringErr;
    }
  }

  // ------------------------------------------------------------------
  // 2. AxiosError
  // ------------------------------------------------------------------
  if (
    typeof error === 'object' &&
    error !== null &&
    'isAxiosError' in error
  ) {
    const axiosErr = error as { response?: { data?: unknown }; message?: string };
    if (axiosErr.response?.data && isApiErrorBody(axiosErr.response.data)) {
      const body = axiosErr.response.data;
      if (body.errors) {
        const messages = Object.values(body.errors).flat();
        if (messages.length) return messages.join('. ');
      }
      if (body.message) return body.message;
    }
    if (typeof axiosErr.message === 'string') return axiosErr.message;
  }

  // ------------------------------------------------------------------
  // 3. Plain Error
  // ------------------------------------------------------------------
  if (error instanceof Error) return error.message;

  // ------------------------------------------------------------------
  // 4. Raw string
  // ------------------------------------------------------------------
  if (typeof error === 'string' && error.length > 0) return error;

  // ------------------------------------------------------------------
  // 5. Fallback
  // ------------------------------------------------------------------
  return 'An unexpected error occurred. Please try again.';
}
