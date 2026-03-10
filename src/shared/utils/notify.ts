/**
 * Shared Notification Utility
 *
 * Thin wrapper around Ant Design's notification API so that every
 * error notification across the app looks and behaves the same.
 */

import { notification } from 'antd';

/**
 * Display a standardised error notification.
 *
 * Uses AntD's static `notification.error` so it can be called from
 * non-React code (e.g. thunks, utility functions) as well as components.
 */
export function notifyError(message: string): void {
  notification.error({
    message: 'Error',
    description: message,
    placement: 'topRight',
    duration: 5,
  });
}
