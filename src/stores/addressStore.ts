// src/stores/addressStore.ts
// Saved delivery addresses: list + CRUD wrappers over services/graphql/addresses,
// plus the currently-selected delivery address for the booking flow.

import { create } from "zustand";
import { userErrorMessage } from "../utils/userError";
import {
  myAddresses,
  createAddress,
  updateAddress,
  setDefaultAddress,
  deleteAddress,
  type CreateAddressInput,
  type UpdateCustomerAddressInput,
} from "../services/graphql/addresses";
import type { Address } from "../types/api";

interface AddressState {
  addresses: Address[];
  selectedAddressId: string | null;
  isLoading: boolean;
  error: string | null;

  load: () => Promise<void>;
  create: (input: CreateAddressInput) => Promise<Address | null>;
  update: (id: string, input: UpdateCustomerAddressInput) => Promise<Address | null>;
  makeDefault: (id: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  select: (id: string | null) => void;
  reset: () => void;
}

// Safe user-facing error mapping (RISK-H-032) - never raw server text.
function errMsg(err: unknown, fallback: string): string {
  return userErrorMessage(err, fallback);
}

// The address the booking flow should use: explicit selection wins, else the
// default, else the first available.
function deriveSelected(list: Address[], current: string | null): string | null {
  if (current && list.some((a) => a._id === current)) return current;
  return list.find((a) => a.isDefault)?._id ?? list[0]?._id ?? null;
}

export const useAddressStore = create<AddressState>()((set, get) => ({
  addresses: [],
  selectedAddressId: null,
  isLoading: false,
  error: null,

  load: async () => {
    set({ isLoading: true, error: null });
    try {
      const list = await myAddresses();
      set({
        addresses: list,
        selectedAddressId: deriveSelected(list, get().selectedAddressId),
        isLoading: false,
      });
    } catch (err) {
      set({ error: errMsg(err, "Could not load addresses."), isLoading: false });
    }
  },

  create: async (input) => {
    set({ error: null });
    try {
      const created = await createAddress(input);
      const list = [...get().addresses, created];
      set({ addresses: list, selectedAddressId: created._id });
      return created;
    } catch (err) {
      set({ error: errMsg(err, "Could not save address.") });
      return null;
    }
  },

  update: async (id, input) => {
    set({ error: null });
    try {
      const updated = await updateAddress(id, input);
      set({ addresses: get().addresses.map((a) => (a._id === id ? updated : a)) });
      return updated;
    } catch (err) {
      set({ error: errMsg(err, "Could not update address.") });
      return null;
    }
  },

  makeDefault: async (id) => {
    set({ error: null });
    try {
      await setDefaultAddress(id);
      // Reflect the single-default invariant locally, then refetch to be safe.
      set({
        addresses: get().addresses.map((a) => ({ ...a, isDefault: a._id === id })),
        selectedAddressId: id,
      });
    } catch (err) {
      set({ error: errMsg(err, "Could not set default address.") });
    }
  },

  remove: async (id) => {
    set({ error: null });
    try {
      await deleteAddress(id);
      const list = get().addresses.filter((a) => a._id !== id);
      set({ addresses: list, selectedAddressId: deriveSelected(list, get().selectedAddressId === id ? null : get().selectedAddressId) });
    } catch (err) {
      set({ error: errMsg(err, "Could not delete address.") });
    }
  },

  select: (id) => set({ selectedAddressId: id }),

  reset: () => set({ addresses: [], selectedAddressId: null, isLoading: false, error: null }),
}));
