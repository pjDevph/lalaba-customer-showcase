// src/types/api/geo.ts
// Geo / address shapes.
// Split out of the former monolithic src/types/api.ts (F2, 600-line limit).

import type {
  DateTimeString,
} from "../enums";

// ─── Geo / address shapes ─────────────────────────────────────────────────────
export interface MapLocation {
  latitude: number;
  longitude: number;
}

/** Snapshot address embedded on branches, orders, and saved addresses. */
export interface BranchAddress {
  unit: string | null;
  streetAddress: string;
  barangayName: string;
  cityMunicipalityName: string;
  provinceName: string;
  regionName: string;
  zipCode: string | null;
}

/** User home address (all fields optional PSGC parts). */
export interface HomeAddress {
  unit: string | null;
  streetAddress: string | null;
  barangayName: string | null;
  barangayCode: string | null;
  cityMunicipalityName: string | null;
  cityMunicipalityCode: string | null;
  provinceName: string | null;
  provinceCode: string | null;
  regionName: string | null;
  regionCode: string | null;
  zipCode: string | null;
}

/** A saved customer delivery address (Address in SDL). */
export interface Address {
  _id: string;
  uid: string;
  label: string | null;
  address: BranchAddress;
  mapLocation: MapLocation;
  accessInstructions: string | null;
  isDefault: boolean;
  isArchived: boolean;
  archivedAt: DateTimeString | null;
  createdAt: DateTimeString | null;
  updatedAt: DateTimeString | null;
}
