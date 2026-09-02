// src/stores/favoritesStore.ts
// Favorite providers: list + optimistic toggle over services/graphql/favorites.

import { create } from "zustand";
import { userErrorMessage } from "../utils/userError";
import {
  myFavorites,
  addFavorite,
  removeFavorite,
} from "../services/graphql/favorites";
import type { ProviderCard, ProviderType } from "../types/api";

interface FavoritesState {
  favorites: ProviderCard[];
  isLoading: boolean;
  error: string | null;

  load: () => Promise<void>;
  isFavorite: (branchId: string) => boolean;
  toggle: (branchId: string, providerType: ProviderType) => Promise<void>;
  reset: () => void;
}

export const useFavoritesStore = create<FavoritesState>()((set, get) => ({
  favorites: [],
  isLoading: false,
  error: null,

  load: async () => {
    set({ isLoading: true, error: null });
    try {
      set({ favorites: await myFavorites(), isLoading: false });
    } catch (err) {
      set({
        error: userErrorMessage(err, "Could not load favorites."),
        isLoading: false,
      });
    }
  },

  isFavorite: (branchId) => get().favorites.some((f) => f.branchId === branchId),

  toggle: async (branchId, providerType) => {
    const wasFavorite = get().isFavorite(branchId);
    set({ error: null });
    try {
      if (wasFavorite) {
        // Optimistic removal.
        const prev = get().favorites;
        set({ favorites: prev.filter((f) => f.branchId !== branchId) });
        await removeFavorite(branchId);
      } else {
        await addFavorite(branchId, providerType);
        // The card isn't known here — refetch to pick up the new favorite.
        await get().load();
      }
    } catch (err) {
      set({ error: userErrorMessage(err, "Could not update favorites.") });
      // Re-sync on failure so optimistic state can't drift.
      await get().load();
    }
  },

  reset: () => set({ favorites: [], isLoading: false, error: null }),
}));
