// src/stores/dialogStore.ts
// Global confirm-dialog state, usable outside React — what this app uses
// instead of the platform's native alert dialog.
// Render <ConfirmDialog /> once at the root; trigger with confirm({...}).

import { create } from "zustand";

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
}

interface DialogState {
  dialog: ConfirmOptions | null;
  confirm: (options: ConfirmOptions) => void;
  close: () => void;
}

export const useDialogStore = create<DialogState>()((set) => ({
  dialog: null,
  confirm: (options) => set({ dialog: options }),
  close: () => set({ dialog: null }),
}));

/** Imperative helper for use outside React components. */
export function confirm(options: ConfirmOptions): void {
  useDialogStore.getState().confirm(options);
}
