// src/types/api/identity.ts
// Identity — roles, profile, consent.
// Split out of the former monolithic src/types/api.ts (F2, 600-line limit).

import type {
  DateTimeString,
} from "../enums";
import type { HomeAddress } from "./geo";

// ─── Identity ─────────────────────────────────────────────────────────────────
export interface Role {
  _id: string;
  roleId: string;
  roleName: string;
  description: string;
}

/**
 * Mirrors the SDL `SignupRole` — the minimal, deliberately-public projection
 * returned by the `signupRoles` query for the sign-up flow. It intentionally
 * has NO `description`: the field does not exist on the type, so selecting it
 * is a validation error. The full `Role` above is admin-only territory.
 */
export interface SignupRole {
  _id: string;
  roleId: string;
  roleName: string;
}

/** Mirrors the SDL `UserType` returned by the `me` / registerUser ops. */
export interface UserProfile {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  homeAddress: HomeAddress;
  role: Role | null;
  branchIds: string[] | null;
  permissionIds: string[] | null;
  merchantId: string | null;
  isActive: boolean;
  isArchived: boolean | null;
  archivedAt: DateTimeString | null;
  createdAt: DateTimeString;
  updatedAt: DateTimeString;
}

export interface Consent {
  _id: string;
  uid: string;
  policyType: string;
  version: string;
  locale: string | null;
  source: string;
  createdAt: DateTimeString | null;
}
