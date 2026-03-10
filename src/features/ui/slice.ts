/**
 * UI Slice — features/ui/slice.ts
 *
 * Manages global UI state including:
 * - Mobile menu visibility
 * - Global loading states
 * - Toast/notification queue
 * - Modal states
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
}

interface UIState {
  mobileMenuOpen: boolean;
  globalLoading: boolean;
  globalLoadingMessage: string | null;
  toasts: ToastMessage[];
  activeModal: string | null;
  modalData: Record<string, unknown> | null;
  sidebarCollapsed: boolean;
}

const initialState: UIState = {
  mobileMenuOpen: false,
  globalLoading: false,
  globalLoadingMessage: null,
  toasts: [],
  activeModal: null,
  modalData: null,
  sidebarCollapsed: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleMobileMenu: (state) => {
      state.mobileMenuOpen = !state.mobileMenuOpen;
    },

    openMobileMenu: (state) => {
      state.mobileMenuOpen = true;
    },

    closeMobileMenu: (state) => {
      state.mobileMenuOpen = false;
    },

    setGlobalLoading: (
      state,
      action: PayloadAction<{ loading: boolean; message?: string }>
    ) => {
      state.globalLoading = action.payload.loading;
      state.globalLoadingMessage = action.payload.message || null;
    },

    addToast: (state, action: PayloadAction<Omit<ToastMessage, 'id'>>) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      state.toasts.push({
        ...action.payload,
        id,
      });
    },

    removeToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter((toast) => toast.id !== action.payload);
    },

    clearToasts: (state) => {
      state.toasts = [];
    },

    openModal: (
      state,
      action: PayloadAction<{ modal: string; data?: Record<string, unknown> }>
    ) => {
      state.activeModal = action.payload.modal;
      state.modalData = action.payload.data || null;
    },

    closeModal: (state) => {
      state.activeModal = null;
      state.modalData = null;
    },

    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },

    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
    },
  },
});

// Export actions
export const {
  toggleMobileMenu,
  openMobileMenu,
  closeMobileMenu,
  setGlobalLoading,
  addToast,
  removeToast,
  clearToasts,
  openModal,
  closeModal,
  toggleSidebar,
  setSidebarCollapsed,
} = uiSlice.actions;

// Selectors
export const selectMobileMenuOpen = (state: { ui: UIState }) => state.ui.mobileMenuOpen;
export const selectGlobalLoading = (state: { ui: UIState }) => state.ui.globalLoading;
export const selectGlobalLoadingMessage = (state: { ui: UIState }) => state.ui.globalLoadingMessage;
export const selectToasts = (state: { ui: UIState }) => state.ui.toasts;
export const selectActiveModal = (state: { ui: UIState }) => state.ui.activeModal;
export const selectModalData = (state: { ui: UIState }) => state.ui.modalData;
export const selectSidebarCollapsed = (state: { ui: UIState }) => state.ui.sidebarCollapsed;

export default uiSlice.reducer;
