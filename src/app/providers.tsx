/**
 * App Providers
 *
 * Wraps the application with all required context providers.
 * New providers should be added here during the feature-based
 * architecture migration.
 *
 * Currently a placeholder — the existing provider tree in main.tsx
 * remains authoritative until migration is complete.
 */

import React, { type ReactNode } from 'react';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from '@/store/index';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        {children}
      </PersistGate>
    </Provider>
  );
}

export default AppProviders;
