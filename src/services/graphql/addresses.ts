// src/services/graphql/addresses.ts
// GraphQL operations for the customer's saved delivery addresses.

import { graphqlRequest } from "../../config/graphql";
import type { Address } from "../../types/api";

// ─── Fragments ────────────────────────────────────────────────────────────────
const ADDRESS_FIELDS = `
  _id
  uid
  label
  address {
    unit streetAddress barangayName cityMunicipalityName
    provinceName regionName zipCode
  }
  mapLocation { latitude longitude }
  accessInstructions
  isDefault
  isArchived
  archivedAt
  createdAt
  updatedAt
`;

// ─── Shared input shapes (mirror CustomerAddressInput / CustomerMapLocationInput) ─
export interface CustomerAddressInput {
  unit?: string;
  streetAddress: string;
  barangayName: string;
  cityMunicipalityName: string;
  provinceName: string;
  regionName: string;
  zipCode?: string;
}

export interface CustomerMapLocationInput {
  latitude: number;
  longitude: number;
}

// ─── myAddresses ──────────────────────────────────────────────────────────────
export async function myAddresses(): Promise<Address[]> {
  const data = await graphqlRequest<{ myAddresses: Address[] }>(
    `query MyAddresses { myAddresses { ${ADDRESS_FIELDS} } }`,
  );
  return data.myAddresses;
}

// ─── createAddress ────────────────────────────────────────────────────────────
export interface CreateAddressInput {
  label?: string;
  address: CustomerAddressInput;
  mapLocation: CustomerMapLocationInput;
  accessInstructions?: string;
  isDefault?: boolean;
}

export async function createAddress(input: CreateAddressInput): Promise<Address> {
  const data = await graphqlRequest<{ createAddress: Address }>(
    `mutation CreateAddress($input: CreateAddressInput!) {
       createAddress(input: $input) { ${ADDRESS_FIELDS} }
     }`,
    { input },
  );
  return data.createAddress;
}

// ─── updateAddress ────────────────────────────────────────────────────────────
export interface UpdateCustomerAddressInput {
  label?: string;
  address?: CustomerAddressInput;
  mapLocation?: CustomerMapLocationInput;
  accessInstructions?: string;
  isDefault?: boolean;
}

export async function updateAddress(
  id: string,
  input: UpdateCustomerAddressInput,
): Promise<Address> {
  const data = await graphqlRequest<{ updateAddress: Address }>(
    `mutation UpdateAddress($id: ID!, $input: UpdateCustomerAddressInput!) {
       updateAddress(id: $id, input: $input) { ${ADDRESS_FIELDS} }
     }`,
    { id, input },
  );
  return data.updateAddress;
}

// ─── setDefaultAddress ────────────────────────────────────────────────────────
export async function setDefaultAddress(id: string): Promise<Address> {
  const data = await graphqlRequest<{ setDefaultAddress: Address }>(
    `mutation SetDefaultAddress($id: ID!) {
       setDefaultAddress(id: $id) { ${ADDRESS_FIELDS} }
     }`,
    { id },
  );
  return data.setDefaultAddress;
}

// ─── deleteAddress ────────────────────────────────────────────────────────────
export async function deleteAddress(id: string): Promise<boolean> {
  const data = await graphqlRequest<{ deleteAddress: boolean }>(
    `mutation DeleteAddress($id: ID!) { deleteAddress(id: $id) }`,
    { id },
  );
  return data.deleteAddress;
}
