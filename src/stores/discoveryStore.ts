// src/stores/discoveryStore.ts
// Provider discovery: search filters + results. Screens set filters then call
// search(); coordinates come from the location layer (expo-location).

import { create } from "zustand";
import { userErrorMessage } from "../utils/userError";
import {
  discoverProviders,
  type DiscoverProvidersInput,
} from "../services/graphql/discovery";
import type {
  ProviderCard,
  ProviderTypeFilter,
  ProviderSort,
} from "../types/api";

export interface DiscoveryFilters {
  providerType: ProviderTypeFilter;
  category: string | null;
  search: string;
  sort: ProviderSort;
  latitude: number | null;
  longitude: number | null;
  radiusKm: number;
  minRating: number | null;
  openNow: boolean;
}

const DEFAULT_FILTERS: DiscoveryFilters = {
  providerType: "ALL",
  category: null,
  search: "",
  sort: "NEAREST",
  latitude: null,
  longitude: null,
  radiusKm: 15,
  minRating: null,
  openNow: false,
};

// Default distance is the "no distance filter" sentinel (wide radius). The
// Filters sheet narrows it via presets.
export const DEFAULT_RADIUS_KM = 15;

interface DiscoveryState {
  filters: DiscoveryFilters;
  results: ProviderCard[];
  isLoading: boolean;
  error: string | null;

  setFilter: <K extends keyof DiscoveryFilters>(key: K, value: DiscoveryFilters[K]) => void;
  setCoords: (latitude: number, longitude: number) => void;
  search: () => Promise<void>;
  reset: () => void;
}

export const useDiscoveryStore = create<DiscoveryState>()((set, get) => ({
  filters: { ...DEFAULT_FILTERS },
  results: [],
  isLoading: false,
  error: null,

  setFilter: (key, value) => set({ filters: { ...get().filters, [key]: value } }),

  setCoords: (latitude, longitude) =>
    set({ filters: { ...get().filters, latitude, longitude } }),

  search: async () => {
    const f = get().filters;
    set({ isLoading: true, error: null });
    try {
      const input: DiscoverProvidersInput = {
        providerType: f.providerType,
        sort: f.sort,
        radiusKm: f.radiusKm,
      };
      if (f.category) input.category = f.category;
      if (f.search.trim()) input.search = f.search.trim();
      if (f.latitude != null) input.latitude = f.latitude;
      if (f.longitude != null) input.longitude = f.longitude;
      if (f.minRating != null) input.minRating = f.minRating;
      if (f.openNow) input.openNow = true;

      const results = await discoverProviders(input);
      set({ results, isLoading: false });
    } catch (err) {
      set({
        error: userErrorMessage(err, "Could not load providers."),
        isLoading: false,
      });
    }
  },

  reset: () => set({ filters: { ...DEFAULT_FILTERS }, results: [], isLoading: false, error: null }),
}));
