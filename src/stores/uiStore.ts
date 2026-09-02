// src/stores/uiStore.ts
// Global UI state — generic flags shared across screens (modals, loading
// overlay, network status, keyboard). Keeps UI concerns out of feature stores.

import { create } from "zustand";

type ModalId =
  | "claim-ticket" // Order confirmation / claim code after booking
  | "order-detail" // Order detail bottom sheet
  | "address-picker" // Map / address selection sheet
  | null;

interface UIState {
  activeModal: ModalId;
  isGlobalLoading: boolean;
  isOffline: boolean;
  keyboardHeight: number;

  // Modal actions
  openModal: (id: NonNullable<ModalId>) => void;
  closeModal: () => void;

  // Network
  setOffline: (offline: boolean) => void;

  // Loading overlay (full-screen blocking operations)
  setGlobalLoading: (loading: boolean) => void;

  // Keyboard
  setKeyboardHeight: (height: number) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  activeModal: null,
  isGlobalLoading: false,
  isOffline: false,
  keyboardHeight: 0,

  openModal: (id) => set({ activeModal: id }),
  closeModal: () => set({ activeModal: null }),

  setOffline: (offline) => set({ isOffline: offline }),

  setGlobalLoading: (loading) => set({ isGlobalLoading: loading }),

  setKeyboardHeight: (height) => set({ keyboardHeight: height }),
}));
