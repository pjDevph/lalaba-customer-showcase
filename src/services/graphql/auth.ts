// src/services/graphql/auth.ts
// GraphQL operations for the users / auth domain (customer app).
//
// Auth is Firebase-token based (see src/config/graphql.ts): the Firebase ID
// token is attached automatically to every non-anonymous request.
//   register: Firebase createUser… → registerUser(profile)
//   login:    Firebase signIn…      → me
// `signupRoles` is the only public op (anonymous: true — no token yet at sign-up).
// It replaced `listRoles`, which is now admin-only on the backend: an anonymous
// caller could previously dump the entire role catalogue.

import { graphqlRequest } from "../../config/graphql";
import type { SignupRole, UserProfile, Consent } from "../../types/api";

// ─── Reusable fragment strings ────────────────────────────────────────────────
const HOME_ADDRESS_FIELDS = `
  unit
  streetAddress
  barangayName
  barangayCode
  cityMunicipalityName
  cityMunicipalityCode
  provinceName
  provinceCode
  regionName
  regionCode
  zipCode
`;

const ROLE_FIELDS = `_id roleId roleName description`;

const USER_FIELDS = `
  _id
  email
  firstName
  lastName
  phoneNumber
  homeAddress { ${HOME_ADDRESS_FIELDS} }
  role { ${ROLE_FIELDS} }
  branchIds
  permissionIds
  merchantId
  isActive
  isArchived
  archivedAt
  createdAt
  updatedAt
`;

// ─── signupRoles (public) ─────────────────────────────────────────────────────
// The only deliberately-public role query. Returns just the self-registerable
// roles (customer / merchant / washer). `SignupRole` has NO `description` field
// — requesting one is a schema validation error, so keep the selection exactly
// as `SIGNUP_ROLE_FIELDS`. The `_id` values match the full Role documents, so
// `roles.find(r => r.roleId === "customer")._id` still resolves correctly.
const SIGNUP_ROLE_FIELDS = `_id roleId roleName`;

export async function signupRoles(): Promise<SignupRole[]> {
  const data = await graphqlRequest<{ signupRoles: SignupRole[] }>(
    `query SignupRoles { signupRoles { ${SIGNUP_ROLE_FIELDS} } }`,
    {},
    { anonymous: true },
  );
  return data.signupRoles;
}

// ─── registerUser ─────────────────────────────────────────────────────────────
// The BE derives uid + email from the Firebase token — do NOT send them.
// `role` is the Role Mongo _id (from signupRoles), not the roleId slug.
export interface GqlConsentInput {
  policyType: string;
  version: string;
  locale?: string;
}

export interface GqlRegisterAddressInput {
  unit?: string;
  streetAddress?: string;
  barangayName?: string;
  barangayCode?: string;
  cityMunicipalityName?: string;
  cityMunicipalityCode?: string;
  provinceName?: string;
  provinceCode?: string;
  regionName?: string;
  regionCode?: string;
  zipCode?: string;
}

export interface RegisterUserInput {
  role: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  consents: GqlConsentInput[];
  homeAddress?: GqlRegisterAddressInput;
  isActive?: boolean;
  registeredDevices?: string[];
}

export async function registerUser(input: RegisterUserInput): Promise<UserProfile> {
  const data = await graphqlRequest<{ registerUser: UserProfile }>(
    `mutation RegisterUser($input: RegisterUserInput!) {
       registerUser(input: $input) { ${USER_FIELDS} }
     }`,
    { input },
  );
  return data.registerUser;
}

// ─── me ───────────────────────────────────────────────────────────────────────
// Returns null when the Firebase user has no backend profile yet (→ the auth
// store routes to registration). graphqlRequest throws ApiError on hard errors.
export async function fetchMe(): Promise<UserProfile | null> {
  const data = await graphqlRequest<{ me: UserProfile | null }>(
    `query Me { me { ${USER_FIELDS} } }`,
  );
  return data.me;
}

// ─── updateUser ───────────────────────────────────────────────────────────────
export interface UpdateAddressInput {
  unit?: string;
  streetAddress?: string;
  barangayName?: string;
  barangayCode?: string;
  cityMunicipalityName?: string;
  cityMunicipalityCode?: string;
  provinceName?: string;
  provinceCode?: string;
  regionName?: string;
  regionCode?: string;
  zipCode?: string;
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  homeAddress?: UpdateAddressInput;
}

export async function updateUser(input: UpdateUserInput): Promise<UserProfile> {
  const data = await graphqlRequest<{ updateUser: UserProfile }>(
    `mutation UpdateUser($input: UpdateUserInput!) {
       updateUser(input: $input) { ${USER_FIELDS} }
     }`,
    { input },
  );
  return data.updateUser;
}

// ─── myConsents ───────────────────────────────────────────────────────────────
export async function myConsents(): Promise<Consent[]> {
  const data = await graphqlRequest<{ myConsents: Consent[] }>(
    `query MyConsents {
       myConsents { _id uid policyType version locale source createdAt }
     }`,
  );
  return data.myConsents;
}
