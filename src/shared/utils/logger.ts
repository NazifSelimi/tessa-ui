/**
 * Lightweight Observability Logger
 *
 * Centralised console-based logging with structured metadata.
 * No external services — just consistent, grep-friendly output.
 *
 * Each helper prefixes the message with a severity tag and timestamp
 * so logs are easy to filter in browser DevTools or CI output.
 */

type LogPayload = Record<string, unknown>;

function timestamp(): string {
  return new Date().toISOString();
}

/** Informational messages (non-critical flow events). */
export function logInfo(message: string, payload?: LogPayload): void {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.info(`[INFO  ${timestamp()}] ${message}`, payload ?? '');
  }
}

/** Warnings that don't break the flow but deserve attention. */
export function logWarn(message: string, payload?: LogPayload): void {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.warn(`[WARN  ${timestamp()}] ${message}`, payload ?? '');
  }
}

/** Errors — something went wrong and likely needs investigation. */
export function logError(message: string, payload?: LogPayload): void {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.error(`[ERROR ${timestamp()}] ${message}`, payload ?? '');
  }
}
